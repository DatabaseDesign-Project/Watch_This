<!-- .github/copilot-instructions.md -->

# Repository guidance for AI coding agents — Watch_This

This file provides focused, actionable information for code-assistant agents working on the Watch_This repository. It documents the project's architecture, important developer workflows, and concrete code patterns found in the codebase so an agent can be productive immediately.

- Runtime: Python backend (FastAPI + Prisma + SQLModel), React frontend (Vite), orchestrated with Docker Compose.

## Quick dev commands (use from repo root)
- Start development services (frontend HMR, backend reload):
  - docker compose -f docker-compose.yml --profile dev up -d --build
  - Stop: docker compose -f docker-compose.yml --profile dev down -v
- Start production-like services (Nginx + built frontend):
  - docker compose -f docker-compose.yml --profile prod up -d --build
  - Stop: docker compose -f docker-compose.yml --profile prod down -v

Notes:
- `api-dev` mounts `./backend` into container and runs uvicorn with --reload; Windows users rely on WATCHFILES_FORCE_POLLING in compose for reliable reload.
- `web-dev` uses Vite with environment variable VITE_API_BASE_URL (see docker-compose). For local frontend dev, set VITE_API_BASE_URL to point at the backend dev service (http://api-dev:8000 inside compose or http://localhost:8000 from host).

## Big-picture architecture and data flow
- Frontend (React / Vite) communicates with backend API under /api/* (FastAPI). In production, Nginx serves static frontend and proxies /api/* to FastAPI (see `nginx/nginx.conf`).
- Backend is FastAPI (entrypoint: `backend/app/main.py`). It exposes routers mounted under `/api/...` and `/api/v1/...`.
- Database: Prisma is the primary ORM for most models (Prisma schema at `backend/prisma/schema.prisma`) and the code uses the Prisma Python client (initialized in `backend/app/db.py` as `db = Prisma()`).
- SQLModel/SQLAlchemy coexist: some parts of the app still create SQLModel metadata at startup (see `backend/app/main.py` and `backend/app/core/deps.py`). The code chooses the SQLAlchemy URL from environment vars (`SQLALCHEMY_DATABASE_URL`, `DATABASE_URL`, `NEON_URL`) and falls back to SQLite.
- Redis is optional (used when REDIS_URL is provided). Access via `app.core.deps.get_redis()`.

Why both Prisma and SQLModel?
- The project uses Prisma (Prisma Client for Python) as the main DB access path (see `backend/api/v1/*.py` where `await db.table.find_many()` is used). SQLModel calls are retained for legacy/utility reasons (metadata creation). When adding DB access, prefer using `db` (Prisma client) unless a change explicitly requires SQLModel.

## Important repo conventions and patterns (concrete)
- Dev-auth header: many dev endpoints use a simple header-based auth helper `get_current_user_id` in `backend/app/api/v1/posts.py` which reads `X-User-Id`. When implementing or testing endpoints locally, use this header for authentication.
- Prisma client usage: `from app.db import db` then `await db.<table>.find_many(...)` or `await db.<table>.create(data={...})`. Check `backend/api/v1/posts.py` for multiple examples including relational connect syntax (e.g. `data["user"] = {"connect": {"id": user_id}}`).
- Prisma field names vs API fields: Prisma schema uses names like `has_spoiler` and `post_id`. API payloads sometimes use `spoiler` or `post_id`; confirm mapping in endpoints (see the mapping in `create_post`).
- Error handling style: endpoints raise FastAPI HTTPException with localized (Korean) messages and include try/except blocks that translate DB/client exceptions into HTTP 4xx/5xx responses. Follow the same pattern rather than returning raw exceptions.
- Date/time handling: code often uses UTC when parsing or defaulting (see `posts.py` tmdb parsing). Use datetime.utcnow() for server-side created timestamps when needed.

## Migrations and database tasks
- Migrations are Prisma-based. Typical tasks executed in containers:
  - Apply migrations: `python -m prisma migrate deploy` (used in compose startup)
  - Generate client after schema changes: `python -m prisma generate`

If you edit `backend/prisma/schema.prisma`:
 1) Run `prisma migrate dev` or generate a new migration in your local environment (follow Prisma Python docs); in Docker Compose the container runs `prisma migrate deploy` during startup.
 2) Ensure `python -m prisma generate` has been run before using the new client.

## Testing, linting, and build
- There are no dedicated unit tests in the repository root. Keep new tests adjacent to code you modify and prefer fast, isolated tests.
- Backend dependencies are in `backend/requirements.txt`. Frontend dependencies are in `frontend/package.json` (pnpm/npm supported).

## Debugging tips and platform quirks
- Windows file watching: docker-compose sets `WATCHFILES_FORCE_POLLING: "true"` for `api-dev` and `CHOKIDAR_USEPOLLING: "true"` for `web-dev`. When running services on Windows, ensure polling is enabled for reliable reload.
- Health checks: backend exposes `/health` that is used by compose healthchecks. When adding endpoints that affect readiness, update startup/shutdown behavior in `backend/app/main.py`.
- Prisma client lifecycle: `db = Prisma()` is created in `backend/app/db.py`. App startup connects with `await db.connect()` and disconnects on shutdown. Avoid creating new Prisma instances; import the shared `db` object.

## Files and lines to reference when coding
- FastAPI app entry: `backend/app/main.py` (router registration, startup/shutdown logic)
- Prisma client instance: `backend/app/db.py` (single shared Prisma client)
- DB connection & Redis: `backend/app/core/deps.py` (DB URL heuristics, SSL, redis client)
- Example complex endpoint patterns: `backend/app/api/v1/posts.py` (TMDB import flow, relational create/connect, rollback patterns)
- Prisma schema (source of truth for DB shapes and constraints): `backend/prisma/schema.prisma`
- Docker orchestration and dev vs prod profiles: `docker-compose.yml`

## What to avoid / common pitfalls
- Don't assume SQLModel and Prisma are interchangeable: Prisma client is authoritative for most DB operations.
- Avoid creating ad-hoc DB clients; use the singleton `db` in `backend/app/db.py`.
- When changing schema, remember to run Prisma generate/migrate and update any code that relies on field names (e.g. `post_id`, `has_spoiler`).

## Example edits an agent might perform (with references)
- Add a new endpoint that creates a Prisma-backed resource: follow patterns in `backend/app/api/v1/posts.py` for validation, relational connect syntax, and descriptive HTTPException messages.
- Add a background startup task that needs Redis: check `backend/app/main.py` startup flow and use `get_redis()` from `backend/app/core/deps.py`.

---
If anything above is unclear or you want me to include more examples (for example, common Prisma query shapes used in the repo), tell me which area to expand and I will update this file.
