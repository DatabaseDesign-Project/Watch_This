from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, Field, EmailStr

from app.db import db

router = APIRouter()


def get_current_user_id(x_user_id: Optional[int] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required for authentication in this dev mode")
    return x_user_id


class ProfileOut(BaseModel):
    id: int
    email: EmailStr
    nickname: str
    profile_image: Optional[str]
    created_at: Optional[str]


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(None, max_length=20)
    profile_image: Optional[str] = None


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(current_user_id: int = Depends(get_current_user_id)):
    user = await db.users.find_unique(where={"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "profile_image": user.profile_image,
        "created_at": str(user.created_at) if getattr(user, "created_at", None) else None,
    }


@router.patch("/me")
async def patch_my_profile(payload: ProfileUpdate, current_user_id: int = Depends(get_current_user_id)):
    user = await db.users.find_unique(where={"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # nickname uniqueness
    if payload.nickname and payload.nickname != user.nickname:
        exists = await db.users.find_unique(where={"nickname": payload.nickname})
        if exists:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")

    update_data = {}
    if payload.nickname is not None:
        update_data["nickname"] = payload.nickname
    if payload.profile_image is not None:
        update_data["profile_image"] = payload.profile_image

    if not update_data:
        return {"message": "변경할 항목이 없습니다."}

    try:
        updated = await db.users.update(where={"id": current_user_id}, data=update_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"프로필 수정 실패: {e}")

    return {"message": "프로필이 수정되었습니다.", "user_id": updated.id}


@router.get("/{user_id}", response_model=ProfileOut)
async def get_user_public_profile(user_id: int):
    user = await db.users.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "profile_image": user.profile_image,
        "created_at": str(user.created_at) if getattr(user, "created_at", None) else None,
    }


@router.get("/")
async def search_users(nickname: Optional[str] = Query(None, min_length=1)):
    if not nickname:
        # return empty or all limited? return empty list to avoid leaking users
        return []

    rows = await db.users.find_many(where={"nickname": {"contains": nickname, "mode": "insensitive"}}, take=50)
    return [
        {"id": r.id, "nickname": r.nickname, "profile_image": r.profile_image} for r in rows
    ]
