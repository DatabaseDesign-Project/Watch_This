from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body

from app.db import db
from app.core.deps import get_current_user_id

router = APIRouter()


def _serialize_user(row) -> Dict[str, Any]:
    return {
        "id": int(row.id),
        "email": row.email,
        "nickname": row.nickname,
        "profile_image": row.profile_image,
    }


def _serialize_request(row) -> Dict[str, Any]:
    return {
        "requester": _serialize_user(row.requester),
        "addressee": _serialize_user(row.addressee),
        "status": row.status,
        "created_at": row.created_at,
        "responded_at": row.responded_at,
    }


@router.post("/friends/requests", status_code=201)
async def send_friend_request(
    user_id: Optional[int] = Body(default=None, embed=True, description="대상 유저 ID"),
    email: Optional[str] = Body(default=None, embed=True, description="대상 이메일 (user_id 대신 사용 가능)"),
    current_user_id: int = Depends(get_current_user_id),
):
    """
    친구 요청을 보낸다. user_id 또는 email 중 하나를 제공.
    """
    if not user_id and not email:
        raise HTTPException(status_code=400, detail="user_id 또는 email 중 하나를 제공해야 합니다.")

    # resolve target user
    target = None
    if user_id:
        target = await db.users.find_unique(where={"id": int(user_id)})
    else:
        target = await db.users.find_unique(where={"email": email})

    if not target:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")

    if int(target.id) == int(current_user_id):
        raise HTTPException(status_code=400, detail="자기 자신에게 친구 요청을 보낼 수 없습니다.")

    # ensure no existing accepted relationship
    exists = await db.friends.find_unique(where={"requester_id_addressee_id": {"requester_id": current_user_id, "addressee_id": int(target.id)}})
    if exists:
        # if already pending/accepted, return informative response
        raise HTTPException(status_code=400, detail=f"이미 요청이 존재합니다 (status={exists.status}).")

    # also check inverse (target previously requested current user)
    inverse = await db.friends.find_unique(where={"requester_id_addressee_id": {"requester_id": int(target.id), "addressee_id": current_user_id}})
    if inverse:
        if inverse.status == "pending":
            # accept the existing inverse request automatically
            updated = await db.friends.update(
                where={"requester_id_addressee_id": {"requester_id": int(target.id), "addressee_id": current_user_id}},
                data={"status": "accepted", "responded_at": datetime.utcnow()},
            )
            # notify original requester (which is target) that their request was accepted
            await db.notifications.create(
                data={
                    "sender_id": current_user_id,
                    "reciver_id": int(target.id),
                    "type": "friend_request",
                    "message": "친구 요청이 수락되었습니다.",
                }
            )
            return {"message": "상대방이 보낸 요청을 수락했습니다."}
        else:
            raise HTTPException(status_code=400, detail="이미 친구 관계입니다.")

    # create new friend request
    try:
        created = await db.friends.create(
            data={
                "requester_id": current_user_id,
                "addressee_id": int(target.id),
                "status": "pending",
            },
            include={"requester": True, "addressee": True},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"친구 요청 생성 실패: {e}")

    # create notification for target
    try:
        await db.notifications.create(
            data={
                "sender_id": current_user_id,
                "reciver_id": int(target.id),
                "type": "friend_request",
                "message": "새로운 친구 요청이 도착했습니다.",
            }
        )
    except Exception:
        # notification failure shouldn't block the main flow
        pass

    return _serialize_request(created)


@router.get("/friends/requests")
async def list_requests(
    box: str = Query("in", regex="^(in|out)$"),
    current_user_id: int = Depends(get_current_user_id),
):
    """box=in => 받은 요청 (내가 수락 대상), box=out => 내가 보낸 요청"""
    if box == "in":
        rows = await db.friends.find_many(where={"addressee_id": current_user_id, "status": "pending"}, include={"requester": True, "addressee": True}, order={"created_at": "desc"})
        return [_serialize_request(r) for r in rows]
    else:
        rows = await db.friends.find_many(where={"requester_id": current_user_id, "status": "pending"}, include={"requester": True, "addressee": True}, order={"created_at": "desc"})
        return [_serialize_request(r) for r in rows]


@router.post("/friends/requests/{requester_id}/accept")
async def accept_request(
    requester_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    # current_user is the addressee
    fr = await db.friends.find_unique(where={"requester_id_addressee_id": {"requester_id": requester_id, "addressee_id": current_user_id}})
    if not fr or fr.status != "pending":
        raise HTTPException(status_code=404, detail="수락할 친구 요청을 찾을 수 없습니다.")

    updated = await db.friends.update(
        where={"requester_id_addressee_id": {"requester_id": requester_id, "addressee_id": current_user_id}},
        data={"status": "accepted", "responded_at": datetime.utcnow()},
        include={"requester": True, "addressee": True},
    )

    # notify requester
    try:
        await db.notifications.create(
            data={
                "sender_id": current_user_id,
                "reciver_id": int(requester_id),
                "type": "friend_request",
                "message": "친구 요청이 수락되었습니다.",
            }
        )
    except Exception:
        pass

    return _serialize_request(updated)


@router.post("/friends/requests/{requester_id}/reject", status_code=204)
async def reject_request(
    requester_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    fr = await db.friends.find_unique(where={"requester_id_addressee_id": {"requester_id": requester_id, "addressee_id": current_user_id}})
    if not fr:
        # idempotent
        return
    # delete the pending request
    await db.friends.delete(where={"requester_id_addressee_id": {"requester_id": requester_id, "addressee_id": current_user_id}})
    return


@router.delete("/friends/{other_user_id}", status_code=204)
async def delete_friend(
    other_user_id: int = Path(..., ge=1),
    current_user_id: int = Depends(get_current_user_id),
):
    # remove either direction
    # try direct where current_user was requester
    key1 = {"requester_id_addressee_id": {"requester_id": current_user_id, "addressee_id": other_user_id}}
    key2 = {"requester_id_addressee_id": {"requester_id": other_user_id, "addressee_id": current_user_id}}

    row = await db.friends.find_unique(where=key1)
    if row:
        await db.friends.delete(where=key1)
        return

    row2 = await db.friends.find_unique(where=key2)
    if row2:
        await db.friends.delete(where=key2)
        return

    # nothing to do
    return


@router.get("/friends")
async def list_friends(current_user_id: int = Depends(get_current_user_id)):
    # accepted where requester=current_user OR addressee=current_user
    rows1 = await db.friends.find_many(where={"requester_id": current_user_id, "status": "accepted"}, include={"addressee": True})
    rows2 = await db.friends.find_many(where={"addressee_id": current_user_id, "status": "accepted"}, include={"requester": True})

    friends = []
    for r in rows1:
        friends.append(_serialize_user(r.addressee))
    for r in rows2:
        friends.append(_serialize_user(r.requester))

    return friends
