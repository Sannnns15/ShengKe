from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    actor_id: UUID | None,
    type: str,
    target_type: str | None = None,
    target_id: UUID | None = None,
    content: str | None = None,
) -> Notification:
    """Create and persist a new notification."""
    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        target_type=target_type,
        target_id=target_id,
        content=content,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def get_user_notifications(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Notification], int]:
    """Get paginated notifications for a user, ordered by created_at DESC."""
    conditions = [Notification.user_id == user_id]

    # Count total
    count_query = select(func.count(Notification.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    query = (
        select(Notification)
        .where(*conditions)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    notifications = list(result.scalars().all())

    return notifications, total


async def mark_as_read(
    db: AsyncSession,
    notification_id: UUID,
    user_id: UUID,
) -> bool:
    """Mark a single notification as read.

    Returns True if the notification was found and updated; False otherwise.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalars().first()
    if notification is None:
        return False

    notification.is_read = True
    await db.commit()
    return True


async def mark_all_as_read(
    db: AsyncSession,
    user_id: UUID,
) -> int:
    """Mark all notifications for a user as read.

    Returns the number of notifications updated.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    notifications = list(result.scalars().all())

    for n in notifications:
        n.is_read = True

    await db.commit()
    return len(notifications)


async def get_unread_count(
    db: AsyncSession,
    user_id: UUID,
) -> int:
    """Get the count of unread notifications for a user."""
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return result.scalar() or 0
