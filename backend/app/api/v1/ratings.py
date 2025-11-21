from typing import Optional, Dict, Any, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Body
from pydantic import BaseModel, Field

from app.db import db
from app.core.deps import get_current_user_id

router = APIRouter()


# =========================
# 요청/응답 스키마
# =========================

class RatingIn(BaseModel):
    rating: float = Field(..., description="0.5 ~ 5.0, 0.5 단위")


class RatingOut(BaseModel):
    movie_id: int
    user_id: int
    rating: float


class UserRatingRow(BaseModel):
    movie_id: int
    rating: float


class SummaryOut(BaseModel):
    movie_id: int
    avg: Optional[float] = None
    count: int


# =========================
# 유틸
# =========================

def _validate_rating(v: float) -> Decimal:
    # 허용: 0.5 ~ 5.0, 0.5 step
    if v is None:
        raise HTTPException(status_code=400, detail="rating 값이 필요합니다.")
    try:
        fv = float(v)
    except Exception:
        raise HTTPException(status_code=400, detail="rating 형식이 올바르지 않습니다.")
    if fv < 0.5 or fv > 5.0:
        raise HTTPException(status_code=400, detail="rating은 0.5 이상 5.0 이하여야 합니다.")
    # 0.5 step 검사
    if abs((fv * 2) - round(fv * 2)) > 1e-9:
        raise HTTPException(status_code=400, detail="rating은 0.5 단위여야 합니다.")
    # Prisma Decimal(2,1)과 호환되도록 소수1자리 고정
    return Decimal(f"{fv:.1f}")


async def _ensure_movie(movie_id: int):
    mv = await db.movies.find_unique(where={"id": movie_id})
    if not mv:
        raise HTTPException(status_code=404, detail="영화를 찾을 수 없습니다.")
    return mv


# =========================
# 별점 업서트
# =========================

@router.put("/ratings/{movie_id}", response_model=RatingOut, status_code=200)
async def upsert_rating(
    movie_id: int = Path(..., ge=1),
    payload: RatingIn = Body(...),
    user_id: int = Depends(get_current_user_id),
):
    await _ensure_movie(movie_id)
    dec = _validate_rating(payload.rating)

    # Prisma Python upsert (복합 PK where)
    try:
        row = await db.ratings.upsert(
            where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}},
            create={"user_id": user_id, "movie_id": movie_id, "rating": dec},
            update={"rating": dec},
        )
    except Exception:
        # 드라이버 버전 이슈 등으로 upsert 미지원 시 수동 처리
        existing = await db.ratings.find_unique(
            where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}}
        )
        if existing:
            row = await db.ratings.update(
                where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}},
                data={"rating": dec},
            )
        else:
            row = await db.ratings.create(
                data={"user_id": user_id, "movie_id": movie_id, "rating": dec}
            )

    return {"movie_id": int(row.movie_id), "user_id": int(row.user_id), "rating": float(row.rating)}


# =========================
# 내 별점 조회
# =========================

@router.get("/ratings/{movie_id}", response_model=RatingOut)
async def get_my_rating(
    movie_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    row = await db.ratings.find_unique(
        where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}}
    )
    if not row:
        raise HTTPException(status_code=404, detail="해당 영화에 대한 내 별점이 없습니다.")
    return {"movie_id": int(row.movie_id), "user_id": int(row.user_id), "rating": float(row.rating)}


# =========================
# 별점 삭제
# =========================

@router.delete("/ratings/{movie_id}", status_code=204)
async def delete_rating(
    movie_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    existing = await db.ratings.find_unique(
        where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}}
    )
    if not existing:
        # 멱등: 이미 없으면 OK
        return
    await db.ratings.delete(where={"user_id_movie_id": {"user_id": user_id, "movie_id": movie_id}})


# =========================
# 특정 유저의 별점 목록
# =========================

@router.get("/users/{user_id}/ratings", response_model=List[UserRatingRow])
async def list_user_ratings(
    user_id: int = Path(..., ge=1),
    limit: int = Query(50, ge=1, le=200),
    cursor_movie_id: Optional[int] = Query(None, description="이 movie_id보다 작은 항목들(역순 커서)"),
):
    where: Dict[str, Any] = {"user_id": user_id}
    if cursor_movie_id:
        where = {"AND": [where, {"movie_id": {"lt": cursor_movie_id}}]}

    rows = await db.ratings.find_many(
        where=where,
        order={"movie_id": "desc"},
        take=limit,
    )
    return [{"movie_id": int(r.movie_id), "rating": float(r.rating)} for r in rows]


# =========================
# 요약(평균/카운트)
# =========================

@router.get("/movies/{movie_id}/ratings/summary", response_model=SummaryOut)
async def rating_summary(movie_id: int = Path(..., ge=1)):
    await _ensure_movie(movie_id)
    # AVG/COUNT 집계 (numeric(2,1) → numeric → float)
    rows = await db.query_raw(
        "SELECT COUNT(*)::int AS cnt, ROUND(AVG(rating::numeric), 1) AS avg_val FROM ratings WHERE movie_id = $1",
        movie_id,
    )
    cnt = int(rows[0]["cnt"]) if rows and "cnt" in rows[0] else 0
    avg_val = rows[0]["avg_val"] if rows and "avg_val" in rows[0] else None
    avg = float(avg_val) if avg_val is not None else None
    return {"movie_id": movie_id, "avg": avg, "count": cnt}


# =========================
# 분포(히스토그램)
# =========================

@router.get("/movies/{movie_id}/ratings/distribution")
async def rating_distribution(
    movie_id: int = Path(..., ge=1),
    step: float = Query(0.5, description="버킷 간격(권장 0.5)"),
):
    await _ensure_movie(movie_id)
    # 고정 스텝에 따른 버킷 생성 (0.5 단위 전제)
    if step not in (0.5, 1.0):
        raise HTTPException(status_code=400, detail="step은 0.5 또는 1.0만 지원합니다.")

    # 전체 개별 값 카운팅
    rows = await db.query_raw(
        "SELECT rating::numeric AS rating, COUNT(*)::int AS cnt FROM ratings WHERE movie_id = $1 GROUP BY rating",
        movie_id,
    )
    count_map: Dict[str, int] = {}
    for r in rows:
        rv = float(r["rating"])
        key = f"{rv:.1f}"
        count_map[key] = int(r["cnt"])

    # 버킷 구성
    buckets: List[Dict[str, Any]] = []
    cur = 0.5
    while cur <= 5.0 + 1e-9:
        key = f"{cur:.1f}"
        buckets.append({"rating": cur, "count": count_map.get(key, 0)})
        cur += step

    return {"movie_id": movie_id, "step": step, "buckets": buckets}
