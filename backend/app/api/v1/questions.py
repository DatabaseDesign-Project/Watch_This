from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import db

router = APIRouter()

@router.get("", response_model=list[dict])
async def list_questions(
    q: Optional[str] = Query(default=None, description="내용 검색(부분 일치)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order: str = Query("asc", pattern="^(asc|desc)$"),
):
    where = {}
    if q:
        where = {"content": {"contains": q}}

    rows = await db.questions.find_many(
        where=where,
        order={"id": order},
        take=limit,
        skip=offset,
    )
    return [{"id": r.id, "content": r.content} for r in rows]
