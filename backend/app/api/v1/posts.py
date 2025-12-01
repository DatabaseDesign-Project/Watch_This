from typing import List, Optional, Dict, Any, Set
from datetime import datetime
import time
import json
import httpx  # 외부 요청용

from fastapi import APIRouter, HTTPException, Path, Body, Depends, Header, Query
from fastapi.encoders import jsonable_encoder
from decimal import Decimal

from app.db import db
from app.routers import movies as tmdb_mod
from app.core.deps import get_redis
from app.schemas.posts import AnswerIn, MediaIn, PostCreate, PostUpdate
from app.services.social import get_friend_ids, are_friends
from app.services.visibility import ensure_post_visible, build_visibility_or

router = APIRouter()

# =========================
# 개발용 인증 헬퍼
# =========================
def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    try:
        return int(x_user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="X-User-Id header must be an integer")


# =========================
# Questions 캐시
# =========================
_QCACHE: Dict[str, Any] = {"ids": set(), "ts": 0.0}
_QCACHE_TTL_SEC = 600
_QREDIS_KEY = "questions:ids"
_QREDIS_TTL_SEC = 86400

async def _load_questions_from_db() -> Set[int]:
    rows = await db.questions.find_many()
    return {int(r.id) for r in rows}

async def _get_question_id_set() -> Set[int]:
    rds = get_redis()
    if rds:
        try:
            raw = await rds.get(_QREDIS_KEY)
            if raw:
                return {int(x) for x in json.loads(raw)}
        except Exception:
            pass

    now = time.time()
    if _QCACHE["ts"] and (now - _QCACHE["ts"] < _QCACHE_TTL_SEC):
        ids = _QCACHE["ids"]
        if ids:
            return set(ids)

    ids = await _load_questions_from_db()
    _QCACHE["ids"] = set(ids)
    _QCACHE["ts"] = now

    if rds:
        try:
            await rds.setex(_QREDIS_KEY, _QREDIS_TTL_SEC, json.dumps(list(ids)))
        except Exception:
            pass

    return ids

async def _ensure_valid_question_ids(qids: List[int]) -> None:
    if not qids:
        return
    valid = await _get_question_id_set()
    invalid = [qid for qid in qids if qid not in valid]
    if invalid:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 question_id 포함: {invalid}")


# =========================
# TMDB → DB 저장 보조
# =========================
async def _resolve_or_import_movie(payload_tmdb_id: int) -> int:
    try:
        url = f"{tmdb_mod.TMDB}/movie/{payload_tmdb_id}"
        kwargs = tmdb_mod.auth_kwargs()
        params = kwargs.pop("params", {})
        headers = kwargs.pop("headers", {})
        merged_params = {**params, "append_to_response": "credits,release_dates", "language": "ko-KR"}
        
        # httpx 클라이언트 생성
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            tmdb = resp.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"TMDB 요청 실패: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {e}")

    # 데이터 추출
    title = tmdb.get("title") or tmdb.get("original_title") or "제목 없음"
    original_title = tmdb.get("original_title") or title
    
    rd = tmdb.get("release_date")
    try:
        if rd and isinstance(rd, str) and rd:
            release_dt = datetime.strptime(rd, "%Y-%m-%d")
        else:
            release_dt = datetime.utcnow()
    except Exception:
        release_dt = datetime.utcnow()

    director = None
    for cobj in (tmdb.get("credits", {}).get("crew") or []):
        if cobj.get("job") == "Director":
            director = cobj.get("name")
            break
            
    runtime = tmdb.get("runtime") or 0
    poster_path = tmdb.get("poster_path")
    poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None

    # [수정] 장르 추출은 하되, DB 저장은 하지 않음 (에러 방지)
    # genres_list = tmdb.get("genres", [])
    # genre_str = ", ".join([g["name"] for g in genres_list]) if genres_list else ""

    existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
    if existing:
        return int(existing.id)

    # [수정] genre 필드 제거함 (DB 스키마 불일치로 인한 500 에러 방지)
    mv = await db.movies.create(
        data={
            "title": title,
            "original_title": original_title,
            "release_date": release_dt,
            "director": director or "",
            "runtime_minutes": int(runtime or 0),
            "poster_image": poster,
            # "genre": genre_str  <-- 이 줄을 삭제했습니다.
        }
    )
    return int(mv.id)


