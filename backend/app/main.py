from fastapi import FastAPI
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy import text
from pathlib import Path

from app.core.deps import engine, get_redis
from app.api.users import routes as user_routes
from app.routers import movies
from app.api.v1 import posts as posts_v1
from app.api.v1 import users as users_v1
from app.api.v1 import emojis as emojis_v1
from app.api.v1 import medias as medias_v1
from app.api.v1 import questions as questions_v1
from app.api.v1 import comments as comments_v1
from app.api.v1 import likes as likes_v1
from app.api.v1 import notifications as notifications_v1
from app.api.v1 import friends as friends_v1

from app.db import db

app = FastAPI(title="Watch This")

# 라우터 등록
app.include_router(user_routes.router, prefix="/api/users", tags=["users"])
app.include_router(movies.router, prefix="/api/movies", tags=["movies"])
app.include_router(posts_v1.router, prefix="/api/v1/posts", tags=["posts"])
app.include_router(users_v1.router, prefix="/api/v1/users", tags=["users_v1"])
app.include_router(emojis_v1.router, prefix="/api/v1/emojis", tags=["emojis"])
app.include_router(medias_v1.router, prefix="/api/v1/medias", tags=["medias"])
app.include_router(questions_v1.router, prefix="/api/v1/questions", tags=["questions"])
app.include_router(comments_v1.router, prefix="/api/v1", tags=["comments"])
app.include_router(likes_v1.router, prefix="/api/v1", tags=["likes"])
app.include_router(notifications_v1.router, prefix="/api/v1", tags=["notifications"])
app.include_router(friends_v1.router, prefix="/api/v1", tags=["friends"])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "api alive"}


async def _run_sql_seeds(engine: AsyncEngine) -> None:
    """
    `backend/prisma/seeds/questions.sql` 파일이 있으면 내부에 정의된 INSERT VALUES
    (content 값들) 을 파싱해서 Prisma 클라이언트를 통해 멱등하게 추가합니다.

    이유: 원래는 SQL 텍스트를 직접 실행했으나, PostgreSQL 전용 DO $$ 블록이나
    멀티-스테이트먼트 처리가 SQLAlchemy async 엔진에서 환경에 따라 실패할 수 있어
    Prisma 클라이언트를 사용하도록 변경했습니다. 실패 시 로그를 출력하고
    앱 기동은 계속됩니다.
    """
    seeds_dir = Path(__file__).resolve().parents[1] / "prisma" / "seeds"
    if not seeds_dir.exists():
        return

    import re
    from app.db import db

    # pattern to capture: INSERT INTO "table"(col1, col2) VALUES ('v1','v2')
    pattern = re.compile(r"INSERT INTO \"(?P<table>[^\"]+)\"\s*\((?P<cols>[^)]+)\)\s*VALUES\s*\((?P<vals>[^)]+)\)", re.I)

    for sql_file in seeds_dir.glob("*.sql"):
        try:
            sql_text = sql_file.read_text(encoding="utf-8")
            if not sql_text.strip():
                continue

            for m in pattern.finditer(sql_text):
                table = m.group("table")
                cols = [c.strip().strip('\"') for c in m.group("cols").split(",")]
                vals_raw = m.group("vals")
                # extract quoted string values (handles simple single-quoted SQL strings)
                val_matches = re.findall(r"'((?:[^']|'')*)'", vals_raw)
                vals = [v.replace("''", "'") for v in val_matches]

                if len(cols) != len(vals):
                    # skip malformed
                    print(f"seed parse mismatch in {sql_file.name}: cols!=vals")
                    continue

                data = {col: val for col, val in zip(cols, vals)}

                try:
                    table_client = getattr(db, table)
                except Exception:
                    print(f"Unknown prisma model for seeding: {table}")
                    continue

                # existence check: try to match by first column
                where = {cols[0]: vals[0]} if cols else {}
                try:
                    exists = await table_client.find_first(where=where) if where else None
                except Exception:
                    exists = None

                if not exists:
                    try:
                        await table_client.create(data=data)
                    except Exception as e:
                        print(f"failed to create seed for {table}: {e}")
        except Exception as e:
            print(f"failed to process seed file {sql_file.name}: {e}")


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

    # SQL 시드 실행 (prisma/seeds/*.sql 존재 시)
    await _run_sql_seeds(engine)


# --- 애플리케이션 종료 시 ---
@app.on_event("shutdown")
async def on_shutdown():
    try:
        await db.disconnect()
    except Exception:
        pass
