from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.notification import create_notification

MENTION_PATTERN = re.compile(r'@(\S+)')


async def extract_mentions(text: str) -> list[str]:
    """Extract @username mentions from text."""
    if not text:
        return []
    return MENTION_PATTERN.findall(text)


async def process_mentions(
    db: AsyncSession,
    text: str,
    actor_id: UUID,
    target_type: str,
    target_id: UUID,
    content: str | None = None,
) -> None:
    """Extract mentions from text and create notifications for mentioned users.

    Skips the actor themselves if they mention their own nickname.
    """
    usernames = await extract_mentions(text)
    if not usernames:
        return

    for username in usernames:
        result = await db.execute(
            select(User).where(
                User.nickname == username,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalars().first()
        if user and user.id != actor_id:
            await create_notification(
                db,
                user_id=user.id,
                actor_id=actor_id,
                type="mention",
                target_type=target_type,
                target_id=target_id,
                content=content or text[:100],
            )
