# backend/Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# healthcheck + SSL 루트 인증서(Neon은 SSL 필수)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY backend/requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

# 앱 소스 복사
COPY backend/ .

# === Prisma Client 생성(빌드 타임) ===
# schema.prisma를 읽어서 Python용 Prisma 클라이언트를 생성
RUN prisma generate

# 비루트 유저
RUN useradd -m -u 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# === 실행 시: 마이그레이션 배포 → 앱 기동 ===
# DATABASE_URL은 런타임(env 또는 .env)에서 주입
CMD ["bash", "-lc", "prisma migrate deploy && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
