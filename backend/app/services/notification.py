from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.services.ws_manager import manager


def _make_title_body(type: str, content: str | None, actor_name: str | None) -> tuple[str, str]:
    """Build human-readable title and body from notification type."""
    name = actor_name or "某人"
    content_preview = (content or "")[:100]
    if type == "like":
        return ("收到点赞", f"{name} 赞了你的生刻")
    elif type == "comment":
        return ("收到评论", f"{name} 评论了你：{content_preview}" if content_preview else f"{name} 评论了你")
    elif type == "follow":
        return ("新粉丝", f"{name} 关注了你")
    elif type == "mention":
        return ("有人@了你", f"{name} 在生刻中提到了你")
    elif type == "system":
        return ("系统通知", content or "")
    else:
        return ("通知", content or "")


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    actor_id: UUID | None,
    type: str,
    target_type: str | None = None,
    target_id: UUID | None = None,
    content: str | None = None,
) -> Notification:
    """Create, persist, and push (via WebSocket) a new notification."""
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

    # Query actor info for the WebSocket push
    actor_name: str | None = None
    actor_avatar: str | None = None
    if actor_id is not None:
        from app.models.user import User

        result = await db.execute(
            select(User.nickname, User.avatar_url).where(User.id == actor_id)
        )
        row = result.first()
        if row is not None:
            actor_name, actor_avatar = row

    title, body = _make_title_body(notification.type, notification.content, actor_name)

    notification_data = {
        "id": notification.id,
        "user_id": notification.user_id,
        "actor_id": notification.actor_id,
        "actor_name": actor_name,
        "actor_avatar": actor_avatar,
        "type": notification.type,
        "title": title,
        "body": body,
        "target_type": notification.target_type,
        "target_id": notification.target_id,
        "content": notification.content,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }
    await manager.send_to_user(
        user_id,
        {"type": "notification", "data": notification_data},
    )

    return notification


async def get_user_notifications(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """Get paginated notifications for a user with actor info.

    JOINs the User table on actor_id to populate actor_name and actor_avatar.
    Returns list of dicts with all Notification fields plus actor info.
    """
    from app.models.user import User

    conditions = [Notification.user_id == user_id]

    # Count total
    count_query = select(func.count(Notification.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page with actor join (LEFT JOIN because actor_id can be null)
    query = (
        select(Notification, User.nickname, User.avatar_url)
        .outerjoin(User, Notification.actor_id == User.id)
        .where(*conditions)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()

    notifications = []
    for notification, nickname, avatar_url in rows:
        title, body = _make_title_body(notification.type, notification.content, nickname)
        notifications.append({
            "id": notification.id,
            "user_id": notification.user_id,
            "actor_id": notification.actor_id,
            "actor_name": nickname,
            "actor_avatar": avatar_url,
            "type": notification.type,
            "title": title,
            "body": body,
            "target_type": notification.target_type,
            "target_id": notification.target_id,
            "content": notification.content,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
        })

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
