# backend/app/main.py
from fastapi import FastAPI
from sqlmodel import SQLModel
from .deps import engine, get_redis
from .routers import movies

# === Prisma 추가 ===
from prisma import Prisma
db = Prisma(auto_register=True)  # prisma client (async)

app = FastAPI(title="CineReco")
app.include_router(movies.router, prefix="/movies", tags=["movies"])

@app.get("/health")
def health():
    # DB/Redis 상태를 굳이 체크하지 않고 200을 주면 헬스가 안정적
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "api alive"}

@app.on_event("startup")
async def on_startup():
    # --- 기존 SQLModel 테이블 생성 ---
    # Postgres로 완전 전환하고 Prisma 마이그레이션을 쓰기 시작하면
    # 아래 create_all은 제거하는 걸 권장.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception:
        # 로그만 남기는 편 권장 (print 또는 logger)
        pass

    # --- Prisma DB 연결 ---
    try:
        await db.connect()
        app.state.prisma_ok = True
    except Exception:
        app.state.prisma_ok = False

    # --- Redis 핑 ---
    rds = get_redis()
    if rds:
        try:
            await rds.ping()
            app.state.redis_ok = True
        except Exception:
            app.state.redis_ok = False

@app.on_event("shutdown")
async def on_shutdown():
    # Prisma 연결 종료
    try:
        await db.disconnect()
    except Exception:
        pass
