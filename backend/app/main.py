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

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "api alive"}


async def _run_questions_seed(engine: AsyncEngine) -> None:
    """
    `backend/prisma/seeds/questions.sql` 파일이 있으면 내부에 정의된 INSERT VALUES
    (content 값들) 을 파싱해서 Prisma 클라이언트를 통해 멱등하게 추가합니다.

    이유: 원래는 SQL 텍스트를 직접 실행했으나, PostgreSQL 전용 DO $$ 블록이나
    멀티-스테이트먼트 처리가 SQLAlchemy async 엔진에서 환경에 따라 실패할 수 있어
    Prisma 클라이언트를 사용하도록 변경했습니다. 실패 시 로그를 출력하고
    앱 기동은 계속됩니다.
    """
    sql_path = Path(__file__).resolve().parents[1] / "prisma" / "seeds" / "questions.sql"
    if not sql_path.exists():
        return

    try:
        sql_text = sql_path.read_text(encoding="utf-8")
        if not sql_text.strip():
            return

        # 질문 내용을 정규식으로 추출: INSERT INTO "questions"(content) VALUES ('...');
        import re
        from app.db import db

        pattern = re.compile(r"INSERT INTO \"questions\"\(content\) VALUES \('(.*?)'\)", re.S)
        matches = pattern.findall(sql_text)
        if not matches:
            return

        for content in matches:
            try:
                existing = await db.questions.find_first(where={"content": content})
                if not existing:
                    await db.questions.create(data={"content": content})
            except Exception as e:
                # 한 항목 실패해도 나머지는 계속 처리
                print(f"questions seed insert failed for content={content!r}: {e}")
    except Exception as e:
        # 전체 시드 실패는 로그로 남기고 앱 시작은 계속
        print(f"_run_questions_seed failed: {e}")


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

    # Questions 시드 실행 (존재 시)
    await _run_questions_seed(engine)


# --- 애플리케이션 종료 시 ---
@app.on_event("shutdown")
async def on_shutdown():
    try:
        await db.disconnect()
    except Exception:
        pass