# =========================
# POST 생성
# =========================
@router.post("/", status_code=201)
async def create_post(payload: PostCreate, current_user_id: int = Depends(get_current_user_id)):
    """포스트 생성"""
    
    # 1. 사용자 확인
    user_id_to_use = payload.user_id or current_user_id
    if payload.user_id and payload.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="payload.user_id does not match authenticated user")

    user = await db.users.find_unique(where={"id": user_id_to_use})
    if not user:
        raise HTTPException(status_code=404, detail="작성자(사용자)를 찾을 수 없습니다.")

    # 2. 영화 확인/가져오기
    if payload.movie_id:
        movie = await db.movies.find_unique(where={"id": payload.movie_id})
        if not movie:
            raise HTTPException(status_code=404, detail="대상 작품을 찾을 수 없습니다.")
        resolved_movie_id = int(movie.id)
    elif payload.tmdb_id:
        resolved_movie_id = await _resolve_or_import_movie(payload.tmdb_id)
    else:
        raise HTTPException(status_code=400, detail="movie_id 또는 tmdb_id 중 하나를 제공해야 합니다.")

    # 3. 질문 유효성 검증
    answer_qids = [a.question_id for a in (payload.answers or [])]
    media_qids = [m.question_id for m in (payload.medias or []) if m.question_id is not None]
    await _ensure_valid_question_ids(answer_qids + media_qids)

    # 4. 기본 질문 확인
    main_question = await db.questions.find_first(where={"content": {"contains": "자유롭게"}})
    
    if main_question:
        main_question_id = int(main_question.id)
        has_main_answer = any(a.question_id == main_question_id for a in (payload.answers or []))
        if not has_main_answer:
             pass

    # 5. 포스트 생성
    try:
        create_data = {
            "title": payload.title,
            "visibility": payload.visibility or "public",
            "has_spoiler": payload.spoiler or False,
            "user": {"connect": {"id": user_id_to_use}},
            "movie": {"connect": {"id": resolved_movie_id}},
        }
        
        if payload.emojis_id:
            create_data["emoji"] = {"connect": {"id": payload.emojis_id}}

        new_post = await db.posts.create(data=create_data)
        created_post_id = int(new_post.post_id)
        
    except Exception as e:
        print(f"❌ 포스트 생성 실패: {e}")
        # 상세 에러 로그 출력 (디버깅용)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"포스트 생성 실패: {str(e)}")

    # 6. 답변 생성
    if payload.answers:
        for a in payload.answers:
            try:
                await db.answers.create(
                    data={
                        "post_id": created_post_id,
                        "question_id": a.question_id,
                        "answer": a.answer,
                    }
                )
            except Exception as e:
                print(f"⚠️ 답변 생성 실패 (question_id={a.question_id}): {e}")

    # 7. 미디어 생성
    if payload.medias:
        for m in payload.medias:
            if m.question_id is None:
                continue
            try:
                await db.medias.create(
                    data={
                        "post_id": created_post_id,
                        "question_id": m.question_id,
                        "media_type": m.media_type,
                        "file_path": m.file_path,
                    }
                )
            except Exception as e:
                print(f"⚠️ 미디어 생성 실패: {e}")

    # 8. 평점 저장
    if payload.rating is not None and payload.rating > 0:
        try:
            rating_value = Decimal(str(payload.rating))
            existing_rating = await db.ratings.find_unique(
                where={"user_id_movie_id": {"user_id": user_id_to_use, "movie_id": resolved_movie_id}}
            )
            
            if existing_rating:
                await db.ratings.update(
                    where={"user_id_movie_id": {"user_id": user_id_to_use, "movie_id": resolved_movie_id}},
                    data={"rating": rating_value},
                )
            else:
                await db.ratings.create(
                    data={
                        "user_id": user_id_to_use,
                        "movie_id": resolved_movie_id,
                        "rating": rating_value,
                    }
                )
        except Exception as e:
            print(f"⚠️ 평점 저장 실패: {e}")

    return {"message": "포스트 생성 완료", "post_id": created_post_id}


# =========================
# 피드
# =========================
@router.get("/feed")
async def feed(
    cursor_created_at: Optional[str] = Query(default=None),
    cursor_id: Optional[int] = Query(default=None),
    limit: int = Query(20, ge=1, le=100),
    current_user_id: int = Depends(get_current_user_id),
):
    or_clauses = await build_visibility_or(current_user_id)
    where_clause: Dict[str, Any] = {"OR": or_clauses}
    
    if cursor_created_at:
        try:
            where_clause = {
                "AND": [
                    {"OR": or_clauses},
                    {
                        "OR": [
                            {"created_at": {"lt": cursor_created_at}},
                            {
                                "AND": [
                                    {"created_at": cursor_created_at},
                                    {"post_id": {"lt": cursor_id or 0}},
                                ]
                            },
                        ]
                    },
                ]
            }
        except Exception:
            pass
    elif cursor_id:
        where_clause = {"AND": [{"post_id": {"lt": cursor_id}}, {"OR": or_clauses}]}

    posts = await db.posts.find_many(
        where=where_clause,
        order=[{"created_at": "desc"}, {"post_id": "desc"}],
        take=limit,
        include={"user": True, "answers": True, "questionMedias": True, "emoji": True, "movie": True},
    )
    
    try:
        post_ids = [int(p.post_id) for p in posts]
        liked_set = set()
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}
            
        encoded = jsonable_encoder(posts)
        for idx, p in enumerate(posts):
            val = int(p.post_id) in liked_set
            encoded[idx]["liked"] = val
            encoded[idx]["is_liked"] = val
        return encoded
    except Exception:
        return posts


