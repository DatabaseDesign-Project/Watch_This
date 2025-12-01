from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.db import db
from app.core.deps import get_current_user_id

router = APIRouter()

# ====== 알림 best-effort ======
async def _push_like_notification(sender_id: int, receiver_id: int, post_id: int):
    if sender_id == receiver_id:
        return
    try:
        await db.notifications.create(
            data={
                "sender_id": sender_id,
                "reciver_id": receiver_id,
                "type": "like",
                "message": f"post_id:{post_id}",
            }
        )
    except Exception:
        # 알림 실패는 좋아요 흐름에 영향 X
        pass


# ====== 좋아요(멱등) ======
@router.post("/posts/{post_id}/like", status_code=204)
async def like_post(
    post_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    async with db.tx() as tx:
        # 이미 좋아요면 아무 것도 안 함 (멱등)
        exists = await tx.likes.find_unique(
            where={"user_id_post_id": {"user_id": user_id, "post_id": post_id}}
        )
        if exists:
            return

        # 이벤트 1건 삽입
        await tx.likes.create(data={"user_id": user_id, "post_id": post_id})

        # like_cnt 원자 증가 (지원되지 않으면 fallback)
        try:
            await tx.posts.update(
                where={"post_id": post_id},
                data={"like_cnt": {"increment": 1}},
            )
        except Exception:
            # 드라이버/버전 상 increment 미지원 시 안전한 fallback
            fresh = await tx.posts.find_unique(where={"post_id": post_id})
            new_cnt = int(getattr(fresh, "like_cnt", 0)) + 1
            await tx.posts.update(where={"post_id": post_id}, data={"like_cnt": new_cnt})

    await _push_like_notification(sender_id=user_id, receiver_id=int(post.user_id), post_id=post_id)


# ====== 좋아요 취소(멱등) ======
@router.delete("/posts/{post_id}/like", status_code=204)
async def unlike_post(
    post_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    async with db.tx() as tx:
        exists = await tx.likes.find_unique(
            where={"user_id_post_id": {"user_id": user_id, "post_id": post_id}}
        )
        if not exists:
            # 이미 좋아요가 없으면 아무 것도 안 함 (멱등)
            return

        await tx.likes.delete(
            where={"user_id_post_id": {"user_id": user_id, "post_id": post_id}}
        )

        # like_cnt 원자 감소 (바닥 0)
        try:
            await tx.posts.update(
                where={"post_id": post_id},
                data={"like_cnt": {"decrement": 1}},
            )
        except Exception:
            fresh = await tx.posts.find_unique(where={"post_id": post_id})
            new_cnt = max(0, int(getattr(fresh, "like_cnt", 0)) - 1)
            await tx.posts.update(where={"post_id": post_id}, data={"like_cnt": new_cnt})


# ====== 좋아요한 사용자 목록(옵션) ======
@router.get("/posts/{post_id}/likes")
async def list_post_likes(
    post_id: int = Path(..., ge=1),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    with_user: bool = Query(False, description="유저 프로필 포함 여부"),
):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    rows = await db.likes.find_many(
        where={"post_id": post_id},
        order={"created_at": "desc"},
        take=limit,
        skip=offset,
        include={"user": True} if with_user else None,
    )

    if with_user:
        return [
            {
                "user_id": int(r.user_id),
                "created_at": r.created_at,
                "user": {
                    "id": int(r.user.id),
                    "nickname": r.user.nickname,
                    "profile_image": r.user.profile_image,
                } if r.user else None,
            }
            for r in rows
        ]

    return [{"user_id": int(r.user_id), "created_at": r.created_at} for r in rows]
