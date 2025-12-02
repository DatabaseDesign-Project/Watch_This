# backend/app/deps.py
import os
import ssl
import re
from typing import Optional

from dotenv import load_dotenv, find_dotenv
from fastapi import Header, HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
import redis.asyncio as aioredis

# .env 로드
load_dotenv(find_dotenv())


def _to_asyncpg_url(url: str) -> str:
    """
    Prisma/일반용 postgres(ql):// URL을 SQLAlchemy 비동기 드라이버용
    postgresql+asyncpg:// 형태로 변환한다.
    이미 asyncpg 스킴이면 그대로 반환한다.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    return re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", url)


# --- DB URL 결정 로직 ---
# 1) SQLALCHEMY_DATABASE_URL 우선 사용
# 2) 없으면 DATABASE_URL(또는 NEON_URL)을 asyncpg로 변환
# 3) 그래도 없으면 SQLite 폴백
raw_sqlalchemy = os.getenv("SQLALCHEMY_DATABASE_URL")
raw_prisma = os.getenv("DATABASE_URL") or os.getenv("NEON_URL")

if raw_sqlalchemy:
    DB_URL = raw_sqlalchemy
elif raw_prisma:
    DB_URL = _to_asyncpg_url(raw_prisma)
else:
    DB_URL = "sqlite+aiosqlite:///./dev.db"

is_sqlite = DB_URL.startswith("sqlite")

# --- Postgres SSL 설정 ---
connect_args = {}
if not is_sqlite and DB_URL.startswith("postgresql+asyncpg://"):
    ssl_ctx = ssl.create_default_context()
    # 필요 시 더 엄격히:
    # ssl_ctx.check_hostname = True
    # ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    connect_args = {"ssl": ssl_ctx}

# --- 엔진 생성 ---
# SQLite일 땐 풀 파라미터를 전달하지 않는 편이 안전함.
engine_kwargs: dict = {
    "echo": False,
    "future": True,
    "connect_args": connect_args,
}
if not is_sqlite:
    # Connection pool 설정 (min=max로 고정 크기 풀)
    engine_kwargs.update({
        "pool_size": 10,  # 최소 및 기본 커넥션 수
        "max_overflow": 0,  # overflow 없음 (고정 크기)
        "pool_pre_ping": True,  # 연결 재사용 전 health check
        "pool_recycle": 3600,  # 1시간마다 커넥션 재생성
    })

engine: AsyncEngine = create_async_engine(DB_URL, **engine_kwargs)

# --- Redis ---
REDIS_URL = os.getenv("REDIS_URL")
try:
    async_redis: Optional[aioredis.Redis] = (
        aioredis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None
    )
except Exception:
    async_redis = None


def get_redis() -> Optional[aioredis.Redis]:
    """
    구성되어 있으면 Redis 클라이언트를 반환한다.
    (연결 확인은 startup 훅에서 ping으로 수행)
    """
    return async_redis


# --- 개발 단계용 인증 의존성 ---
async def get_current_user_id(
    x_user_id: int | None = Header(default=None, alias="X-User-Id")
) -> int:
    """
    헤더 X-User-Id 로 사용자 식별자를 받아 반환한다.
    운영 단계에선 세션/토큰 기반으로 교체해도 라우터 코드는 그대로 재사용 가능.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return x_user_id
