from fastapi import APIRouter, Depends, HTTPException, Query, Path
import os, httpx, json, asyncio
from datetime import timedelta
from typing import Optional, Dict, Any, List, Set
import redis.asyncio as aioredis

from app.core.deps import get_redis, get_current_user_id
from app.db import db

router = APIRouter()  # ✅ 내부 prefix 없음
TMDB = os.environ.get("TMDB_BASE_URL", "https://api.themoviedb.org/3")
TMDB_V4_BEARER = os.environ.get("TMDB_V4_BEARER", "")
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")

def _ensure_auth():
    # 요청 시점에만 검사
    if not TMDB_V4_BEARER and not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB 인증 정보가 없습니다. TMDB_API_KEY 또는 TMDB_V4_BEARER를 설정하세요.")

def auth_kwargs() -> Dict[str, Any]:
    # 호출 직전에 보장
    _ensure_auth()
    if TMDB_V4_BEARER:
        return {"headers": {"Authorization": f"Bearer {TMDB_V4_BEARER}"}}
    return {"params": {"api_key": TMDB_API_KEY}}

CACHE_TTL_SEC = int(timedelta(hours=12).total_seconds())
GENRE_TTL_SEC = int(timedelta(hours=24).total_seconds())

async def get_genre_map(rds: Optional[aioredis.Redis], lang: str = "ko-KR") -> Dict[int, str]:
    cache_key = f"tmdb:genres:{lang}"
    if rds:
        try:
            cached = await rds.get(cache_key)
            if cached:
                return {int(k): v for k, v in json.loads(cached).items()}
        except Exception:
            pass

    url = f"{TMDB}/genre/movie/list"
    kwargs = auth_kwargs()
    params = kwargs.pop("params", {})
    headers = kwargs.pop("headers", {})
    merged_params = {**params, "language": lang}

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=504, detail=f"TMDB 장르 요청 실패: {str(e)}")

    genres = data.get("genres", [])
    mapped = {int(g["id"]): g["name"] for g in genres if "id" in g and "name" in g}

    if rds:
        try:
            await rds.setex(cache_key, GENRE_TTL_SEC, json.dumps(mapped))
        except Exception:
            pass

    return mapped

def map_movie_brief(m: Dict[str, Any], genre_map: Dict[int, str], director_name: Optional[str] = None) -> Dict[str, Any]:
    poster_path = m.get("poster_path")
    poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
    genre_ids = m.get("genre_ids") or []
    genre_names = [genre_map.get(int(gid)) for gid in genre_ids if int(gid) in genre_map]
    genre = ", ".join([g for g in genre_names if g]) if genre_names else "장르 정보 없음"
    vote_average = m.get("vote_average")
    rating = round(vote_average, 1) if isinstance(vote_average, (int, float)) else None
    rd = m.get("release_date")
    release_date = rd.replace("-", ".") if isinstance(rd, str) and rd else "개봉일 정보 없음"
    return {
        "id": m.get("id"),
        "title": m.get("title") or m.get("original_title"),
        "releaseDate": release_date,
        "genre": genre,
        "rating": rating,
        "director": director_name or "감독 정보 없음",
        "poster": poster,
        "_raw": m,
    }

