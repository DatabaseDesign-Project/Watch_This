from fastapi import APIRouter, Depends, HTTPException, Query, Path
import os, httpx, json, asyncio
from datetime import timedelta, datetime as _dt
from typing import Optional, Dict, Any, List, Set
import redis.asyncio as aioredis

from app.core.deps import get_redis, get_current_user_id
from app.db import db
from app.services.visibility import build_visibility_or  # 재사용

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
# 🔽 영화별 게시글 목록 (가시성 반영 프록시)
# 최종 경로: GET /api/v1/movies/{movie_id}/posts
# =========================================================

async def _resolve_or_import_movie_to_db(tmdb_id: int, rds: Optional[aioredis.Redis]) -> int:
    """
    TMDB id를 기반으로 movies row 존재를 보장하고, 없으면 생성하여 DB movie id 반환.
    """
    try:
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

    existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
    if existing:
        return int(existing.id)

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
    TMDB id 기반으로 DB movie row를 보장한 뒤 영화별 게시글을 반환.
    """
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

# =========================================================
# 🔽 하이라이트: TMDB 인기작 3 + 후기 많은 작품 3
# 경로: GET /api/v1/movies/highlights
# =========================================================

_POPULAR_CACHE_KEY = "tmdb:popular:koKR:top3"
_POPULAR_TTL_SEC = 1800  # 30분
_MOST_REVIEWED_CACHE_KEY = "movies:most_reviewed:top3"
_MOST_REVIEWED_TTL_SEC = 600  # 10분

@router.get("/highlights")
async def movies_highlights(
    rds: Optional[aioredis.Redis] = Depends(get_redis),
):
    """
    popular: TMDB 인기작 상위 3개
    mostReviewed: 우리 DB에서 후기(포스트) 많은 영화 상위 3개
    """
    # ---------- popular (TMDB) ----------
    popular_payload = None
    if rds:
        try:
            cached = await rds.get(_POPULAR_CACHE_KEY)
            if cached:
                popular_payload = json.loads(cached)
        except Exception:
            pass

    if not popular_payload:
        genre_map = await get_genre_map(rds, lang="ko-KR")
        url = f"{TMDB}/movie/popular"
        kwargs = auth_kwargs()
        params = kwargs.pop("params", {})
        headers = kwargs.pop("headers", {})
        merged_params = {**params, "language": "ko-KR", "page": "1"}

        try:
            async with httpx.AsyncClient(timeout=10) as c:
                resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except httpx.RequestError as e:
            raise HTTPException(status_code=504, detail=f"TMDB 인기작 요청 실패: {str(e)}")

        results = (data.get("results") or [])[:3]

        async def fetch_director(mid: int) -> Optional[str]:
            u = f"{TMDB}/movie/{mid}/credits"
            k2 = auth_kwargs()
            p2 = k2.pop("params", {})
            h2 = k2.pop("headers", {})
            merged = {**p2, "language": "ko-KR"}
            try:
                async with httpx.AsyncClient(timeout=10) as c:
                    r = await c.get(u, params=merged, headers=h2, **k2)
                    r.raise_for_status()
                    cred = r.json()
                    for cobj in cred.get("crew") or []:
                        if cobj.get("job") == "Director":
                            return cobj.get("name")
            except Exception:
                return None
            return None

        directors: List[Optional[str]] = await asyncio.gather(*[fetch_director(m["id"]) for m in results])
        popular_payload = [map_movie_brief(m, genre_map, directors[idx]) for idx, m in enumerate(results)]

        if rds:
            try:
                await rds.setex(_POPULAR_CACHE_KEY, _POPULAR_TTL_SEC, json.dumps(popular_payload))
            except Exception:
                pass

    # ---------- mostReviewed (DB) ----------
    most_payload = None
    if rds:
        try:
            cached = await rds.get(_MOST_REVIEWED_CACHE_KEY)
            if cached:
                most_payload = json.loads(cached)
        except Exception:
            pass

    if not most_payload:
        # posts에서 movie_id별 count 상위 3개
        # Prisma Python의 raw 쿼리 사용
        rows = await db.query_raw(
            "SELECT movie_id, COUNT(*) AS cnt FROM posts GROUP BY movie_id ORDER BY cnt DESC LIMIT 3"
        )
        movie_ids = [int(r["movie_id"]) for r in rows]
        counts = {int(r["movie_id"]): int(r["cnt"]) for r in rows}

        movies_rows = []
        if movie_ids:
            # 다건 조회
            movies_rows = await db.movies.find_many(
                where={"id": {"in": movie_ids}}
            )

        # id 순서 보존을 위해 movie_ids 기준으로 재정렬
        id_to_row = {int(m.id): m for m in movies_rows}
        most_payload = []
        for mid in movie_ids:
            mv = id_to_row.get(mid)
            if not mv:
                # 방어: 누락 시 스킵
                continue
            most_payload.append({
                "id": int(mv.id),
                "title": mv.title,
                "original_title": mv.original_title,
                "releaseDate": mv.release_date.strftime("%Y.%m.%d"),
                "director": mv.director,
                "poster": mv.poster_image,
                "postCount": counts.get(mid, 0),
            })

        if rds:
            try:
                await rds.setex(_MOST_REVIEWED_CACHE_KEY, _MOST_REVIEWED_TTL_SEC, json.dumps(most_payload))
            except Exception:
                pass

    return {
        "popular": popular_payload or [],
        "mostReviewed": most_payload or [],
    }
