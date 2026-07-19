from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

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
) -> list[dict]:
    """Load Follow records with associated user info."""
    items = []
    for f in follows:
        user_id = f.follower_id if is_follower_list else f.following_id
        # Load user info
        result = await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalars().first()
        items.append(
            {
                "follow_id": f.id,
                "user_id": user_id,
                "nickname": user.nickname if user else None,
                "avatar_url": user.avatar_url if user else None,
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
    items = await _load_follow_items(db, follows, is_follower_list=True)
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
    items = await _load_follow_items(db, follows, is_follower_list=False)
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
