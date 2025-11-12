from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
import json
import httpx

from fastapi import APIRouter, HTTPException, Path, Body, Depends, Header, Query
from pydantic import Field

from app.db import db
from app.routers import movies as tmdb_mod
from app.core.deps import get_redis
from app.schemas.posts import AnswerIn, MediaIn, PostCreate, PostUpdate

router = APIRouter()

# =========================
# 개발용 인증 헬퍼 (헤더 기반)
# =========================
def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    """
    개발 도우미: 문자열로 X-User-Id 헤더를 읽고 int에 강제.
    누락/형식오류 시 401.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required for authentication in this dev mode")
    try:
        return int(x_user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="X-User-Id header must be an integer")


# 요청 스키마는 `app.schemas.posts` 로 이동했습니다.


# =========================
# Questions 캐시 (Redis + in-memory)
# =========================

# 프로세스 캐시
_QCACHE: Dict[str, Any] = {
    "ids": set(),           # type: Set[int]
    "ts": 0.0               # unix timestamp
}
_QCACHE_TTL_SEC = 600       # 10분
_QREDIS_KEY = "questions:ids"
_QREDIS_TTL_SEC = 86400     # 24시간

async def _load_questions_from_db() -> Set[int]:
    rows = await db.questions.find_many(select={"id": True})
    return {int(r.id) for r in rows}

async def _get_question_id_set() -> Set[int]:
    """
    질문 ID 집합을 반환.
    우선순위: Redis -> in-memory(유효) -> DB 쿼리(그리고 캐시 갱신).
    """
    # 1) Redis 시도
    rds = get_redis()
    if rds:
        try:
            raw = await rds.get(_QREDIS_KEY)
            if raw:
                return {int(x) for x in json.loads(raw)}
        except Exception:
            # Redis 에러는 조용히 무시하고 다음 단계로
            pass

    # 2) 프로세스 캐시 검사
    now = datetime.utcnow().timestamp()
    if _QCACHE["ts"] and (now - _QCACHE["ts"] < _QCACHE_TTL_SEC):
        ids = _QCACHE["ids"]
        if ids:
            return set(ids)

    # 3) DB에서 로드
    ids = await _load_questions_from_db()

    # 4) 캐시 갱신 (in-memory)
    _QCACHE["ids"] = set(ids)
    _QCACHE["ts"] = now

    # 5) Redis 갱신 (best-effort)
    if rds:
        try:
            await rds.setex(_QREDIS_KEY, _QREDIS_TTL_SEC, json.dumps(list(ids)))
        except Exception:
            pass

    return ids

async def _ensure_valid_question_ids(qids: List[int]) -> None:
    """
    요청에 포함된 question_id 들이 모두 유효한지 검증. 하나라도 없으면 400.
    """
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
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(url, params=merged_params, headers=headers, **kwargs)
            resp.raise_for_status()
            tmdb = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"TMDB 요청 실패: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=504, detail=f"TMDB 요청 실패: {e}")

    # parse
    title = tmdb.get("title") or tmdb.get("original_title") or "제목 없음"
    original_title = tmdb.get("original_title") or title
    rd = tmdb.get("release_date") or None
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

    # dedupe by title + release_date
    existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
    if existing:
        return int(existing.id)

    mv = await db.movies.create(
        data={
            "title": title,
            "original_title": original_title,
            "release_date": release_dt,
            "director": director or "",
            "runtime_minutes": int(runtime or 0),
            "poster_image": poster,
        }
    )
    return int(mv.id)


# =========================
# POST 생성
# =========================
@router.post("/", status_code=201)
async def create_post(payload: PostCreate, current_user_id: int = Depends(get_current_user_id)):
    # 사용자 확인
    user_id_to_use = payload.user_id or current_user_id
    if payload.user_id and payload.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="payload.user_id does not match authenticated user")

    user = await db.users.find_unique(where={"id": user_id_to_use})
    if not user:
        raise HTTPException(status_code=404, detail="작성자(사용자)를 찾을 수 없습니다.")

    # 영화 확인/가져오기
    if payload.movie_id:
        movie = await db.movies.find_unique(where={"id": payload.movie_id})
        if not movie:
            raise HTTPException(status_code=404, detail="대상 작품을 찾을 수 없습니다.")
        resolved_movie_id = int(movie.id)
    elif payload.tmdb_id:
        resolved_movie_id = await _resolve_or_import_movie(payload.tmdb_id)
    else:
        raise HTTPException(status_code=400, detail="movie_id 또는 tmdb_id 중 하나를 제공해야 합니다.")

    # 질문 유효성 검증 (answers + medias)
    answer_qids = [a.question_id for a in (payload.answers or [])]
    media_qids = [m.question_id for m in (payload.medias or []) if m.question_id is not None]
    await _ensure_valid_question_ids(answer_qids + media_qids)

    # 트랜잭션: 포스트 → 답변 → 미디어
    async with db.tx() as tx:
        # 포스트 생성
        create_data = {
            "title": payload.title,
            "visibility": payload.visibility,
            "has_spoiler": payload.spoiler,
            "user": {"connect": {"id": user_id_to_use}},
            "movie": {"connect": {"id": resolved_movie_id}},
        }
        if payload.emojis_id:
            create_data["emoji"] = {"connect": {"id": payload.emojis_id}}

        new_post = await tx.posts.create(data=create_data)

        # 답변 생성
        if payload.answers:
            for a in payload.answers:
                await tx.answers.create(
                    data={
                        "post_id": new_post.post_id,
                        "question_id": a.question_id,
                        "answer": a.answer,
                    }
                )

        # 미디어 생성
        if payload.medias:
            for m in payload.medias:
                if m.question_id is None:
                    raise HTTPException(status_code=400, detail="media.question_id is required by DB schema")
                await tx.medias.create(
                    data={
                        "post_id": new_post.post_id,
                        "question_id": m.question_id,
                        "media_type": m.media_type,
                        "file_path": m.file_path,
                    }
                )

    return {"message": "포스트 생성 완료", "post_id": new_post.post_id}


# =========================
# 피드 (친구/공개/내글)
# =========================
@router.get("/feed")
async def feed(
    cursor: Optional[int] = Query(default=None, description="previous last post_id (LT)"),
    limit: int = Query(20, ge=1, le=100),
    current_user_id: int = Depends(get_current_user_id),
):
    # 친구 ID 수집
    friends_initiated = await db.friends.find_many(where={"requester_id": current_user_id, "status": "accepted"})
    friends_received = await db.friends.find_many(where={"addressee_id": current_user_id, "status": "accepted"})
    friend_ids = [int(f.addressee_id) for f in friends_initiated] + [int(f.requester_id) for f in friends_received]

    # 가시성 필터
    or_clauses: List[Dict[str, Any]] = [{"visibility": "public"}, {"user_id": current_user_id}]
    if friend_ids:
        or_clauses.append({"visibility": "friends", "user_id": {"in": friend_ids}})

    where_clause: Dict[str, Any] = {"OR": or_clauses}
    if cursor:
        where_clause = {"AND": [{"post_id": {"lt": cursor}}, {"OR": or_clauses}]}

    posts = await db.posts.find_many(
        where=where_clause,
        order={"created_at": "desc"},
        take=limit,
        include={"user": True, "answers": True, "questionMedias": True, "emoji": True},
    )
    return posts


# =========================
# 단건 조회 (가시성 체크 TODO)
# =========================
@router.get("/{post_id}")
async def get_post(post_id: int = Path(..., ge=1)):
    post = await db.posts.find_unique(
        where={"post_id": post_id},
        include={"user": True, "answers": True, "questionMedias": True, "emoji": True},
    )
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
    # TODO: viewer 기반 가시성 체크 적용
    return post


# =========================
# 수정
# =========================
@router.patch("/{post_id}")
async def update_post(post_id: int = Path(..., ge=1), payload: PostUpdate = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    if post.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    data: Dict[str, Any] = {}
    if payload.title is not None:
        data["title"] = payload.title
    if payload.visibility is not None:
        data["visibility"] = payload.visibility
    if payload.spoiler is not None:
        data["has_spoiler"] = payload.spoiler
    # 이모지 갱신
    if payload.emojis_id is not None:
        if payload.emojis_id == 0:
            # 제거
            data["emojis_id"] = None
        else:
            data["emoji"] = {"connect": {"id": payload.emojis_id}}

    if not data:
        return {"message": "변경할 내용이 없습니다."}

    data["updated_at"] = datetime.utcnow()

    updated = await db.posts.update(where={"post_id": post_id}, data=data)
    return {"message": "수정 완료", "post": updated}


# =========================
# 삭제 (soft 미지원이면 hard)
# =========================
@router.delete("/{post_id}")
async def delete_post(post_id: int = Path(..., ge=1), user_id: int = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    # 스키마에 deleted_at이 없으므로 hard delete
    await db.posts.delete(where={"post_id": post_id})
    return {"message": "삭제 완료"}


# =========================
# 특정 유저 글 목록
# =========================
@router.get("/users/{user_id}/posts")
async def list_user_posts(user_id: int, visibility: Optional[str] = None):
    where: Dict[str, Any] = {"user_id": user_id}
    if visibility:
        where["visibility"] = visibility
    rows = await db.posts.find_many(where=where, order={"created_at": "desc"})
    return rows
