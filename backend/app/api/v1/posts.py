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
    # 1. tmdb_id로 먼저 조회 (가장 정확한 방법)
    existing = await db.movies.find_first(where={"tmdb_id": payload_tmdb_id})
    if existing:
        return int(existing.id)
    
    # 2. TMDB API에서 영화 정보 가져오기
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

    # 3. 제목과 개봉일로 기존 영화 재확인 (tmdb_id가 없는 기존 데이터 대응)
    existing = await db.movies.find_first(
        where={
            "AND": [
                {
                    "OR": [
                        {"title": title},
                        {"original_title": original_title},
                        {"title": original_title},
                    ]
                },
                {"release_date": release_dt}
            ]
        }
    )
    
    # 4. 기존 영화가 있으면 tmdb_id 업데이트 후 반환
    if existing:
        if existing.tmdb_id is None:
            await db.movies.update(
                where={"id": int(existing.id)},
                data={"tmdb_id": payload_tmdb_id}
            )
        return int(existing.id)

    # 5. 새 영화 생성 (tmdb_id 포함, 장르 포함)
    # 장르 처리 (최대 5개)
    genre_ids = tmdb.get("genres") or []
    # genre_map 가져오기 (redis 없이)
    try:
        genre_map = await tmdb_mod.get_genre_map(None, lang="ko-KR")
    except Exception:
        genre_map = {}
    
    genre_names = []
    for g in genre_ids:
        gid = g.get("id")
        if gid and gid in genre_map:
            genre_names.append(genre_map[gid])
        if len(genre_names) >= 5:
            break
    
    # genre1은 필수, 없으면 "미분류"
    create_data = {
        "tmdb_id": payload_tmdb_id,
        "title": title,
        "original_title": original_title,
        "release_date": release_dt,
        "director": director or "",
        "runtime_minutes": int(runtime or 0),
        "poster_image": poster,
        "genre1": genre_names[0] if len(genre_names) > 0 else "미분류",
    }
    if len(genre_names) > 1:
        create_data["genre2"] = genre_names[1]
    if len(genre_names) > 2:
        create_data["genre3"] = genre_names[2]
    if len(genre_names) > 3:
        create_data["genre4"] = genre_names[3]
    if len(genre_names) > 4:
        create_data["genre5"] = genre_names[4]

    mv = await db.movies.create(data=create_data)
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
        
        if payload.watch_date:
            create_data["watch_date"] = payload.watch_date
        
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
    # 1. 친구 목록 조회
    friend_ids = await get_friend_ids(current_user_id)
    
    # 2. 내 게시물 + 친구의 게시물 조회 (private는 내 것만 포함)
    # 내 게시물: 모든 visibility 포함
    # 친구 게시물: private 제외
    user_ids_to_show = list(friend_ids) + [current_user_id]
    
    base_conditions = [
        {"user_id": {"in": user_ids_to_show}},
        {
            "OR": [
                {"user_id": current_user_id},  # 내 게시물은 모두 표시
                {"visibility": {"not": "private"}}  # 친구 게시물은 private 제외
            ]
        }
    ]
    
    if cursor_created_at:
        try:
            where_clause = {
                "AND": base_conditions + [
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
            where_clause = {"AND": base_conditions}
    elif cursor_id:
        where_clause = {"AND": base_conditions + [{"post_id": {"lt": cursor_id}}]}
    else:
        where_clause = {"AND": base_conditions}

    posts = await db.posts.find_many(
        where=where_clause,
        order=[{"created_at": "desc"}, {"post_id": "desc"}],
        take=limit,
        include={
            "user": True,
            "answers": {"include": {"question": True}},
            "questionMedias": True,
            "emoji": True,
            "movie": True,
        },
    )

    try:
        post_ids = [int(p.post_id) for p in posts]
        liked_set = set()
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}

        # 모든 포스트의 평점 정보 배치 조회 (N+1 쿼리 문제 해결)
        rating_map = {}
        if posts:
            user_ids = list(set(int(p.user_id) for p in posts))
            movie_ids = list(set(int(p.movie_id) for p in posts if p.movie_id))

            if user_ids and movie_ids:
                # 한 번의 쿼리로 모든 평점 조회
                all_ratings = await db.ratings.find_many(
                    where={
                        "AND": [
                            {"user_id": {"in": user_ids}},
                            {"movie_id": {"in": movie_ids}}
                        ]
                    }
                )
                # 맵으로 변환
                for r in all_ratings:
                    rating_map[(int(r.user_id), int(r.movie_id))] = float(r.rating)

        encoded = jsonable_encoder(posts)
        for idx, p in enumerate(posts):
            val = int(p.post_id) in liked_set
            encoded[idx]["liked"] = val
            encoded[idx]["is_liked"] = val

            # 평점 추가
            user_id = int(p.user_id)
            movie_id = int(p.movie_id) if p.movie_id else None
            if movie_id and (user_id, movie_id) in rating_map:
                encoded[idx]["rating"] = rating_map[(user_id, movie_id)]

            # 장르 정보를 movie 객체에 추가 (genre1~5 컬럼 사용)
            if encoded[idx].get("movie"):
                movie_data = encoded[idx]["movie"]
                genres = []
                for i in range(1, 6):
                    g = movie_data.get(f"genre{i}")
                    if g:
                        genres.append(g)
                encoded[idx]["movie"]["genres"] = [{"name": g} for g in genres]
                encoded[idx]["movie"]["genre"] = ", ".join(genres) if genres else None

        return encoded
    except Exception as e:
        print(f"⚠️ 피드 조회 에러: {e}")
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
        include={
            "user": True,
            "answers": {"include": {"question": True}},
            "questionMedias": True,
            "emoji": True,
            "movie": True,
            "comments": True,
        },
    )
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    await ensure_post_visible(post, current_user_id)

    try:
        # 좋아요 정보 조회
        exists = await db.likes.find_unique(where={"user_id_post_id": {"user_id": current_user_id, "post_id": post_id}})
        val = bool(exists)

        # 평점 정보 조회
        rating_record = None
        if post.movie_id:
            rating_record = await db.ratings.find_unique(
                where={"user_id_movie_id": {"user_id": int(post.user_id), "movie_id": int(post.movie_id)}}
            )

        encoded = jsonable_encoder(post)
        encoded["liked"] = val
        encoded["is_liked"] = val

        # 평점 추가
        if rating_record:
            encoded["rating"] = float(rating_record.rating)

        # 장르 정보를 movie 객체에 추가 (genre1~5 컬럼 사용)
        if encoded.get("movie"):
            movie_data = encoded["movie"]
            genres = []
            for i in range(1, 6):
                g = movie_data.get(f"genre{i}")
                if g:
                    genres.append(g)
            encoded["movie"]["genres"] = [{"name": g} for g in genres]
            encoded["movie"]["genre"] = ", ".join(genres) if genres else None

        return encoded
    except Exception as e:
        print(f"⚠️ 포스트 상세 조회 에러: {e}")
        return post


