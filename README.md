# 이거 봤어?
> 사용자가 자신만의 영화 감상을 아카이브 형태로 체계적으로 관리하고 공유할 수 있는 소셜 플랫폼

| Feed | Post | Search | Movie |
|:----:|:----:|:------:|:-----:|
| <img src="https://github.com/user-attachments/assets/274593cd-82cb-4775-9b0e-e6f3c519b91c" width="200"/> | <img src="https://github.com/user-attachments/assets/e4a7cb1b-86b6-4d0b-a349-7ecd4b43016d" width="200"/> | <img src="https://github.com/user-attachments/assets/385ae46f-c79e-487f-905b-8779ddb3ec0f" width="200"/> | <img src="https://github.com/user-attachments/assets/e58b0c35-ac10-474a-835c-5a98362066e8" width="200"/> |


## 사용법

### 개발 모드

```bash
docker compose -f docker-compose.yml --profile dev up -d --build
# 종료
docker compose -f docker-compose.yml --profile dev down -v
```

문서: http://localhost:8000/docs
(nginx 경유가 필요하면 web-dev 대신 프로덕션 nginx를 쓰는 구성으로 바꿔야 하니 지금은 직접 접근 권장)

### 프로덕션 모드

```bash
docker compose -f docker-compose.yml --profile prod up -d --build
# 종료
docker compose -f docker-compose.yml --profile prod down -v
```

문서(Nginx 경유): http://localhost/api/docs

## 프로젝트 구조

```
Watch_This/
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/          # API 엔드포인트
│   │   ├── core/         # 핵심 설정 및 유틸리티
│   │   ├── routers/      # 라우터 모듈
│   │   ├── db.py         # 데이터베이스 연결
│   │   └── main.py       # FastAPI 애플리케이션 진입점
│   ├── prisma/           # Prisma ORM 스키마 및 마이그레이션
│   ├── requirements.txt  # Python 의존성
│   └── Dockerfile        # 백엔드 Docker 이미지
│
├── frontend/             # React + Vite 프론트엔드
│   ├── src/
│   │   ├── components/  # React 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   ├── App.jsx      # 앱 루트 컴포넌트
│   │   └── main.jsx     # 엔트리 포인트
│   ├── package.json     # npm 의존성
│   └── Dockerfile       # 프론트엔드 Docker 이미지 (multi-stage build)
│
├── nginx/               # Nginx 설정 (프로덕션 리버스 프록시)
└── docker-compose.yml   # Docker Compose 오케스트레이션
```

## 기술 스택

### 백엔드
- **프레임워크**: FastAPI (Python 3.12)
- **ORM**: Prisma
- **데이터베이스**: PostgreSQL (Neon) / SQLite (로컬 테스트)
- **인증**: Passlib + bcrypt
- **캐시**: Redis
- **서버**: Uvicorn

### 프론트엔드
- **프레임워크**: React 19
- **빌드 도구**: Vite
- **UI 라이브러리**: Material-UI (MUI)
- **상태 관리**: Zustand
- **데이터 페칭**: TanStack Query (React Query)
- **스타일링**: Emotion
- **라우팅**: React Router
- **HTTP 클라이언트**: Axios

### 인프라
- **컨테이너**: Docker + Docker Compose
- **웹 서버**: Nginx (프로덕션)
- **개발 환경**: Hot Module Replacement (HMR) 지원

## 아키텍처

### 개발 모드
```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  web-dev    │       │   api-dev    │       │    redis    │
│  (Vite HMR) │──────▶│  (FastAPI)   │◀──────│  (cache)    │
│  :5173      │       │  :8000       │       │  :6379      │
└─────────────┘       └──────────────┘       └─────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  PostgreSQL  │
                      │    (Neon)    │
                      └──────────────┘
```

### 프로덕션 모드
```
┌──────────────────────────────────┐
│         Nginx :80                │
│  ┌────────────┬────────────────┐ │
│  │  정적 파일   │  /api/* 프록시   │ │
│  └────────────┴────────────────┘ │
└────────┬───────────────┬─────────┘
         │               │
         ▼               ▼
   ┌──────────┐   ┌──────────────┐
   │  React   │   │     api      │
   │  (빌드됨)  │   │  (FastAPI)   │
   └──────────┘   │  :8000       │
                  └──────┬───────┘
                         ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │    (Neon)    │
                  └──────────────┘
```
