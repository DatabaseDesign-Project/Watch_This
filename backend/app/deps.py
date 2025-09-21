# backend/app/deps.py
import os
import ssl
import re
from typing import Optional

from dotenv import load_dotenv, find_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlmodel import SQLModel
import redis.asyncio as aioredis

load_dotenv(find_dotenv())


def _to_asyncpg_url(url: str) -> str:
    """
    Prisma용 postgresql:// 또는 postgres:// URL을
    SQLAlchemy 비동기 드라이버용 postgresql+asyncpg:// 형태로 변환.
    이미 asyncpg 접두사면 그대로 반환.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    # ^postgres:// 또는 ^postgresql:// 를 postgresql+asyncpg:// 로 치환
    return re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", url)


# --- DB URL 결정 로직 ---
# 1) SQLALCHEMY_DATABASE_URL가 있으면 그대로 사용(가장 명시적)
# 2) 없으면 DATABASE_URL(Prisma용)을 asyncpg로 자동 변환
# 3) 없으면 NEON_URL을 asyncpg로 자동 변환
# 4) 그래도 없으면 SQLite 폴백
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
# asyncpg는 sslmode 파라미터 유무와 관계없이 ssl 컨텍스트를 직접 받을 수 있음.
connect_args = {}
if not is_sqlite and DB_URL.startswith("postgresql+asyncpg://"):
    ssl_ctx = ssl.create_default_context()
    # 필요 시 더 엄격히: ssl_ctx.check_hostname = True; ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    connect_args = {"ssl": ssl_ctx}

# --- 엔진 생성 ---
engine: AsyncEngine = create_async_engine(
    DB_URL,
    echo=False,
    future=True,
    # SQLite는 풀 매개변수 무의미하므로 None 처리
    pool_size=None if is_sqlite else 5,
    max_overflow=None if is_sqlite else 10,
    connect_args=connect_args,
)

# --- Redis ---
REDIS_URL = os.getenv("REDIS_URL")
async_redis: Optional[aioredis.Redis] = (
    aioredis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None
)

def get_redis() -> Optional[aioredis.Redis]:
    return async_redis
