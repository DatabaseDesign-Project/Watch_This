# backend/app/main.py
from fastapi import FastAPI
from sqlmodel import SQLModel
from .deps import engine, get_redis
from .routers import movies

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
    # DB 생성은 실패해도 서버는 뜨게
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception:
        # 로그만 남기는 편 권장 (print 또는 logger)
        pass

    rds = get_redis()
    if rds:
        try:
            await rds.ping()
            app.state.redis_ok = True
        except Exception:
            app.state.redis_ok = False
