from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.follow import FollowItem
from app.services.follow import (
    follow_user,
    unfollow_user,
    get_followers,
    get_following,
)
from app.models.follow import Follow
from app.models.user import User

router = APIRouter()


@router.post("/users/{user_id}/follow", response_model=Result)
async def follow_user_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Follow a user."""
    ok = await follow_user(db, current_user_id, user_id)
    if not ok:
        return Result(code=1404, message="关注失败（用户不存在、已关注或不能关注自己）")
    return Result(code=0, message="success")


@router.delete("/users/{user_id}/follow", response_model=Result)
async def unfollow_user_endpoint(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Unfollow a user."""
    ok = await unfollow_user(db, current_user_id, user_id)
    if not ok:
        return Result(code=1404, message="取消关注失败（未关注该用户）")
    return Result(code=0, message="success")


async def _load_follow_items(
    db: AsyncSession,
    follows: list[Follow],
    is_follower_list: bool,
    *,
    current_user_id: UUID,
) -> list[dict]:
    """Load Follow records with associated user info and follow status."""
    user_ids = [
        (f.follower_id if is_follower_list else f.following_id) for f in follows
    ]

    # Load user info batch
    user_rows = {}
    if user_ids:
        result = await db.execute(
            select(User).where(
                User.id.in_(user_ids), User.deleted_at.is_(None)
            )
        )
        for u in result.scalars().all():
            user_rows[u.id] = u

    # Load follow status batch (whether current_user_id follows each user_id)
    following_set: set[UUID] = set()
    if current_user_id and user_ids:
        result = await db.execute(
            select(Follow.following_id).where(
                Follow.follower_id == current_user_id,
                Follow.following_id.in_(user_ids),
                Follow.deleted_at.is_(None),
            )
        )
        following_set = {row[0] for row in result.all()}

    items = []
    for f in follows:
        target_id = f.follower_id if is_follower_list else f.following_id
        user = user_rows.get(target_id)
        items.append(
            {
                "follow_id": f.id,
                "user_id": target_id,
                "nickname": user.nickname if user else None,
                "avatar_url": user.avatar_url if user else None,
                "is_following": target_id in following_set,
                "created_at": f.created_at,
            }
        )
    return items


@router.get("/users/{user_id}/followers", response_model=PaginatedResult[FollowItem])
async def get_followers_endpoint(
    user_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get paginated list of followers for a user."""
    follows, total = await get_followers(db, user_id, page, page_size)
    items = await _load_follow_items(
        db, follows, is_follower_list=True, current_user_id=current_user_id,
    )
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/users/{user_id}/following", response_model=PaginatedResult[FollowItem])
async def get_following_endpoint(
    user_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get paginated list of users that a user is following."""
    follows, total = await get_following(db, user_id, page, page_size)
    items = await _load_follow_items(
        db, follows, is_follower_list=False, current_user_id=current_user_id,
    )
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