# =========================
# 수정
# =========================
# 수정
# =========================
@router.patch("/{post_id}")
async def update_post(post_id: int = Path(..., ge=1), payload: PostUpdate = Body(...)):
    """
    포스트 수정 - 영화를 제외한 모든 항목 수정 가능
    - 기본 정보: title, visibility, spoiler, emojis_id
    - 평점: rating (ratings 테이블)
    - 답변: answers (기존 답변 삭제 후 새로 생성, default question은 삭제 불가)
    - 미디어: medias (기존 미디어 삭제 후 새로 생성)
    """
    post = await db.posts.find_unique(
        where={"post_id": post_id},
        include={"answers": True, "questionMedias": True}
    )
    if not post:
        raise HTTPException(status_code=404, detail="존재하지 않는 포스트입니다.")

    if int(post.user_id) != int(payload.user_id):
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    # 1. 기본 포스트 정보 수정
    post_data: Dict[str, Any] = {}
    if payload.title is not None:
        post_data["title"] = payload.title
    if payload.watch_date is not None:
        post_data["watch_date"] = payload.watch_date
    if payload.visibility is not None:
        post_data["visibility"] = payload.visibility
    if payload.spoiler is not None:
        post_data["has_spoiler"] = payload.spoiler
    if payload.emojis_id is not None:
        if payload.emojis_id == 0:
            post_data["emojis_id"] = None
        else:
            post_data["emoji"] = {"connect": {"id": payload.emojis_id}}

    post_data["updated_at"] = datetime.utcnow()

    if post_data:
        await db.posts.update(where={"post_id": post_id}, data=post_data)

    # 2. 평점 수정
    if payload.rating is not None:
        try:
            rating_value = Decimal(str(payload.rating))
            movie_id = int(post.movie_id)
            user_id = int(post.user_id)
            
            existing_rating = await db.ratings.find_unique(
                where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}}
            )
            
            if existing_rating:
                await db.ratings.update(
                    where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}},
                    data={"rating": rating_value}
                )
            else:
                await db.ratings.create(
                    data={"user_id": user_id, "movie_id": movie_id, "rating": rating_value}
                )
        except Exception as e:
            print(f"⚠️ 평점 수정 실패: {e}")

    # 3. 답변 수정 (기존 삭제 후 새로 생성)
    if payload.answers is not None:
        # 질문 ID 유효성 검증
        answer_qids = [a.question_id for a in payload.answers]
        await _ensure_valid_question_ids(answer_qids)
        
        # 기본 질문 확인 (자유롭게 작성하는 질문)
        main_question = await db.questions.find_first(where={"content": {"contains": "자유롭게"}})
        main_question_id = int(main_question.id) if main_question else None
        
        # 기존 답변 중 기본 질문이 아닌 것만 확인
        existing_answer_qids = [int(a.question_id) for a in post.answers] if post.answers else []
        
        # 기본 질문이 삭제되는지 확인
        if main_question_id:
            has_main_in_existing = main_question_id in existing_answer_qids
            has_main_in_new = main_question_id in answer_qids
            
            if has_main_in_existing and not has_main_in_new:
                raise HTTPException(status_code=400, detail="기본 질문(자유롭게 작성)은 삭제할 수 없습니다.")
        
        # 기존 답변 모두 삭제
        if post.answers:
            for answer in post.answers:
                try:
                    await db.answers.delete(
                        where={"post_id_question_id": {"post_id": post_id, "question_id": int(answer.question_id)}}
                    )
                except Exception as e:
                    print(f"⚠️ 기존 답변 삭제 실패 (question_id={answer.question_id}): {e}")
        
        # 새 답변 생성
        for a in payload.answers:
            try:
                await db.answers.create(
                    data={
                        "post_id": post_id,
                        "question_id": a.question_id,
                        "answer": a.answer,
                    }
                )
            except Exception as e:
                print(f"⚠️ 답변 생성 실패 (question_id={a.question_id}): {e}")

    # 4. 미디어 수정 (기존 삭제 후 새로 생성)
    if payload.medias is not None:
        # 질문 ID 유효성 검증
        media_qids = [m.question_id for m in payload.medias if m.question_id is not None]
        await _ensure_valid_question_ids(media_qids)
        
        # 기존 미디어 모두 삭제
        if post.questionMedias:
            for media in post.questionMedias:
                try:
                    await db.medias.delete(where={"id": int(media.id)})
                except Exception as e:
                    print(f"⚠️ 기존 미디어 삭제 실패 (id={media.id}): {e}")
        
        # 새 미디어 생성
        for m in payload.medias:
            if m.question_id is None:
                continue
            try:
                await db.medias.create(
                    data={
                        "post_id": post_id,
                        "question_id": m.question_id,
                        "media_type": m.media_type,
                        "file_path": m.file_path,
                    }
                )
            except Exception as e:
                print(f"⚠️ 미디어 생성 실패: {e}")

    # 수정된 포스트 반환
    updated = await db.posts.find_unique(
        where={"post_id": post_id},
        include={
            "user": True,
            "answers": {"include": {"question": True}},
            "questionMedias": True,
            "emoji": True,
            "movie": True,
        }
    )
    
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
        include={
            "user": True,
            "answers": {"include": {"question": True}},
            "questionMedias": True,
            "emoji": True,
            "movie": True,
        },
    )

    try:
        post_ids = [int(r.post_id) for r in rows]
        liked_set = set()
        if post_ids:
            like_rows = await db.likes.find_many(where={"user_id": current_user_id, "post_id": {"in": post_ids}})
            liked_set = {int(r.post_id) for r in like_rows}

        # 모든 포스트의 평점 정보 배치 조회 (N+1 쿼리 문제 해결)
        rating_map = {}
        if rows:
            user_ids = list(set(int(r.user_id) for r in rows))
            movie_ids = list(set(int(r.movie_id) for r in rows if r.movie_id))

            if user_ids and movie_ids:
                # 한 번의 쿼리로 모든 평점 조회
                all_ratings = await db.ratings.find_many(
                    where={
                        "AND": [
                            {"user_id": {"in": user_ids}},
                            {"movie_id": {"in": movie_ids}}
                        ]
                    }
                )
                # 맵으로 변환
                for r in all_ratings:
                    rating_map[(int(r.user_id), int(r.movie_id))] = float(r.rating)

        encoded = jsonable_encoder(rows)
        for idx, r in enumerate(rows):
            val = int(r.post_id) in liked_set
            encoded[idx]["liked"] = val
            encoded[idx]["is_liked"] = val

            # 평점 추가
            uid = int(r.user_id)
            mid = int(r.movie_id) if r.movie_id else None
            if mid and (uid, mid) in rating_map:
                encoded[idx]["rating"] = rating_map[(uid, mid)]

            # 장르 정보를 movie 객체에 추가 (genre1~5 컬럼 사용)
            if encoded[idx].get("movie"):
                movie_data = encoded[idx]["movie"]
                genres = []
                for i in range(1, 6):
                    g = movie_data.get(f"genre{i}")
                    if g:
                        genres.append(g)
                encoded[idx]["movie"]["genres"] = [{"name": g} for g in genres]
                encoded[idx]["movie"]["genre"] = ", ".join(genres) if genres else None

        return encoded
    except Exception as e:
        print(f"⚠️ 유저 포스트 목록 조회 에러: {e}")
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
