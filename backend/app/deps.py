# backend/app/deps.py
import os, ssl
from typing import Optional
from dotenv import load_dotenv, find_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
import redis.asyncio as aioredis

load_dotenv(find_dotenv())

# DB URL 우선순위: DATABASE_URL -> NEON_URL -> sqlite fallback
DB_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("NEON_URL")
    or "sqlite+aiosqlite:///./dev.db"
)

is_sqlite = DB_URL.startswith("sqlite")
connect_args = {}
if not is_sqlite and DB_URL.startswith("postgresql+asyncpg"):
    # asyncpg는 sslmode 대신 ssl 컨텍스트 필요
    ssl_ctx = ssl.create_default_context()
    connect_args = {"ssl": ssl_ctx}

engine: AsyncEngine = create_async_engine(
    DB_URL,
    pool_size=None if is_sqlite else 5,
    max_overflow=None if is_sqlite else 10,
    connect_args=connect_args,
)

REDIS_URL = os.getenv("REDIS_URL")

# 전역 객체를 노출하지 않고, 필요할 때 가져오는 방식(선택적)
async_redis: Optional[aioredis.Redis] = (
    aioredis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None
)

def get_redis() -> Optional[aioredis.Redis]:
    return async_redis
