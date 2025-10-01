# backend/app/main.py
from fastapi import FastAPI
from sqlmodel import SQLModel
from app.core.deps import engine, get_redis
from app.api.users import routes as user_routes

from app.db import db

app = FastAPI(title="CineReco")

# 라우터 등록
app.include_router(user_routes.router, prefix="/api/users", tags=["users"])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "api alive"}


# --- 애플리케이션 시작 시 ---
@app.on_event("startup")
async def on_startup():
    # SQLModel (기존 코드 유지)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception:
        pass

    # Prisma 연결
    try:
        await db.connect()
        app.state.prisma_ok = True
    except Exception:
        app.state.prisma_ok = False

    # Redis 핑 체크
    rds = get_redis()
    if rds:
        try:
            await rds.ping()
            app.state.redis_ok = True
        except Exception:
            app.state.redis_ok = False


# --- 애플리케이션 종료 시 ---
@app.on_event("shutdown")
async def on_shutdown():
    try:
        await db.disconnect()
    except Exception:
        pass
