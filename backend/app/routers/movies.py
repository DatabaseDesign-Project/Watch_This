from fastapi import APIRouter, Depends, HTTPException, Query, Path
import os, httpx, json, asyncio
from datetime import timedelta, datetime as _dt
from typing import Optional, Dict, Any, List, Set
import redis.asyncio as aioredis

from app.core.deps import get_redis, get_current_user_id
from fastapi.encoders import jsonable_encoder
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
        "rating": rating,              # TMDB 평점
        "ratingAvg": rating,           # 호환 키
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
    # attach liked boolean for current_user_id
    try:
        post_ids = [int(r.post_id) for r in rows]
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}
        else:
            liked_set = set()
        for r in rows:
            try:
                val = int(r.post_id) in liked_set
                setattr(r, "liked", val)
                setattr(r, "is_liked", val)
            except Exception:
                pass
    except Exception:
        pass
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
    # attach liked for current user
    try:
        post_ids = [int(r.post_id) for r in rows]
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}
        else:
            liked_set = set()
        for r in rows:
            try:
                val = int(r.post_id) in liked_set
                setattr(r, "liked", val)
                setattr(r, "is_liked", val)
            except Exception:
                pass
    except Exception:
        pass
    return rows

# =========================================================
# 🔽 하이라이트: TMDB 인기작 3 + 후기 많은 작품 3 (평점키 통일 + 통합 캐시)
# 경로: GET /api/v1/movies/highlights
# =========================================================

_HIGHLIGHTS_CACHE_KEY = "movies:highlights:v3"  # 통합 캐시
_HIGHLIGHTS_TTL_SEC = 1800  # 30분

async def _genres_for_movies(movie_ids: List[int]) -> Dict[int, List[str]]:
    if not movie_ids:
        return {}
    rows = await db.query_raw(
        """
        SELECT mg.movie_id AS movie_id, g.name AS name
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id
        WHERE mg.movie_id = ANY($1)
        """,
        movie_ids,
    )
    out: Dict[int, List[str]] = {}
    for r in rows:
        mid = int(r["movie_id"])
        out.setdefault(mid, []).append(r["name"])
    return out

def _fmt_release_date(rel) -> str:
    if hasattr(rel, "strftime"):
        return rel.strftime("%Y.%m.%d")
    try:
        s = str(rel)
        if "T" in s:
            s = s.split("T", 1)[0]
        return s.replace("-", ".")
    except Exception:
        return "개봉일 정보 없음"

async def _backfill_with_likes(exclude_ids: Set[int], need: int) -> List[Dict[str, Any]]:
    if need <= 0:
        return []
    like_rows = await db.query_raw(
        """
        SELECT p.movie_id AS movie_id, COUNT(l.user_id)::int AS like_cnt
        FROM posts p
        LEFT JOIN likes l ON l.post_id = p.post_id
        GROUP BY p.movie_id
        ORDER BY like_cnt DESC, p.movie_id DESC
        LIMIT 10
        """
    )
    picked: List[int] = []
    for r in like_rows:
        mid = int(r["movie_id"])
        if mid in exclude_ids:
            continue
        picked.append(mid)
        if len(picked) >= need:
            break
    if not picked:
        return []
    movies_rows = await db.movies.find_many(where={"id": {"in": picked}})
    id_map = {int(m.id): m for m in movies_rows}
    gen_map = await _genres_for_movies(picked)
    out = []
    for mid in picked:
        mv = id_map.get(mid)
        if not mv:
            continue
        out.append({
            "id": mid,
            "title": mv.title,
            "original_title": mv.original_title,
            "releaseDate": _fmt_release_date(mv.release_date),
            "director": mv.director,
            "poster": mv.poster_image,
            "postCount": None,
            "genre": ", ".join(gen_map.get(mid, [])) if gen_map.get(mid) else "장르 정보 없음",
            "rating": None,
            "ratingAvg": None,
        })
    return out

async def _backfill_with_recent_posts(exclude_ids: Set[int], need: int) -> List[Dict[str, Any]]:
    if need <= 0:
        return []
    recent_rows = await db.query_raw(
        """
        SELECT p.movie_id AS movie_id, MAX(p.created_at) AS last_ts
        FROM posts p
        GROUP BY p.movie_id
        ORDER BY last_ts DESC, movie_id DESC
        LIMIT 10
        """
    )
    picked: List[int] = []
    for r in recent_rows:
        mid = int(r["movie_id"])
        if mid in exclude_ids:
            continue
        picked.append(mid)
        if len(picked) >= need:
            break
    if not picked:
        return []
    movies_rows = await db.movies.find_many(where={"id": {"in": picked}})
    id_map = {int(m.id): m for m in movies_rows}
    gen_map = await _genres_for_movies(picked)
    out = []
    for mid in picked:
        mv = id_map.get(mid)
        if not mv:
            continue
        out.append({
            "id": mid,
            "title": mv.title,
            "original_title": mv.original_title,
            "releaseDate": _fmt_release_date(mv.release_date),
            "director": mv.director,
            "poster": mv.poster_image,
            "postCount": None,
            "genre": ", ".join(gen_map.get(mid, [])) if gen_map.get(mid) else "장르 정보 없음",
            "rating": None,
            "ratingAvg": None,
        })
    return out