# =========================
# 단건 조회
# =========================
@router.get("/{post_id}")
async def get_post(
    post_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    post = await db.posts.find_unique(
        where={"post_id": post_id},
        include={"user": True, "answers": True, "questionMedias": True, "emoji": True, "movie": True},
    )
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
    
    await ensure_post_visible(post, current_user_id)
    
    try:
        exists = await db.likes.find_unique(where={"user_id_post_id": {"user_id": current_user_id, "post_id": post_id}})
        val = bool(exists)
        encoded = jsonable_encoder(post)
        encoded["liked"] = val
        encoded["is_liked"] = val
        return encoded
    except Exception:
        return post


# =========================
# 수정
# =========================
@router.patch("/{post_id}")
async def update_post(post_id: int = Path(..., ge=1), payload: PostUpdate = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    if int(post.user_id) != int(payload.user_id):
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    data: Dict[str, Any] = {}
    if payload.title is not None:
        data["title"] = payload.title
    if payload.visibility is not None:
        data["visibility"] = payload.visibility
    if payload.spoiler is not None:
        data["has_spoiler"] = payload.spoiler
    if payload.emojis_id is not None:
        if payload.emojis_id == 0:
            data["emojis_id"] = None
        else:
            data["emoji"] = {"connect": {"id": payload.emojis_id}}

    if not data:
        return {"message": "변경할 내용이 없습니다."}

    data["updated_at"] = datetime.utcnow()

    updated = await db.posts.update(where={"post_id": post_id}, data=data)
    return {"message": "수정 완료", "post": updated}


# =========================
# 삭제
# =========================
@router.delete("/{post_id}")
async def delete_post(post_id: int = Path(..., ge=1), user_id: int = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
    if int(post.user_id) != int(user_id):
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
    await db.posts.delete(where={"post_id": post_id})
    return {"message": "삭제 완료"}


# =========================
# 특정 유저 글 목록
# =========================
@router.get("/users/{user_id}/posts")
async def list_user_posts(
    user_id: int,
    visibility: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    cursor_id: Optional[int] = Query(default=None),
    current_user_id: int = Depends(get_current_user_id),
):
    if visibility:
        base: Dict[str, Any] = {"user_id": user_id, "visibility": visibility}
    else:
        or_clauses = await build_visibility_or(current_user_id)
        base = {"AND": [{"user_id": user_id}, {"OR": or_clauses}]}

    if cursor_id:
        base = {"AND": [base, {"post_id": {"lt": cursor_id}}]}

    rows = await db.posts.find_many(
        where=base,
        order={"created_at": "desc"},
        take=limit,
        include={"user": True, "answers": True, "questionMedias": True, "emoji": True, "movie": True},
    )
    
    try:
        post_ids = [int(r.post_id) for r in rows]
        liked_set = set()
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}
            
        encoded = jsonable_encoder(rows)
        for idx, r in enumerate(rows):
            val = int(r.post_id) in liked_set
            encoded[idx]["liked"] = val
            encoded[idx]["is_liked"] = val
        return encoded
    except Exception:
        return rows
    

# from typing import List, Optional, Dict, Any, Set
# from datetime import datetime
# import time@router.get("/users/{user_id}/posts")
async def list_user_posts(
    user_id: int,
    visibility: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    cursor_id: Optional[int] = Query(default=None),
    current_user_id: int = Depends(get_current_user_id),
):
    if visibility:
        base: Dict[str, Any] = {"user_id": user_id, "visibility": visibility}
    else:
        or_clauses = await build_visibility_or(current_user_id)
        base = {"AND": [{"user_id": user_id}, {"OR": or_clauses}]}

    if cursor_id:
        base = {"AND": [base, {"post_id": {"lt": cursor_id}}]}

    rows = await db.posts.find_many(
        where=base,
        order={"created_at": "desc"},
        take=limit,
        include={
            "user": True,
            "answers": True,
            "questionMedias": True,
            "emoji": True,
            "movie": True,
        },
    )
    
    try:
        post_ids = [int(r.post_id) for r in rows]
        liked_set = set()
        if post_ids:
            like_rows = await db.likes.find_many(
                where={"user_id": current_user_id, "post_id": {"in": post_ids}}
            )
            liked_set = {int(r.post_id) for r in like_rows}
            
        encoded = jsonable_encoder(rows)
        for idx, r in enumerate(rows):
            val = int(r.post_id) in liked_set
            encoded[idx]["liked"] = val
            encoded[idx]["is_liked"] = val
        return encoded
    except Exception:
        return rows

# import json
# import httpx

# from fastapi import APIRouter, HTTPException, Path, Body, Depends, Header, Query
# from fastapi.encoders import jsonable_encoder
# from decimal import Decimal

# from app.db import db
# from app.routers import movies as tmdb_mod
# from app.core.deps import get_redis
# from app.schemas.posts import AnswerIn, MediaIn, PostCreate, PostUpdate
# from app.services.social import get_friend_ids, are_friends
# from app.services.visibility import ensure_post_visible, build_visibility_or

# router = APIRouter()

# # =========================
# # 개발용 인증 헬퍼 (헤더 기반)
# # =========================
# def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
#     """
#     개발 도우미: 문자열로 X-User-Id 헤더를 읽고 int에 강제.
#     누락/형식오류 시 401.
#     """
#     if not x_user_id:
#         raise HTTPException(status_code=401, detail="X-User-Id header required for authentication in this dev mode")
#     try:
#         return int(x_user_id)
#     except Exception:
#         raise HTTPException(status_code=401, detail="X-User-Id header must be an integer")


# # =========================
# # Questions 캐시 (Redis + in-memory)
# # =========================

# _QCACHE: Dict[str, Any] = {"ids": set(), "ts": 0.0}  # ids: Set[int], ts: unix
# _QCACHE_TTL_SEC = 600
# _QREDIS_KEY = "questions:ids"
# _QREDIS_TTL_SEC = 86400

# async def _load_questions_from_db() -> Set[int]:
#     # Prisma Python client's find_many doesn't accept `select` in this usage
#     # so fetch rows and extract ids manually.
#     rows = await db.questions.find_many()
#     return {int(r.id) for r in rows}

# async def _get_question_id_set() -> Set[int]:
#     # 1) Redis
#     rds = get_redis()
#     if rds:
#         try:
#             raw = await rds.get(_QREDIS_KEY)
#             if raw:
#                 return {int(x) for x in json.loads(raw)}
#         except Exception:
#             pass

#     # 2) 프로세스 캐시
#     now = time.time()
#     if _QCACHE["ts"] and (now - _QCACHE["ts"] < _QCACHE_TTL_SEC):
#         ids = _QCACHE["ids"]
#         if ids:
#             return set(ids)

#     # 3) DB
#     ids = await _load_questions_from_db()
#     _QCACHE["ids"] = set(ids)
#     _QCACHE["ts"] = now

#     # 4) Redis best-effort
#     if rds:
#         try:
#             await rds.setex(_QREDIS_KEY, _QREDIS_TTL_SEC, json.dumps(list(ids)))
#         except Exception:
#             pass

#     return ids

# async def _ensure_valid_question_ids(qids: List[int]) -> None:
#     if not qids:
#         return
#     valid = await _get_question_id_set()
#     invalid = [qid for qid in qids if qid not in valid]
#     if invalid:
#         raise HTTPException(status_code=400, detail=f"유효하지 않은 question_id 포함: {invalid}")


# # 친구목록 캐시 및 가시성 로직은 app.services.social / app.services.visibility 로 이동


# # =========================
# # TMDB → DB 저장 보조
# # =========================
# async def _resolve_or_import_movie(payload_tmdb_id: int) -> int:
#     try:
#         # ... (TMDB API 호출 부분 기존 동일) ...
#         resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
#         resp.raise_for_status()
#         tmdb = resp.json()
#     except Exception as e:
#         # ... (예외 처리 기존 동일) ...
#         raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {e}")

#     # --- [데이터 추출 부분] ---
#     title = tmdb.get("title") or tmdb.get("original_title") or "제목 없음"
#     original_title = tmdb.get("original_title") or title
    
#     # 날짜 처리 (기존 동일)
#     rd = tmdb.get("release_date")
#     try:
#         if rd and isinstance(rd, str) and rd:
#             release_dt = datetime.strptime(rd, "%Y-%m-%d")
#         else:
#             release_dt = datetime.utcnow()
#     except Exception:
#         release_dt = datetime.utcnow()

#     # 감독 추출 (기존 동일)
#     director = None
#     for cobj in (tmdb.get("credits", {}).get("crew") or []):
#         if cobj.get("job") == "Director":
#             director = cobj.get("name")
#             break
            
#     runtime = tmdb.get("runtime") or 0
#     poster_path = tmdb.get("poster_path")
#     poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None

#     # ✅ [추가됨] 장르 추출 로직
#     # TMDB는 genres를 [{"id": 18, "name": "Drama"}, ...] 형태로 줍니다.
#     # 이를 "Drama, Action" 형태의 문자열로 변환합니다.
#     genres_list = tmdb.get("genres", [])
#     genre_str = ", ".join([g["name"] for g in genres_list]) if genres_list else ""

#     existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
#     if existing:
#         return int(existing.id)

#     # ✅ [수정됨] DB 저장 시 genre 필드 추가
#     mv = await db.movies.create(
#         data={
#             "title": title,
#             "original_title": original_title,
#             "release_date": release_dt,
#             "director": director or "",
#             "runtime_minutes": int(runtime or 0),
#             "poster_image": poster,
#             "genre": genre_str,  # <--- 이 부분이 추가되어야 합니다!
#         }
#     )
#     return int(mv.id)
# # async def _resolve_or_import_movie(payload_tmdb_id: int) -> int:
# #     try:
# #         url = f"{tmdb_mod.TMDB}/movie/{payload_tmdb_id}"
# #         kwargs = tmdb_mod.auth_kwargs()
# #         params = kwargs.pop("params", {})
# #         headers = kwargs.pop("headers", {})
# #         merged_params = {**params, "append_to_response": "credits,release_dates", "language": "ko-KR"}
# #         async with httpx.AsyncClient(timeout=10) as c:
# #             resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
# #             resp.raise_for_status()
# #             tmdb = resp.json()
# #     except httpx.HTTPStatusError as e:
# #         raise HTTPException(status_code=e.response.status_code, detail=f"TMDB 요청 실패: {e.response.text}")
# #     except Exception as e:
# #         raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {e}")

# #     title = tmdb.get("title") or tmdb.get("original_title") or "제목 없음"
# #     original_title = tmdb.get("original_title") or title
# #     rd = tmdb.get("release_date") or None
# #     try:
# #         if rd and isinstance(rd, str) and rd:
# #             release_dt = datetime.strptime(rd, "%Y-%m-%d")
# #         else:
# #             release_dt = datetime.utcnow()
# #     except Exception:
# #         release_dt = datetime.utcnow()

# #     director = None
# #     for cobj in (tmdb.get("credits", {}).get("crew") or []):
# #         if cobj.get("job") == "Director":
# #             director = cobj.get("name")
# #             break
# #     runtime = tmdb.get("runtime") or 0
# #     poster_path = tmdb.get("poster_path")
# #     poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None

# #     existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
# #     if existing:
# #         return int(existing.id)

# #     mv = await db.movies.create(
# #         data={
# #             "title": title,
# #             "original_title": original_title,
# #             "release_date": release_dt,
# #             "director": director or "",
# #             "runtime_minutes": int(runtime or 0),
# #             "poster_image": poster,
# #         }
# #     )
# #     return int(mv.id)


# # =========================
# # POST 생성
# # =========================
# # posts.py - create_post 함수만 수정된 버전
# # 기존 파일의 create_post 함수(약 154번~252번 줄)를 아래로 교체하세요

# # =====================================================================
# # posts.py의 create_post 함수 교체용 코드
# # 기존 154번 줄 ~ 252번 줄을 아래 코드로 교체하세요
# # =====================================================================

# @router.post("/", status_code=201)
# async def create_post(payload: PostCreate, current_user_id: int = Depends(get_current_user_id)):
#     """포스트 생성 - 트랜잭션 단순화 버전"""
    
#     # 1. 사용자 확인
#     user_id_to_use = payload.user_id or current_user_id
#     if payload.user_id and payload.user_id != current_user_id:
#         raise HTTPException(status_code=403, detail="payload.user_id does not match authenticated user")

#     user = await db.users.find_unique(where={"id": user_id_to_use})
#     if not user:
#         raise HTTPException(status_code=404, detail="작성자(사용자)를 찾을 수 없습니다.")

#     # 2. 영화 확인/가져오기
#     if payload.movie_id:
#         movie = await db.movies.find_unique(where={"id": payload.movie_id})
#         if not movie:
#             raise HTTPException(status_code=404, detail="대상 작품을 찾을 수 없습니다.")
#         resolved_movie_id = int(movie.id)
#     elif payload.tmdb_id:
#         resolved_movie_id = await _resolve_or_import_movie(payload.tmdb_id)
#     else:
#         raise HTTPException(status_code=400, detail="movie_id 또는 tmdb_id 중 하나를 제공해야 합니다.")

#     # 3. 질문 유효성 검증
#     answer_qids = [a.question_id for a in (payload.answers or [])]
#     media_qids = [m.question_id for m in (payload.medias or []) if m.question_id is not None]
#     await _ensure_valid_question_ids(answer_qids + media_qids)

#     # 4. 기본 질문 확인
#     main_question = await db.questions.find_first(where={"content": "자유롭게 이야기를 들려주세요!"})
#     if not main_question:
#         raise HTTPException(status_code=500, detail="서버에 기본 질문이 없습니다.")
    
#     main_question_id = int(main_question.id)
#     has_main_answer = any(a.question_id == main_question_id for a in (payload.answers or []))
#     if not has_main_answer:
#         raise HTTPException(status_code=400, detail="기본 질문인 '자유롭게 이야기를 들려주세요!'에 대한 답변이 필요합니다.")

#     # 5. 포스트 생성 (트랜잭션 없이 순차 처리)
#     try:
#         # 포스트 기본 데이터
#         create_data = {
#             "title": payload.title,
#             "visibility": payload.visibility or "public",
#             "has_spoiler": payload.spoiler or False,
#             "user": {"connect": {"id": user_id_to_use}},
#             "movie": {"connect": {"id": resolved_movie_id}},
#         }
        
#         # 이모지 연결 (있는 경우만)
#         if payload.emojis_id:
#             create_data["emoji"] = {"connect": {"id": payload.emojis_id}}

#         # 포스트 생성
#         new_post = await db.posts.create(data=create_data)
#         created_post_id = int(new_post.post_id)
        
#         print(f"✅ 포스트 생성 완료: post_id={created_post_id}")

#     except Exception as e:
#         print(f"❌ 포스트 생성 실패: {e}")
#         raise HTTPException(status_code=500, detail=f"포스트 생성 실패: {str(e)}")

#     # 6. 답변 생성
#     if payload.answers:
#         for a in payload.answers:
#             try:
#                 await db.answers.create(
#                     data={
#                         "post_id": created_post_id,
#                         "question_id": a.question_id,
#                         "answer": a.answer,
#                     }
#                 )
#             except Exception as e:
#                 print(f"⚠️ 답변 생성 실패 (question_id={a.question_id}): {e}")
#                 # 답변 실패해도 계속 진행

#     # 7. 미디어 생성 (payload에 포함된 경우)
#     if payload.medias:
#         for m in payload.medias:
#             if m.question_id is None:
#                 continue  # question_id 없으면 스킵
#             try:
#                 await db.medias.create(
#                     data={
#                         "post_id": created_post_id,
#                         "question_id": m.question_id,
#                         "media_type": m.media_type,
#                         "file_path": m.file_path,
#                     }
#                 )
#             except Exception as e:
#                 print(f"⚠️ 미디어 생성 실패: {e}")

#     # 8. 평점 저장 (선택)
#     if payload.rating is not None and payload.rating > 0:
#         try:
#             rating_value = Decimal(str(payload.rating))
#             # 기존 평점 확인
#             existing_rating = await db.ratings.find_unique(
#                 where={"user_id_movie_id": {"user_id": user_id_to_use, "movie_id": resolved_movie_id}}
#             )
            
#             if existing_rating:
#                 # 업데이트
#                 await db.ratings.update(
#                     where={"user_id_movie_id": {"user_id": user_id_to_use, "movie_id": resolved_movie_id}},
#                     data={"rating": rating_value},
#                 )
#             else:
#                 # 새로 생성
#                 await db.ratings.create(
#                     data={
#                         "user_id": user_id_to_use,
#                         "movie_id": resolved_movie_id,
#                         "rating": rating_value,
#                     }
#                 )
#         except Exception as e:
#             print(f"⚠️ 평점 저장 실패: {e}")
#             # 평점 실패해도 포스트 생성은 성공으로 처리

#     return {"message": "포스트 생성 완료", "post_id": created_post_id}
# # @router.post("/", status_code=201)
# # async def create_post(payload: PostCreate, current_user_id: int = Depends(get_current_user_id)):
# #     # 사용자 확인
# #     user_id_to_use = payload.user_id or current_user_id
# #     if payload.user_id and payload.user_id != current_user_id:
# #         raise HTTPException(status_code=403, detail="payload.user_id does not match authenticated user")

# #     user = await db.users.find_unique(where={"id": user_id_to_use})
# #     if not user:
# #         raise HTTPException(status_code=404, detail="작성자(사용자)를 찾을 수 없습니다.")

# #     # 영화 확인/가져오기
# #     if payload.movie_id:
# #         movie = await db.movies.find_unique(where={"id": payload.movie_id})
# #         if not movie:
# #             raise HTTPException(status_code=404, detail="대상 작품을 찾을 수 없습니다.")
# #         resolved_movie_id = int(movie.id)
# #     elif payload.tmdb_id:
# #         resolved_movie_id = await _resolve_or_import_movie(payload.tmdb_id)
# #     else:
# #         raise HTTPException(status_code=400, detail="movie_id 또는 tmdb_id 중 하나를 제공해야 합니다.")

# #     # 질문 유효성 검증 (answers + medias)
# #     answer_qids = [a.question_id for a in (payload.answers or [])]
# #     media_qids = [m.question_id for m in (payload.medias or []) if m.question_id is not None]
# #     await _ensure_valid_question_ids(answer_qids + media_qids)

# #     # 기본 질문('자유롭게 이야기를 들려주세요!')이 서버에 존재하고, 답변이 포함되어 있는지 확인
# #     main_question = await db.questions.find_first(where={"content": "자유롭게 이야기를 들려주세요!"})
# #     if not main_question:
# #         raise HTTPException(status_code=500, detail="서버에 기본 질문이 없습니다.")
# #     if not any(a.question_id == int(main_question.id) for a in (payload.answers or [])):
# #         raise HTTPException(status_code=400, detail="기본 질문인 '자유롭게 이야기를 들려주세요!'에 대한 답변이 필요합니다.")

# #     # 트랜잭션: 포스트 → 답변 → 미디어
# #     async with db.tx() as tx:
# #         # 포스트 생성 (body 컬럼 삭제됨 — 질문 답변은 answers 테이블에 저장됨)
# #         create_data = {
# #             "title": payload.title,
# #             "visibility": payload.visibility,
# #             "has_spoiler": payload.spoiler,
# #             "user": {"connect": {"id": user_id_to_use}},
# #             "movie": {"connect": {"id": resolved_movie_id}},
# #         }
# #         if payload.emojis_id:
# #             create_data["emoji"] = {"connect": {"id": payload.emojis_id}}

# #         new_post = await tx.posts.create(data=create_data)

# #         # 답변 생성
# #         if payload.answers:
# #             for a in payload.answers:
# #                 await tx.answers.create(
# #                     data={
# #                         "post_id": new_post.post_id,
# #                         "question_id": a.question_id,
# #                         "answer": a.answer,
# #                     }
# #                 )

# #         # 미디어 생성
# #         if payload.medias:
# #             for m in payload.medias:
# #                 if m.question_id is None:
# #                     raise HTTPException(status_code=400, detail="media.question_id is required by DB schema")
# #                 await tx.medias.create(
# #                     data={
# #                         "post_id": new_post.post_id,
# #                         "question_id": m.question_id,
# #                         "media_type": m.media_type,
# #                         "file_path": m.file_path,
# #                     }
# #                 )
# #         # rating 생성(선택)
# #         if payload.rating is not None:
# #             try:
# #                 # ratings has composite PK (user_id, movie_id)
# #                 # create; if exists, update
# #                 # Prisma python client doesn't have upsert in older versions; attempt create then update on conflict
# #                 rating_value = Decimal(str(payload.rating))
# #                 try:
# #                     await tx.ratings.create(
# #                         data={
# #                             "user": {"connect": {"id": user_id_to_use}},
# #                             "movie": {"connect": {"id": resolved_movie_id}},
# #                             "rating": rating_value,
# #                         }
# #                     )
# #                 except Exception:
# #                     # fallback: update existing rating
# #                     await tx.ratings.update(
# #                         where={"user_id_movie_id": {"user_id": user_id_to_use, "movie_id": resolved_movie_id}},
# #                         data={"rating": rating_value},
# #                     )
# #             except Exception:
# #                 # do not fail the whole post creation for rating problems; log and continue
# #                 pass

# #     return {"message": "포스트 생성 완료", "post_id": new_post.post_id}


# # =========================
# # 피드 (가시성 강화 + 커서)
# # =========================
# @router.get("/feed")
# async def feed(
#     cursor_created_at: Optional[str] = Query(default=None, description="이 시각 이전(ISO8601)"),
#     cursor_id: Optional[int] = Query(default=None, description="동일 시각 tie-breaker용 post_id"),
#     limit: int = Query(20, ge=1, le=100),
#     current_user_id: int = Depends(get_current_user_id),
# ):
#     or_clauses = await build_visibility_or(current_user_id)

#     where_clause: Dict[str, Any] = {"OR": or_clauses}
#     if cursor_created_at:
#         # created_at < ts OR (created_at == ts AND post_id < cursor_id)
#         try:
#             where_clause = {
#                 "AND": [
#                     {"OR": or_clauses},
#                     {
#                         "OR": [
#                             {"created_at": {"lt": cursor_created_at}},
#                             {
#                                 "AND": [
#                                     {"created_at": cursor_created_at},
#                                     {"post_id": {"lt": cursor_id or 0}},
#                                 ]
#                             },
#                         ]
#                     },
#                 ]
#             }
#         except Exception:
#             where_clause = {"AND": [{"post_id": {"lt": cursor_id or 1 << 63}}, {"OR": or_clauses}]}
#     elif cursor_id:
#         where_clause = {"AND": [{"post_id": {"lt": cursor_id}}, {"OR": or_clauses}]}

#     posts = await db.posts.find_many(
#         where=where_clause,
#         order=[{"created_at": "desc"}, {"post_id": "desc"}],
#         take=limit,
#         include={"user": True, "answers": True, "questionMedias": True, "emoji": True,  "movie": True },
#     )
#     # backfill `liked` boolean per post for current_user_id (batch)
#     try:
#         post_ids = [int(p.post_id) for p in posts]
#         if post_ids:
#             like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
#             liked_set = {int(r.post_id) for r in like_rows}
#         else:
#             liked_set = set()
#         # attach liked attribute
#         for p in posts:
#             try:
#                 val = int(p.post_id) in liked_set
#                 setattr(p, "liked", val)
#                 setattr(p, "is_liked", val)
#             except Exception:
#                 # best-effort: ignore if cannot set
#                 pass
#     except Exception:
#         # non-fatal: return posts without liked field
#         pass

#     # ensure returned objects are JSON-serializable dicts and include liked/is_liked
#     try:
#         encoded = jsonable_encoder(posts)
#         # attach liked flags to encoded dicts
#         for idx, p in enumerate(posts):
#             try:
#                 val = int(p.post_id) in liked_set
#                 encoded[idx]["liked"] = val
#                 encoded[idx]["is_liked"] = val
#             except Exception:
#                 pass
#         return encoded
#     except Exception:
#         return posts


# # =========================
# # 단건 조회 (가시성 강제)
# # =========================
# @router.get("/{post_id}")
# async def get_post(
#     post_id: int = Path(..., ge=1),
#     current_user_id: int = Depends(get_current_user_id),
# ):
#     post = await db.posts.find_unique(
#         where={"post_id": post_id},
#         include={"user": True, "answers": True, "questionMedias": True, "emoji": True, "movie": True},
#     )
#     if not post:
#         raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
#     await ensure_post_visible(post, current_user_id)
#     # attach liked boolean and return JSON-serializable dict
#     try:
#         exists = await db.likes.find_unique(where={"user_id_post_id": {"user_id": current_user_id, "post_id": post_id}})
#         val = bool(exists)
#         # encode to dict for response
#         encoded = jsonable_encoder(post)
#         encoded["liked"] = val
#         encoded["is_liked"] = val
#         return encoded
#     except Exception:
#         try:
#             return jsonable_encoder(post)
#         except Exception:
#             return post


# # =========================
# # 수정
# # =========================
# @router.patch("/{post_id}")
# async def update_post(post_id: int = Path(..., ge=1), payload: PostUpdate = Body(...)):
#     post = await db.posts.find_unique(where={"post_id": post_id})
#     if not post:
#         raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

#     if int(post.user_id) != int(payload.user_id):
#         raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

#     data: Dict[str, Any] = {}
#     if payload.title is not None:
#         data["title"] = payload.title
#     if payload.visibility is not None:
#         data["visibility"] = payload.visibility
#     if payload.spoiler is not None:
#         data["has_spoiler"] = payload.spoiler
#     if payload.emojis_id is not None:
#         if payload.emojis_id == 0:
#             data["emojis_id"] = None
#         else:
#             data["emoji"] = {"connect": {"id": payload.emojis_id}}

#     if not data:
#         return {"message": "변경할 내용이 없습니다."}

#     data["updated_at"] = datetime.utcnow()

#     updated = await db.posts.update(where={"post_id": post_id}, data=data)
#     return {"message": "수정 완료", "post": updated}


# # =========================
# # 삭제
# # =========================
# @router.delete("/{post_id}")
# async def delete_post(post_id: int = Path(..., ge=1), user_id: int = Body(...)):
#     post = await db.posts.find_unique(where={"post_id": post_id})
#     if not post:
#         raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
#     if int(post.user_id) != int(user_id):
#         raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
#     await db.posts.delete(where={"post_id": post_id})
#     return {"message": "삭제 완료"}


# # =========================
# # 특정 유저 글 목록 (가시성 적용)
# # =========================
# @router.get("/users/{user_id}/posts")
# async def list_user_posts(
#     user_id: int,
#     visibility: Optional[str] = None,
#     limit: int = Query(20, ge=1, le=100),
#     cursor_id: Optional[int] = Query(default=None),
#     current_user_id: int = Depends(get_current_user_id),
# ):
#     if visibility:
#         base: Dict[str, Any] = {"user_id": user_id, "visibility": visibility}
#     else:
#         or_clauses = await build_visibility_or(current_user_id)
#         base = {"AND": [{"user_id": user_id}, {"OR": or_clauses}]}

#     if cursor_id:
#         base = {"AND": [base, {"post_id": {"lt": cursor_id}}]}

#     rows = await db.posts.find_many(
#         where=base,
#         order={"created_at": "desc"},
#         take=limit,
#         include={"emoji": True},
#     )
#     try:
#         post_ids = [int(r.post_id) for r in rows]
#         if post_ids:
#             like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
#             liked_set = {int(r.post_id) for r in like_rows}
#         else:
#             liked_set = set()
#         encoded = jsonable_encoder(rows)
#         for idx, r in enumerate(rows):
#             try:
#                 val = int(r.post_id) in liked_set
#                 encoded[idx]["liked"] = val
#                 encoded[idx]["is_liked"] = val
#             except Exception:
#                 pass
#         return encoded
#     except Exception:
#         try:
#             return jsonable_encoder(rows)
#         except Exception:
#             return rows