from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.like import Like
from app.models.moment import Moment
from app.models.comment import Comment


async def toggle_like(
    db: AsyncSession,
    user_id: UUID,
    target_type: int,
    target_id: UUID,
) -> dict:
    """Toggle like status for a target (Moment or Comment).

    If already liked (not soft-deleted), soft-delete it (unlike).
    If not liked, create a new like.

    Also updates the like_count on the target (Moment or Comment).

    Returns dict with is_liked (bool) and count (int).
    """
    # Find existing like (including soft-deleted)
    result = await db.execute(
        select(Like).where(
            Like.user_id == user_id,
            Like.target_type == target_type,
            Like.target_id == target_id,
        )
    )
    like = result.scalars().first()

    now = datetime.now(timezone.utc)

    if like:
        if like.deleted_at is None:
            # Currently liked → unlike (soft delete)
            like.deleted_at = now
            delta = -1
            is_liked = False
        else:
            # Previously unliked → re-like
            like.deleted_at = None
            delta = 1
            is_liked = True
    else:
        # Never liked → create
        like = Like(
            user_id=user_id,
            target_type=target_type,
            target_id=target_id,
        )
        db.add(like)
        delta = 1
        is_liked = True

    # Update like_count on the target
    if target_type == 1:
        # Moment
        await db.execute(
            select(Moment).where(Moment.id == target_id)
        )  # ensure loaded
        stmt = (
            select(Moment)
            .where(Moment.id == target_id, Moment.deleted_at.is_(None))
        )
        result = await db.execute(stmt)
        moment = result.scalars().first()
        if moment:
            moment.like_count = Moment.like_count + delta
    elif target_type == 2:
        # Comment
        stmt = (
            select(Comment)
            .where(Comment.id == target_id, Comment.deleted_at.is_(None))
        )
        result = await db.execute(stmt)
        comment = result.scalars().first()
        if comment:
            comment.like_count = Comment.like_count + delta

    await db.commit()

    # Count current likes
    count = await count_likes(db, target_type, target_id)

    return {"is_liked": is_liked, "count": count}


async def get_like_status(
    db: AsyncSession,
    user_id: UUID,
    target_type: int,
    target_id: UUID,
) -> dict:
    """Check whether the user has liked the target.

    Returns dict with is_liked (bool) and count (int).
    """
    result = await db.execute(
        select(Like).where(
            Like.user_id == user_id,
            Like.target_type == target_type,
            Like.target_id == target_id,
            Like.deleted_at.is_(None),
        )
    )
    like = result.scalars().first()
    is_liked = like is not None
    count = await count_likes(db, target_type, target_id)
    return {"is_liked": is_liked, "count": count}


async def count_likes(
    db: AsyncSession,
    target_type: int,
    target_id: UUID,
) -> int:
    """Count non-deleted likes for a target."""
    result = await db.execute(
        select(func.count(Like.id)).where(
            Like.target_type == target_type,
            Like.target_id == target_id,
            Like.deleted_at.is_(None),
        )
    )
    return result.scalar() or 0