async def _tmdb_popular_top_n(n: int, rds: Optional[aioredis.Redis]) -> List[Dict[str, Any]]:
    genre_map = await get_genre_map(rds, lang="ko-KR")
    url = f"{TMDB}/movie/popular"
    kwargs = auth_kwargs()
    params = kwargs.pop("params", {})
    headers = kwargs.pop("headers", {})
    merged_params = {**params, "language": "ko-KR", "page": "1"}
    async with httpx.AsyncClient(timeout=10) as c:
        resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
        resp.raise_for_status()
        data = resp.json()
    results = (data.get("results") or [])[:n]

    async def fetch_director(mid: int) -> Optional[str]:
        u = f"{TMDB}/movie/{mid}/credits"
        k2 = auth_kwargs()
        p2 = k2.pop("params", {})
        h2 = k2.pop("headers", {})
        merged = {**p2, "language": "ko-KR"}
        try:
            async with httpx.AsyncClient(timeout=10) as c2:
                r = await c2.get(u, params=merged, headers=h2, **k2)
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
    # popular 섹션 포맷을 mostReviewed와 맞춤
    out = []
    for m in mapped:
        out.append({
            "id": m["id"],
            "title": m["title"],
            "original_title": m["_raw"].get("original_title") or m["title"],
            "releaseDate": m["releaseDate"],
            "director": m["director"],
            "poster": m["poster"],
            "postCount": 0,
            "genre": m["genre"],
            "rating": m["rating"],       # 표준 키
            "ratingAvg": m["rating"],    # 호환 키
        })
    return out

@router.get("/highlights")
async def movies_highlights(
    rds: Optional[aioredis.Redis] = Depends(get_redis),
):
    # ---------- 통합 캐시 먼저 확인 ----------
    if rds:
        try:
            cached = await rds.get(_HIGHLIGHTS_CACHE_KEY)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

    # ---------- popular (TMDB) ----------
    try:
        popular = await _tmdb_popular_top_n(3, rds)
    except Exception:
        popular = []

    # ---------- mostReviewed (DB, 장르/평점 포함 + 3개 보장) ----------
    # 1) posts 기준 Top 3 + AVG(ratings)
    agg_rows = await db.query_raw(
        """
        SELECT
            m.id AS id,
            m.title AS title,
            m.original_title AS original_title,
            m.release_date AS release_date,
            m.director AS director,
            m.poster_image AS poster,
            COUNT(p.post_id)::int AS post_count,
            ROUND(AVG(r.rating::numeric), 1) AS avg_rating
        FROM movies m
        JOIN posts p ON p.movie_id = m.id
        LEFT JOIN ratings r ON r.movie_id = m.id
        GROUP BY m.id
        ORDER BY post_count DESC, m.id DESC
        LIMIT 3
        """
    )
    picked_ids: List[int] = [int(r["id"]) for r in agg_rows]
    gen_map = await _genres_for_movies(picked_ids)

    most: List[Dict[str, Any]] = []
    for r in agg_rows:
        mid = int(r["id"])
        avg_val = r["avg_rating"]
        rating_avg = float(avg_val) if avg_val is not None else None
        most.append({
            "id": mid,
            "title": r["title"],
            "original_title": r["original_title"],
            "releaseDate": _fmt_release_date(r["release_date"]),
            "director": r["director"],
            "poster": r["poster"],
            "postCount": int(r["post_count"]),
            "genre": ", ".join(gen_map.get(mid, [])) if gen_map.get(mid) else "장르 정보 없음",
            "rating": rating_avg,      # 표준 키
            "ratingAvg": rating_avg,   # 호환 키
        })

    # 2) 부족 시 likes 순 보강
    remain = 3 - len(most)
    exclude = set(picked_ids)
    if remain > 0:
        liked_fill = await _backfill_with_likes(exclude, remain)
        most.extend(liked_fill)
        exclude.update([x["id"] for x in liked_fill])

    # 3) 그래도 부족 시 최근 포스트 기준 보강
    remain = 3 - len(most)
    if remain > 0:
        recent_fill = await _backfill_with_recent_posts(exclude, remain)
        most.extend(recent_fill)
        exclude.update([x["id"] for x in recent_fill])

    # 4) 그래도 부족하면 TMDB popular에서 차용(중복 제거)
    remain = 3 - len(most)
    if remain > 0 and popular:
        used = set([m["id"] for m in most])
        for item in popular:
            if item["id"] in used:
                continue
            most.append(item)
            if len(most) >= 3:
                break

    payload = {
        "popular": popular[:3],
        "mostReviewed": most[:3],
    }

    # ---------- 통합 캐시 저장 ----------
    if rds:
        try:
            await rds.setex(_HIGHLIGHTS_CACHE_KEY, _HIGHLIGHTS_TTL_SEC, json.dumps(payload))
        except Exception:
            pass

    return payload
