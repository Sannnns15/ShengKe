from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.user import User
from app.services.notification import create_notification


async def follow_user(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> bool:
    """Follow a user.

    Returns True if follow was created, False if already following or
    attempting to follow self.
    """
    if follower_id == following_id:
        return False

    # Check if user exists and is not deleted
    result = await db.execute(
        select(User).where(
            User.id == following_id,
            User.deleted_at.is_(None),
        )
    )
    target_user = result.scalars().first()
    if target_user is None:
        return False

    # Check existing follow
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
    )
    existing = result.scalars().first()

    now = datetime.now(timezone.utc)

    if existing:
        if existing.deleted_at is None:
            # Already following
            return False
        else:
            # Re-follow (undo unfollow)
            existing.deleted_at = None
            await db.commit()
            return True

    # New follow
    follow = Follow(
        follower_id=follower_id,
        following_id=following_id,
    )
    db.add(follow)
    await db.commit()

    # Notify the followed user
    await create_notification(
        db,
        user_id=following_id,
        actor_id=follower_id,
        type="follow",
    )

    return True


async def unfollow_user(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> bool:
    """Unfollow a user (soft delete).

    Returns True if unfollowed, False if not following.
    """
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
            Follow.deleted_at.is_(None),
        )
    )
    follow = result.scalars().first()

    if follow is None:
        return False

    follow.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


async def get_followers(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Follow], int]:
    """Get paginated list of followers for a user."""
    conditions = [
        Follow.following_id == user_id,
        Follow.deleted_at.is_(None),
    ]

    count_query = select(func.count(Follow.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = (
        select(Follow)
        .where(*conditions)
        .order_by(Follow.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    follows = list(result.scalars().all())

    return follows, total


async def get_following(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Follow], int]:
    """Get paginated list of users that a user is following."""
    conditions = [
        Follow.follower_id == user_id,
        Follow.deleted_at.is_(None),
    ]

    count_query = select(func.count(Follow.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = (
        select(Follow)
        .where(*conditions)
        .order_by(Follow.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    follows = list(result.scalars().all())

    return follows, total


async def is_following(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> bool:
    """Check whether follower_id is following following_id."""
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
            Follow.deleted_at.is_(None),
        )
    )
    return result.scalars().first() is not None
