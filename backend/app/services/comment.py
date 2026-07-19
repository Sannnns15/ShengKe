from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.moment import Moment
from app.services.notification import create_notification


async def create_comment(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
    content: str,
    parent_id: UUID | None = None,
) -> Comment:
    """Create a new comment on a Moment.

    If parent_id is provided, the comment becomes a reply to an existing comment.
    Updates the moment's comment_count.
    """
    comment = Comment(
        moment_id=moment_id,
        user_id=user_id,
        content=content,
        parent_id=parent_id,
    )
    db.add(comment)

    # Increment moment comment_count
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()
    if moment:
        moment.comment_count = Moment.comment_count + 1

    await db.commit()
    await db.refresh(comment)

    # Notify moment author about the new comment
    if moment and moment.user_id != user_id:
        content_preview = content[:100] if len(content) > 100 else content
        await create_notification(
            db,
            user_id=moment.user_id,
            actor_id=user_id,
            type="comment",
            target_type="moment",
            target_id=moment_id,
            content=content_preview,
        )

    return comment


async def get_moment_comments(
    db: AsyncSession,
    moment_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Comment], int]:
    """Get paginated comments for a Moment, ordered by created_at ascending."""
    conditions = [
        Comment.moment_id == moment_id,
        Comment.deleted_at.is_(None),
    ]

    # Count total
    count_query = select(func.count(Comment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    query = (
        select(Comment)
        .where(*conditions)
        .order_by(Comment.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    comments = list(result.scalars().all())

    return comments, total


async def delete_comment(
    db: AsyncSession,
    comment_id: UUID,
    user_id: UUID,
) -> bool:
    """Soft-delete a comment. Only the author can delete.

    Returns True if deleted, False if not found or not the author.
    """
    result = await db.execute(
        select(Comment).where(
            Comment.id == comment_id,
            Comment.deleted_at.is_(None),
        )
    )
    comment = result.scalars().first()

    if comment is None or comment.user_id != user_id:
        return False

    comment.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True
