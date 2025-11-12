from typing import Dict, Any, List
from app.services.social import are_friends, get_friend_ids

async def ensure_post_visible(post: Any, viewer_id: int) -> None:
    """
    posts.visibility: public | friends | private
    작성자 == viewer 이면 항상 OK
    friends 는 서로 친구여야 OK
    """
    vis = getattr(post, "visibility", None)
    author_id = int(getattr(post, "user_id"))
    if vis == "public":
        return
    if author_id == int(viewer_id):
        return
    if vis == "friends":
        if await are_friends(author_id, viewer_id):
            return
    # private 또는 친구 아님
    from fastapi import HTTPException
    raise HTTPException(status_code=403, detail="가시성 정책에 의해 접근할 수 없습니다.")

async def build_visibility_or(viewer_id: int) -> List[Dict[str, Any]]:
    """
    쿼리 where절에 넣을 OR 리스트 구성:
    - public
    - viewer 본인
    - viewer의 친구 + friends 가시성
    """
    friend_ids = await get_friend_ids(viewer_id)
    or_clauses: List[Dict[str, Any]] = [{"visibility": "public"}, {"user_id": viewer_id}]
    if friend_ids:
        or_clauses.append({"visibility": "friends", "user_id": {"in": list(friend_ids)}})
    return or_clauses
