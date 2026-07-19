from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment
from app.models.user import User


async def search_moments(
    db: AsyncSession,
    query: str,
    current_user_id: UUID,
    page: int = 1,
    page_size: int = 20,
    tag: str | None = None,
) -> tuple[list[Moment], int]:
    """Full-text search over Moments using PostgreSQL ILIKE.

    Searches both `title` and `content` fields with case-insensitive
    partial matching. Results are filtered to:
      - Public (privacy_level == 0) moments, OR
      - Moments owned by the current user

    Optionally filtered by an AI tag.
    """
    pattern = f"%{query}%"

    conditions = [
        Moment.deleted_at.is_(None),
        or_(
            Moment.title.ilike(pattern),
            Moment.content.ilike(pattern),
        ),
        or_(
            Moment.privacy_level == 0,
            Moment.user_id == current_user_id,
        ),
    ]

    if tag:
        conditions.append(Moment.ai_tags.any(tag))

    # Count
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch
    stmt = (
        select(Moment)
        .where(*conditions)
        .order_by(Moment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    moments = list(result.scalars().all())

    return moments, total
