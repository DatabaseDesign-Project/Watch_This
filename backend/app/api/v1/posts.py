from typing import List, Optional
from datetime import datetime
import httpx

from fastapi import APIRouter, HTTPException, Path, Body, Depends, Header
from pydantic import BaseModel, Field

from app.db import db
from app.routers import movies as tmdb_mod

router = APIRouter()


def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    """개발 도우미: 문자열로 X-User-Id 헤더를 읽고 int에 강제합니다."

이렇게 하면 헤더가 존재하지만 int로 구문 분석할 수 없을 때 FastAPI가 422를 반환하는 것을 피할 수 있습니다. 누락되거나 유효하지 않은 헤더에 대해서는 실패를 명확히 하기 위해 401을 반환합니다.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required for authentication in this dev mode")
    try:
        return int(x_user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="X-User-Id header must be an integer")


class AnswerIn(BaseModel):
    question_id: int
    answer: str


class MediaIn(BaseModel):
    media_type: str
    file_path: str
    question_id: Optional[int] = None


class PostCreate(BaseModel):
    user_id: Optional[int] = None
    # Either provide an existing movie_id, or provide a tmdb_id (server will import)
    movie_id: Optional[int] = None
    tmdb_id: Optional[int] = None
    title: str = Field(..., max_length=150)
    emojis_id: Optional[int] = None
    visibility: str = Field("public")
    # Note: Prisma schema uses `has_spoiler` (boolean) and does not have watched_at.
    spoiler: bool = False
    answers: Optional[List[AnswerIn]] = None
    medias: Optional[List[MediaIn]] = None


class PostUpdate(BaseModel):
    user_id: int
    title: Optional[str]
    emojis_id: Optional[int]
    visibility: Optional[str]
    watched_at: Optional[str]
    spoiler: Optional[bool]


@router.post("/", status_code=201)
async def create_post(payload: PostCreate, current_user_id: int = Depends(get_current_user_id)):
    # Determine user: prefer header (dev-auth) but allow payload.user_id if provided and matches
    user_id_to_use = payload.user_id or current_user_id
    if payload.user_id and payload.user_id != current_user_id:
        # In dev mode we require the header to match the declared user
        raise HTTPException(status_code=403, detail="payload.user_id does not match authenticated user")

    user = await db.users.find_unique(where={"id": user_id_to_use})
    if not user:
        raise HTTPException(status_code=404, detail="작성자(사용자)를 찾을 수 없습니다.")

    # Movie resolution: accept either existing movie_id or tmdb_id to import
    resolved_movie_id = None
    if payload.movie_id:
        movie = await db.movies.find_unique(where={"id": payload.movie_id})
        if not movie:
            raise HTTPException(status_code=404, detail="대상 작품을 찾을 수 없습니다.")
        resolved_movie_id = payload.movie_id
    elif payload.tmdb_id:
        # Fetch TMDB detail and insert into movies table if not already present (dedupe by title+release_date)
        try:
            # call TMDB similarly to app.routers.movies.movie_detail
            url = f"{tmdb_mod.TMDB}/movie/{payload.tmdb_id}"
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

        # parse basic fields
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

        # try to find by title+release_date to avoid duplicates
        existing = await db.movies.find_first(where={"title": title, "release_date": release_dt})
        if existing:
            resolved_movie_id = existing.id
        else:
            try:
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
                resolved_movie_id = mv.id
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"영화 저장 실패: {e}")
    else:
        raise HTTPException(status_code=400, detail="movie_id 또는 tmdb_id 중 하나를 제공해야 합니다.")

    # create post
    try:
        # map API fields -> DB fields (Prisma schema)
        create_data = {
            "title": payload.title,
            "visibility": payload.visibility,
            "has_spoiler": payload.spoiler,
        }
        # connect relations explicitly
        create_data["user"] = {"connect": {"id": user_id_to_use}}
        create_data["movie"] = {"connect": {"id": resolved_movie_id}}
        if payload.emojis_id:
            # connect emoji relation or set scalar
            create_data["emoji"] = {"connect": {"id": payload.emojis_id}}

        new_post = await db.posts.create(data=create_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"포스트 생성 실패: {e}")

    # Answers: create or rollback on failure
    if payload.answers:
        try:
            for a in payload.answers:
                await db.answers.create(
                    data={
                        "post_id": new_post.post_id,
                        "question_id": a.question_id,
                        "answer": a.answer,
                    }
                )
        except Exception as e:
            # rollback created post
            try:
                await db.posts.delete(where={"post_id": new_post.post_id})
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=f"답변 저장 실패, 변경사항 롤백: {e}")

    # Medias: validate required fields according to Prisma schema
    if payload.medias:
        try:
            for m in payload.medias:
                if m.question_id is None:
                    raise ValueError("media.question_id is required by DB schema")
                await db.medias.create(
                    data={
                        "post_id": new_post.post_id,
                        "media_type": m.media_type,
                        "file_path": m.file_path,
                        "question_id": m.question_id,
                    }
                )
        except Exception as e:
            # rollback created post and answers
            try:
                await db.answers.delete_many(where={"post_id": new_post.post_id})
            except Exception:
                pass
            try:
                await db.posts.delete(where={"post_id": new_post.post_id})
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=f"미디어 저장 실패, 변경사항 롤백: {e}")

    return {"message": "포스트 생성 완료", "post_id": new_post.post_id}


@router.get("/feed")
async def feed(
    cursor: Optional[int] = None,
    limit: int = 20,
    current_user_id: int = Depends(get_current_user_id),
):
    """
    Feed for the current user: includes
      - public posts
      - friends-only posts written by accepted friends
      - the user's own posts (including private)

    Cursor: post_id less-than for paging (assumes descending created_at order).
    """
    # 1) collect friend ids where status == accepted
    friends_initiated = await db.friends.find_many(where={"requester_id": current_user_id, "status": "accepted"})
    friends_received = await db.friends.find_many(where={"addressee_id": current_user_id, "status": "accepted"})
    friend_ids = [f.addressee_id for f in friends_initiated] + [f.requester_id for f in friends_received]

    # 2) build visibility filter
    or_clauses = [{"visibility": "public"}, {"user_id": current_user_id}]
    if friend_ids:
        or_clauses.append({"visibility": "friends", "user_id": {"in": friend_ids}})

    where_clause = {"OR": or_clauses}
    if cursor:
        where_clause = {"AND": [{"post_id": {"lt": cursor}}, where_clause]}

    posts = await db.posts.find_many(where=where_clause, order={"created_at": 'desc'}, take=limit, include={
        "user": True,
        "answers": True,
        "questionMedias": True,
        "emoji": True,
    })
    return posts


@router.get("/{post_id}")
async def get_post(post_id: int = Path(..., ge=1)):
    post = await db.posts.find_unique(where={"post_id": post_id}, include={
        "user": True,
        "answers": True,
        "questionMedias": True,
        "emoji": True,
    })
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    # visibility checks would normally require the current viewer id; for now
    # return the post as-is and let the caller enforce access control.
    return post


@router.patch("/{post_id}")
async def update_post(post_id: int = Path(..., ge=1), payload: PostUpdate = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    # ownership check: simple: require payload.user_id to match
    if post.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    update_data = {}
    for fld in ("title", "emojis_id", "visibility", "watched_at", "spoiler"):
        v = getattr(payload, fld)
        if v is not None:
            update_data[fld] = v

    if not update_data:
        return {"message": "변경할 내용이 없습니다."}

    # auto-update updated_at if present
    try:
        update_data["updated_at"] = datetime.utcnow()
        updated = await db.posts.update(where={"post_id": post_id}, data=update_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"포스트 수정 실패: {e}")

    return {"message": "수정 완료", "post": updated}


@router.delete("/{post_id}")
async def delete_post(post_id: int = Path(..., ge=1), user_id: int = Body(...)):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")
    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    # Try soft delete if column exists, otherwise hard delete
    try:
        # attempt to set deleted_at
        try:
            await db.posts.update(where={"post_id": post_id}, data={"deleted_at": datetime.utcnow()})
            return {"message": "삭제 처리(soft) 완료"}
        except Exception:
            # fallback to hard delete
            await db.posts.delete(where={"post_id": post_id})
            return {"message": "삭제 완료"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"포스트 삭제 실패: {e}")


@router.get("/users/{user_id}/posts")
async def list_user_posts(user_id: int, visibility: Optional[str] = None):
    # basic listing; visibility filter optional
    where = {"user_id": user_id}
    if visibility:
        where["visibility"] = visibility
    rows = await db.posts.find_many(where=where, order={"created_at": 'desc'})
    return rows


@router.get("/feed")
async def feed(
    cursor: Optional[int] = None,
    limit: int = 20,
    current_user_id: int = Depends(get_current_user_id),
):
    """
    Feed for the current user: includes
      - public posts
      - friends-only posts written by accepted friends
      - the user's own posts (including private)

    Cursor: post_id less-than for paging (assumes descending created_at order).
    """
    # 1) collect friend ids where status == accepted
    friends_initiated = await db.friends.find_many(where={"requester_id": current_user_id, "status": "accepted"})
    friends_received = await db.friends.find_many(where={"addressee_id": current_user_id, "status": "accepted"})
    friend_ids = [f.addressee_id for f in friends_initiated] + [f.requester_id for f in friends_received]

    # 2) build visibility filter
    or_clauses = [{"visibility": "public"}, {"user_id": current_user_id}]
    if friend_ids:
        or_clauses.append({"visibility": "friends", "user_id": {"in": friend_ids}})

    where_clause = {"OR": or_clauses}
    if cursor:
        where_clause = {"AND": [{"post_id": {"lt": cursor}}, where_clause]}

    posts = await db.posts.find_many(where=where_clause, order={"created_at": 'desc'}, take=limit, include={
        "user": True,
        "answers": True,
        "questionMedias": True,
        "emoji": True,
    })
    return posts
