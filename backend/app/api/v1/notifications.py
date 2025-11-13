from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body

from app.db import db
from app.core.deps import get_current_user_id

router = APIRouter()

# ============ 헬퍼 ============

def _serialize_noti(row) -> Dict[str, Any]:
    return {
        "id": int(row.id),
        "type": row.type,
        "message": row.message,
        "is_read": bool(row.is_read),
        "created_at": row.created_at,
        "sender": (
            {
                "id": int(row.sender.id),
                "nickname": row.sender.nickname,
                "profile_image": row.sender.profile_image,
            } if row.sender else None
        ),
    }

# ============ 목록 ============

@router.get("/notifications")
async def list_notifications(
    is_read: Optional[bool] = Query(None, description="읽음 여부 필터"),
    limit: int = Query(20, ge=1, le=100),
    cursor_id: Optional[int] = Query(None, description="이 ID보다 작은 알림들"),
    current_user_id: int = Depends(get_current_user_id),
):
    """
    내 알림들을 최신순으로 반환. 커서는 id LT 기준.
    """
    where: Dict[str, Any] = {"reciver_id": current_user_id}
    if is_read is not None:
        where["is_read"] = is_read
    if cursor_id:
        where = {"AND": [where, {"id": {"lt": cursor_id}}]}

    rows = await db.notifications.find_many(
        where=where,
        take=limit,
        order={"id": "desc"},
        include={"sender": True},  # 발신자 간단 정보
    )
    return [_serialize_noti(r) for r in rows]

# ============ 단건 읽음 처리 ============

@router.patch("/notifications/{noti_id}/read", status_code=204)
async def mark_read(
    noti_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    noti = await db.notifications.find_unique(where={"id": noti_id})
    if not noti or int(noti.reciver_id) != int(current_user_id):
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없거나 권한이 없습니다.")

    if noti.is_read:
        return
    await db.notifications.update(where={"id": noti_id}, data={"is_read": True})

# ============ 일괄 읽음 처리 ============

@router.post("/notifications/read", status_code=204)
async def mark_all_read(
    current_user_id: int = Depends(get_current_user_id),
    older_than_id: Optional[int] = Body(default=None, embed=True, description="이 ID 이하만 읽음 처리"),
):
    """
    내 알림을 일괄 읽음 처리. older_than_id가 주어지면 그 이하만 처리.
    """
    where: Dict[str, Any] = {"reciver_id": current_user_id, "is_read": False}
    if older_than_id:
        where = {"AND": [where, {"id": {"lte": older_than_id}}]}
    await db.notifications.update_many(where=where, data={"is_read": True})

# ============ 삭제 ============

@router.delete("/notifications/{noti_id}", status_code=204)
async def delete_notification(
    noti_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    noti = await db.notifications.find_unique(where={"id": noti_id})
    if not noti or int(noti.reciver_id) != int(current_user_id):
        # 멱등 처리
        return
    await db.notifications.delete(where={"id": noti_id})