@router.get("/search")
async def movie_search(
    q: str = Query(..., min_length=1, description="검색어"),
    page: int = Query(1, ge=1, le=50),
    rds: Optional[aioredis.Redis] = Depends(get_redis),
):
    cache_key = f"tmdb:search:{q}:{page}"
    if rds:
        try:
            cached = await rds.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

    genre_map = await get_genre_map(rds, lang="ko-KR")

    search_url = f"{TMDB}/search/movie"
    kwargs = auth_kwargs()
    params = kwargs.pop("params", {})
    headers = kwargs.pop("headers", {})
    merged_params = {
        **params,
        "query": q,
        "language": "ko-KR",
        "include_adult": "false",
        "page": str(page),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(search_url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=504, detail=f"TMDB 검색 실패: {str(e)}")

    results = (data.get("results") or [])[:5]

    async def fetch_director(mid: int) -> Optional[str]:
        url = f"{TMDB}/movie/{mid}/credits"
        k2 = auth_kwargs()
        p2 = k2.pop("params", {})
        h2 = k2.pop("headers", {})
        merged = {**p2, "language": "ko-KR"}
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(url, params=merged, headers=h2, **k2)
                r.raise_for_status()
                cred = r.json()
                for cobj in cred.get("crew") or []:
                    if cobj.get("job") == "Director":
                        return cobj.get("name")
        except Exception:
            return None
        return None

    directors: List[Optional[str]] = await asyncio.gather(*[fetch_director(m["id"]) for m in results])
    mapped = [map_movie_brief(m, genre_map, directors[idx]) for idx, m in enumerate(results)]

    response = {"query": q, "page": page, "total_results": data.get("total_results", 0), "results": mapped}

    if rds:
        try:
            await rds.setex(cache_key, CACHE_TTL_SEC, json.dumps(response))
        except Exception:
            pass

    return response

@router.get("/detail/{tmdb_id}")
async def movie_detail(tmdb_id: int, rds: Optional[aioredis.Redis] = Depends(get_redis)):
    cache_key = f"tmdb:movie:{tmdb_id}"
    if rds:
        try:
            val = await rds.get(cache_key)
            if val:
                return json.loads(val)
        except Exception:
            pass

    url = f"{TMDB}/movie/{tmdb_id}"
    kwargs = auth_kwargs()
    params = kwargs.pop("params", {})
    headers = kwargs.pop("headers", {})
    merged_params = {**params, "append_to_response": "credits,release_dates", "language": "ko-KR"}

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {str(e)}")

    if rds:
        try:
            await rds.setex(cache_key, CACHE_TTL_SEC, json.dumps(data))
        except Exception:
            pass

    return data

# =========================================================
# 🔽 여기부터 프록시: 영화별 게시글 목록 (가시성 반영)
# 최종 경로: GET /api/v1/movies/{movie_id}/posts
# =========================================================

from app.services.visibility import build_visibility_or

from datetime import datetime as _dt

async def _resolve_or_import_movie_to_db(tmdb_id: int, rds: Optional[aioredis.Redis]) -> int:
    """
    Ensure a movies row exists for the given TMDB id by querying TMDB movie detail
    and creating a `movies` row if none matches title+release_date. Returns DB movie id.
    """
    # try to fetch TMDB details (reuse movie_detail caching if available)
    try:
        # call TMDB detail endpoint (similar to movie_detail)
        url = f"{TMDB}/movie/{tmdb_id}"
        kwargs = auth_kwargs()
        params = kwargs.pop("params", {})
        headers = kwargs.pop("headers", {})
        merged_params = {**params, "append_to_response": "credits,release_dates", "language": "ko-KR"}
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            tmdb = resp.json()
    except Exception as e:
        # bubble up as HTTPException to caller
        raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {e}")

    title = tmdb.get("title") or tmdb.get("original_title") or "제목 없음"
    rd = tmdb.get("release_date") or None
    try:
        if rd and isinstance(rd, str) and rd:
            release_dt = _dt.strptime(rd, "%Y-%m-%d")
        else:
            release_dt = _dt.utcnow()
    except Exception:
        release_dt = _dt.utcnow()

    # try to find by title + release_date
    existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
    if existing:
        return int(existing.id)

    # create movie
    poster_path = tmdb.get("poster_path")
    poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
    director = None
    for cobj in (tmdb.get("credits", {}).get("crew") or []):
        if cobj.get("job") == "Director":
            director = cobj.get("name")
            break

    mv = await db.movies.create(
        data={
            "title": title,
            "original_title": tmdb.get("original_title") or title,
            "release_date": release_dt,
            "director": director or "",
            "runtime_minutes": int(tmdb.get("runtime") or 0),
            "poster_image": poster,
        }
    )
    return int(mv.id)
@router.get("/{movie_id}/posts")
async def list_movie_posts_proxy(
    movie_id: int = Path(..., ge=1),
    emoji_id: Optional[int] = Query(default=None),
    spoiler: str = Query("show", pattern="^(show|hide)$"),
    sort: str = Query("recent", pattern="^(recent|likes)$"),
    limit: int = Query(20, ge=1, le=100),
    cursor_id: Optional[int] = Query(default=None),
    current_user_id: int = Depends(get_current_user_id),
):
    """
    영화 상세 하위의 게시글 목록.
    - 가시성: public / friends(친구만) / private(작성자 본인만)
    - 필터: emoji_id, spoiler(hide: 스포일러 글 제외)
    - 정렬: recent(기본), likes
    - 커서: post_id 기준 LT
    """
    or_clauses = await build_visibility_or(current_user_id)

    where_clause: Dict[str, Any] = {"AND": [{"movie_id": movie_id}, {"OR": or_clauses}]}
    if emoji_id is not None:
        where_clause = {"AND": [where_clause, {"emojis_id": emoji_id}]}
    if spoiler == "hide":
        where_clause = {"AND": [where_clause, {"has_spoiler": False}]}
    if cursor_id:
        where_clause = {"AND": [where_clause, {"post_id": {"lt": cursor_id}}]}

    order = [{"created_at": "desc"}, {"post_id": "desc"}] if sort == "recent" else [{"like_cnt": "desc"}, {"post_id": "desc"}]

    rows = await db.posts.find_many(
        where=where_clause,
        order=order,
        take=limit,
        include={"user": True, "emoji": True},
    )
    return rows


@router.get("/tmdb/{tmdb_id}/posts")
async def list_movie_posts_by_tmdb(
    tmdb_id: int = Path(..., ge=1),
    emoji_id: Optional[int] = Query(default=None),
    spoiler: str = Query("show", pattern="^(show|hide)$"),
    sort: str = Query("recent", pattern="^(recent|likes)$"),
    limit: int = Query(20, ge=1, le=100),
    cursor_id: Optional[int] = Query(default=None),
    current_user_id: int = Depends(get_current_user_id),
    rds: Optional[aioredis.Redis] = Depends(get_redis),
):
    """
    TMDB id 기반으로 DB movie row를 보장한 뒤 영화별 게시글을 반환합니다.
    이 엔드포인트는 TMDB id로 검색된 결과에서도 관련 게시글을 즉시 볼 수 있게 해줍니다.
    """
    # ensure movie exists in DB (create if missing)
    movie_db_id = await _resolve_or_import_movie_to_db(tmdb_id, rds)

    or_clauses = await build_visibility_or(current_user_id)

    where_clause: Dict[str, Any] = {"AND": [{"movie_id": movie_db_id}, {"OR": or_clauses}]}
    if emoji_id is not None:
        where_clause = {"AND": [where_clause, {"emojis_id": emoji_id}]}
    if spoiler == "hide":
        where_clause = {"AND": [where_clause, {"has_spoiler": False}]}
    if cursor_id:
        where_clause = {"AND": [where_clause, {"post_id": {"lt": cursor_id}}]}

    order = [{"created_at": "desc"}, {"post_id": "desc"}] if sort == "recent" else [{"like_cnt": "desc"}, {"post_id": "desc"}]

    rows = await db.posts.find_many(
        where=where_clause,
        order=order,
        take=limit,
        include={"user": True, "emoji": True},
    )
    return rows
