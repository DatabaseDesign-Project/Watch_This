from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query

from app.db import db
from app.core.deps import get_current_user_id
from app.schemas.comments import CommentCreateIn, CommentUpdateIn

router = APIRouter()


# ====== 헬퍼 ======

async def _push_notification(sender_id: int, receiver_id: int, message: str):
    if sender_id == receiver_id:
        return
    try:
        await db.notifications.create(
            data={
                "sender_id": sender_id,
                "reciver_id": receiver_id,
                "type": "comment",
                "message": message[:255] if message else None,
            }
        )
    except Exception:
        # 알림 실패는 코멘트 흐름에 영향 주지 않음
        pass


def _serialize_comment_row(r) -> Dict[str, Any]:
    return {
        "id": r.id,
        "post_id": r.post_id,
        "user_id": r.user_id,
        "body": r.body,
        "parent_comment_id": r.parent_comment_id,
        "created_at": r.created_at,
    }


# ====== 작성 ======

@router.post("/posts/{post_id}/comments", status_code=201)
async def create_comment(
    post_id: int = Path(..., ge=1),
    payload: CommentCreateIn = Body(...),
    user_id: int = Depends(get_current_user_id),
):
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    parent_id = payload.parent_comment_id
    if parent_id is not None:
        parent = await db.comments.find_unique(where={"id": parent_id})
        if not parent or int(parent.post_id) != int(post_id):
            raise HTTPException(status_code=400, detail="부모 댓글이 유효하지 않습니다.")

    c = await db.comments.create(
        data={
            "post_id": post_id,
            "user_id": user_id,
            "body": payload.body,
            "parent_comment_id": parent_id,
        }
    )

    # 알림: 내 글이 아니면 생성
    await _push_notification(
        sender_id=user_id,
        receiver_id=int(post.user_id),
        message="내 게시글에 댓글이 달렸습니다.",
    )

    return {"id": c.id}


# ====== 목록 ======

@router.get("/posts/{post_id}/comments", response_model=List[Dict[str, Any]])
async def list_comments(
    post_id: int = Path(..., ge=1),
    mode: str = Query("flat", pattern="^(flat|tree)$"),
):
    rows = await db.comments.find_many(
        where={"post_id": post_id},
        order={"created_at": "asc"},
        include={"user": True},
    )
    items = [_serialize_comment_row(r) for r in rows]

    # attach minimal user info if available
    for idx, r in enumerate(rows):
        try:
            user = r.user
            items[idx]["user"] = {
                "id": int(user.id),
                "nickname": user.nickname,
                "profile_image": user.profile_image,
            } if user else None
        except Exception:
            items[idx]["user"] = None

    if mode == "flat":
        return items

    # 트리 변환
    by_id: Dict[int, Dict[str, Any]] = {}
    roots: List[Dict[str, Any]] = []
    for it in items:
        it["replies"] = []
        by_id[it["id"]] = it

    for it in items:
        pid = it["parent_comment_id"]
        if pid is None:
            roots.append(it)
        else:
            parent = by_id.get(pid)
            if parent:
                parent["replies"].append(it)
            else:
                # 부모를 못 찾으면 루트로 승격 (데이터 불일치 방어)
                roots.append(it)

    return roots


# ====== 수정 ======

@router.patch("/comments/{comment_id}", status_code=204)
async def update_comment(
    comment_id: int = Path(..., ge=1),
    payload: CommentUpdateIn = Body(...),
    user_id: int = Depends(get_current_user_id),
):
    c = await db.comments.find_unique(where={"id": comment_id})
    if not c:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if int(c.user_id) != int(user_id):
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    await db.comments.update(where={"id": comment_id}, data={"body": payload.body})


# ====== 삭제 ======

@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    c = await db.comments.find_unique(where={"id": comment_id}, include={"post": True})
    if not c:
        # 멱등 처리
        return

    # 작성자 또는 게시글 소유자만 삭제 가능
    owner_ok = int(c.user_id) == int(user_id)
    post_owner_ok = c.post and int(c.post.user_id) == int(user_id)
    if not (owner_ok or post_owner_ok):
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    # 자기참조 관계에서 자식들 먼저 제거 → 부모 제거
    async with db.tx() as tx:
        # 모든 하위(1-depth) 답글 제거
        await tx.comments.delete_many(where={"parent_comment_id": comment_id})
        # 부모 제거
        await tx.comments.delete(where={"id": comment_id})
