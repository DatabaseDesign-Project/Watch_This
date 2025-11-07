from typing import List

from fastapi import APIRouter, HTTPException

from app.db import db

router = APIRouter()


@router.get("/")
async def list_emojis():
    """Return all available emojis for posts (simple list)."""
    try:
        rows = await db.emojis.find_many(order={"id": 'asc'})
        # Prisma returns model objects; convert to simple dicts for JSON serialization
        return [
            {"id": r.id, "name": r.name, "emoji_image": r.emoji_image}
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이모지 조회 실패: {e}")
