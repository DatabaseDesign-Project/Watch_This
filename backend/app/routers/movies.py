from fastapi import APIRouter, Depends
import os, httpx, json
from datetime import timedelta
from typing import Optional
import redis.asyncio as aioredis
from ..deps import get_redis

router = APIRouter()
TMDB = "https://api.themoviedb.org/3"
HEAD = {"Authorization": f"Bearer {os.environ.get('TMDB_API_KEY', '')}"}

@router.get("/detail/{tmdb_id}")
async def movie_detail(tmdb_id: int, rds: Optional[aioredis.Redis] = Depends(get_redis)):
    key = f"tmdb:movie:{tmdb_id}"
    if rds:
        val = await rds.get(key)
        if val:
            return json.loads(val)
    async with httpx.AsyncClient(timeout=10) as c:
        resp = await c.get(
            f"{TMDB}/movie/{tmdb_id}",
            headers=HEAD,
            params={"append_to_response": "credits,release_dates"},
        )
        data = resp.json()
    # cache read
    if rds:
        try:
            val = await rds.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass  # 캐시 장애는 무시하고 TMDB로 진행

    # cache write
    if rds:
        try:
            await rds.setex(key, int(timedelta(hours=12).total_seconds()), json.dumps(data))
        except Exception:
            pass

        return data

