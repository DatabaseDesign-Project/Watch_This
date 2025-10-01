# backend/app/routers/movies.py
from fastapi import APIRouter, Depends, HTTPException
import os, httpx, json
from datetime import timedelta
from typing import Optional
import redis.asyncio as aioredis
from app.core.deps import get_redis

router = APIRouter()
TMDB = "https://api.themoviedb.org/3"
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
HEAD = {"Authorization": f"Bearer {TMDB_API_KEY}"} if TMDB_API_KEY else {}

CACHE_TTL_SEC = int(timedelta(hours=12).total_seconds())

@router.get("/detail/{tmdb_id}")
async def movie_detail(
    tmdb_id: int,
    rds: Optional[aioredis.Redis] = Depends(get_redis),
):
    # API 키 체크
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY 가 설정되지 않았습니다.")

    key = f"tmdb:movie:{tmdb_id}"

    # 1) 캐시 읽기(있으면 즉시 반환)
    if rds:
        try:
            val = await rds.get(key)
            if val:
                return json.loads(val)
        except Exception:
            # 캐시 장애는 무시하고 TMDB로 진행
            pass

    # 2) TMDB 조회
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(
                f"{TMDB}/movie/{tmdb_id}",
                headers=HEAD,
                params={"append_to_response": "credits,release_dates"},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        # TMDB에서 4xx/5xx가 온 경우 상태코드 전달
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        # 네트워크/타임아웃 등
        raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {str(e)}")

    # 3) (선택) 재캐시 읽기: 다른 워커가 먼저 채웠을 수 있으니 한번 더 확인
    if rds:
        try:
            val = await rds.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass  # 캐시 장애는 무시

    # 4) 캐시 쓰기 (best-effort)
    if rds:
        try:
            await rds.setex(key, CACHE_TTL_SEC, json.dumps(data))
        except Exception:
            pass  # 캐시 장애는 무시

    # 5) 최종 응답
    return data
