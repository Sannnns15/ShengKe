from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment
from app.models.user import User
from app.core.cache import get, set, make_key, TTL
from app.models.like import Like


async def _get_liked_moment_ids(
    db: AsyncSession,
    user_id: UUID,
    moment_ids: list[UUID],
) -> set[UUID]:
    """Return a set of moment IDs that the user has liked."""
    if not moment_ids:
        return set()
    result = await db.execute(
        select(Like.target_id).where(
            Like.user_id == user_id,
            Like.target_type == 1,
            Like.target_id.in_(moment_ids),
            Like.deleted_at.is_(None),
        )
    )
    return {row[0] for row in result.all()}


async def search_moments(
    db: AsyncSession,
    query: str,
    current_user_id: UUID,
    page: int = 1,
    page_size: int = 20,
    tag: str | None = None,
    sort: str = "relevance",
    user_id: UUID | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    mood: str | None = None,
) -> tuple[list[dict], int]:
    """Full-text search over Moments using PostgreSQL tsvector.

    Uses GIN-indexed tsvector on (title || ' ' || content) with simple
    configuration.

    Results are filtered to:
      - Public (privacy_level == 0) moments, OR
      - Moments owned by the current user

    Optionally filtered by an AI tag.

    Sort modes:
      - "relevance" (default): ts_rank descending
      - "latest": created_at descending
      - "hot": like_count descending (with 30-day window)

    Returns (list of FeedItem-style dicts with author info, total count).
    """
    cache_key = make_key("search", query, sort, tag or "", str(page),
                          str(page_size), str(current_user_id),
                          str(user_id or ""), date_from or "", date_to or "",
                          mood or "")
    cached = await get(cache_key)
    if cached is not None:
        return cached

    # Build base conditions
    conditions = [
        Moment.deleted_at.is_(None),
        or_(
            Moment.privacy_level == 0,
            Moment.user_id == current_user_id,
        ),
    ]

    if tag:
        conditions.append(Moment.ai_tags.any(tag))

    if user_id:
        conditions.append(Moment.user_id == user_id)

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            conditions.append(Moment.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            conditions.append(Moment.created_at <= dt_to)
        except ValueError:
            pass

    if mood:
        if mood in ("positive", "neutral", "negative"):
            conditions.append(Moment.ai_emotion == mood)

    # Build tsvector expression: coalesced title + ' ' + coalesced content
    # This matches the GIN index idx_moments_search.
    ts_vector = func.to_tsvector(
        "simple",
        func.coalesce(Moment.title, "") + text("' '") + func.coalesce(Moment.content, ""),
    )
    ts_query = func.plainto_tsquery("simple", query)

    # Add tsquery filter
    conditions.append(ts_vector.op("@@")(ts_query))

    # Count
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    if total == 0:
        return [], 0

    # Determine sort order
    if sort == "latest":
        order_clause = Moment.created_at.desc()
    elif sort == "hot":
        # Hot: 30-day window, ordered by like_count desc
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        conditions.append(Moment.created_at >= cutoff)
        order_clause = Moment.like_count.desc()
    else:
        # Default: relevance sort by ts_rank
        rank = func.ts_rank(ts_vector, ts_query)
        order_clause = rank.desc()

    # Fetch with author join
    stmt = (
        select(Moment, User.nickname, User.avatar_url)
        .join(User, Moment.user_id == User.id)
        .where(*conditions)
        .order_by(order_clause)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Fetch liked moment IDs
    moment_ids = [row.Moment.id for row in rows]
    liked_moment_ids = await _get_liked_moment_ids(db, current_user_id, moment_ids)

    # Build FeedItem-style dicts
    items = []
    for row in rows:
        moment = row.Moment
        item = {
            "id": moment.id,
            "user_id": moment.user_id,
            "title": moment.title,
            "content": moment.content,
            "mood": moment.mood,
            "weather": moment.weather,
            "location_name": moment.location_name,
            "privacy_level": moment.privacy_level,
            "is_archived": moment.is_archived,
            "ai_tags": moment.ai_tags,
            "comment_count": moment.comment_count,
            "like_count": moment.like_count,
            "view_count": moment.view_count,
            "created_at": moment.created_at,
            "author_nickname": row.nickname,
            "author_avatar_url": row.avatar_url,
            "is_liked": moment.id in liked_moment_ids,
        }
        items.append(item)

    await set(cache_key, (items, total), TTL.get("search", 30))
    return items, total


async def search_users(
    db: AsyncSession,
    query: str,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[User], int]:
    """Search users by nickname (case-insensitive partial match).

    Uses PostgreSQL ILIKE for case-insensitive fuzzy matching.
    Only returns non-deleted users.
    """
    pattern = f"%{query}%"

    # Count
    count_query = select(func.count(User.id)).where(
        User.nickname.ilike(pattern),
        User.deleted_at.is_(None),
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch
    query_stmt = (
        select(User)
        .where(
            User.nickname.ilike(pattern),
            User.deleted_at.is_(None),
        )
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query_stmt)
    users = list(result.scalars().all())

    return users, total
