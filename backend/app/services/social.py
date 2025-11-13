from __future__ import annotations
from typing import Set, Optional
import time
from app.db import db
from app.core.deps import get_redis

# 프로세스 로컬 캐시 (아주 얇게)
_LOCAL_FRIENDS = {
    # user_id: (ts, set(ids))
}

_LOCAL_TTL = 30        # 30초
_REDIS_TTL = 60        # 60초
_REDIS_KEY_FMT = "friends:list:{uid}"

async def get_friend_ids(user_id: int) -> Set[int]:
    now = time.time()

    # 1) 로컬 캐시
    entry = _LOCAL_FRIENDS.get(user_id)
    if entry and (now - entry[0] < _LOCAL_TTL):
        return set(entry[1])

    # 2) Redis
    rds = get_redis()
    if rds:
        try:
            raw = await rds.get(_REDIS_KEY_FMT.format(uid=user_id))
            if raw:
                ids = {int(x) for x in raw.split(",") if x}
                _LOCAL_FRIENDS[user_id] = (now, ids)
                return ids
        except Exception:
            pass

    # 3) DB 쿼리
    initiated = await db.friends.find_many(where={"requester_id": user_id, "status": "accepted"})
    received  = await db.friends.find_many(where={"addressee_id": user_id, "status": "accepted"})
    ids = {int(r.addressee_id) for r in initiated} | {int(r.requester_id) for r in received}

    # 4) 로컬/Redis 갱신
    _LOCAL_FRIENDS[user_id] = (now, ids)
    if rds:
        try:
            await rds.setex(_REDIS_KEY_FMT.format(uid=user_id), _REDIS_TTL, ",".join(map(str, ids)))
        except Exception:
            pass

    return ids

async def are_friends(a: int, b: int) -> bool:
    if a == b:
        return True
    friends = await get_friend_ids(a)
    return b in friends
