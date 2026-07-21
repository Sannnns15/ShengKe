from __future__ import annotations

import base64
from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment
from app.models.follow import Follow
from app.models.like import Like
from app.models.user import User
from app.models.tag import Tag, MomentTag
from app.services.audit import audit_text


async def _ensure_tags(
    db: AsyncSession,
    tag_names: list[str],
) -> list[Tag]:
    """Get or create Tag records by name. Returns the Tag objects."""
    tags: list[Tag] = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        result = await db.execute(select(Tag).where(Tag.name == name))
        tag = result.scalars().first()
        if tag is None:
            tag = Tag(name=name)
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


async def create_moment(
    db: AsyncSession,
    user_id: UUID,
    data: dict,
) -> Moment:
    """Create a new Moment.

    Handles tag_names from data dict to create MomentTag associations.
    Before committing, runs content through basic audit check.
    """
    # Content audit check
    content = data.get("content", "")
    title = data.get("title", "")
    audit_result = audit_text(content)
    if not audit_result["passed"]:
        from app.schemas.common import AuditRejected
        raise AuditRejected(audit_result["reason"])

    moment = Moment(
        user_id=user_id,
        title=title,
        content=content,
        mood=data.get("mood"),
        weather=data.get("weather"),
        location_name=data.get("location_name"),
        location_lat=data.get("location_lat"),
        location_lng=data.get("location_lng"),
        privacy_level=data.get("privacy_level", 0),
        visibility_group=data.get("visibility_group"),
    )
    db.add(moment)
    await db.flush()

    # Create MomentTag associations if tag_names provided
    tag_names: list[str] | None = data.get("tag_names")
    if tag_names:
        tags = await _ensure_tags(db, tag_names)
        for tag in tags:
            moment_tag = MomentTag(moment_id=moment.id, tag_id=tag.id)
            db.add(moment_tag)

    await db.commit()
    await db.refresh(moment)
    return moment


async def get_moment(
    db: AsyncSession,
    moment_id: UUID,
    current_user_id: UUID,
) -> Moment | None:
    """Get a single Moment by ID with privacy level checks.

    - Public (0): anyone can view.
    - Followers only (1): only followers can view.
    - Mutual only (2): only mutual followers can view.
    - Private (3): only the owner can view.

    Returns the Moment if accessible, None otherwise.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()
    if moment is None:
        return None

    # Owner can always view
    if moment.user_id == current_user_id:
        return moment

    # Privacy check
    if moment.privacy_level == 0:
        # Public — anyone can view
        return moment
    elif moment.privacy_level == 3:
        # Private — only owner
        return None
    elif moment.privacy_level in (1, 2):
        # Followers only / Mutual only
        # TODO: implement follower/mutual check once Follow model/table exists
        # For now, treat these as inaccessible to non-owners
        return None

    return moment


async def get_user_moments(
    db: AsyncSession,
    user_id: UUID,
    current_user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Moment], int]:
    """Get a paginated list of moments for a specific user.

    If current_user_id == user_id (owner), returns all non-deleted moments.
    Otherwise, returns only public (privacy_level == 0) moments.
    """
    is_owner = current_user_id == user_id

    conditions = [
        Moment.user_id == user_id,
        Moment.deleted_at.is_(None),
    ]

    if not is_owner:
        conditions.append(Moment.privacy_level == 0)

    # Count total
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    query = (
        select(Moment)
        .where(*conditions)
        .order_by(Moment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    moments = list(result.scalars().all())

    return moments, total


def _build_feed_visibility_conditions(
    user_id: UUID,
    following_ids: set[UUID],
    mutual_ids: set[UUID],
) -> list:
    """Build the visibility OR clauses for feed filtering."""
    visibility_clauses = [
        Moment.privacy_level == 0,  # Public
    ]

    if following_ids:
        visibility_clauses.append(
            (Moment.privacy_level == 1) & Moment.user_id.in_(following_ids)
        )

    if mutual_ids:
        visibility_clauses.append(
            (Moment.privacy_level == 2) & Moment.user_id.in_(mutual_ids)
        )

    return visibility_clauses


async def _build_feed_base_conditions(
    db: AsyncSession,
    user_id: UUID,
) -> tuple[list, set[UUID], set[UUID]]:
    """Build the base WHERE conditions for the feed.

    Returns (conditions, following_ids, mutual_ids).
    """
    # Get IDs of users the current user follows
    following_result = await db.execute(
        select(Follow.following_id).where(
            Follow.follower_id == user_id,
            Follow.deleted_at.is_(None),
        )
    )
    following_ids = {row[0] for row in following_result.all()}

    # Get IDs of users who follow the current user (mutual check)
    mutual_ids: set[UUID] = set()
    if following_ids:
        mutual_result = await db.execute(
            select(Follow.follower_id).where(
                Follow.following_id == user_id,
                Follow.follower_id.in_(following_ids),
                Follow.deleted_at.is_(None),
            )
        )
        mutual_ids = {row[0] for row in mutual_result.all()}

    # Build feed conditions
    conditions = [
        Moment.deleted_at.is_(None),
        Moment.is_archived == False,  # noqa: E712
        Moment.user_id != user_id,
    ]

    visibility_clauses = _build_feed_visibility_conditions(
        user_id, following_ids, mutual_ids
    )
    conditions.append(or_(*visibility_clauses))

    return conditions, following_ids, mutual_ids


async def get_feed(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
    sort: str = "latest",
) -> tuple[list[dict], int]:
    """Get the home Feed — moments from followed users and public moments.

    Includes:
    - Public (privacy_level == 0) moments from everyone
    - Follow-visible (privacy_level == 1) moments from followed users
    - Mutual-only (privacy_level == 2) moments from mutual followers
    - Excludes archived (is_archived=True), deleted, and own moments

    Returns (list of dicts with author info + is_liked, total count).
    """
    conditions, _, _ = await _build_feed_base_conditions(db, user_id)

    # Count
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    if total == 0:
        return [], 0

    # Determine sort order
    if sort == "hot":
        order_clause = Moment.like_count.desc()
    else:
        order_clause = Moment.created_at.desc()

    # Fetch moments with author join
    query = (
        select(Moment, User.nickname, User.avatar_url)
        .join(User, Moment.user_id == User.id)
        .where(*conditions)
        .order_by(order_clause)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()

    # Fetch likes by current user for all returned moment IDs
    moment_ids = [row.Moment.id for row in rows]
    liked_moment_ids = await _get_liked_moment_ids(db, user_id, moment_ids)

    # Build result dicts
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

    return items, total


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


async def get_hot_feed(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """Get hot feed — recent (30 days) moments sorted by like_count desc."""
    conditions, _, _ = await _build_feed_base_conditions(db, user_id)

    # Add 30-day window
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    conditions.append(Moment.created_at >= cutoff)

    # Count
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    if total == 0:
        return [], 0

    # Fetch with author join, ordered by like_count desc
    query = (
        select(Moment, User.nickname, User.avatar_url)
        .join(User, Moment.user_id == User.id)
        .where(*conditions)
        .order_by(Moment.like_count.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()

    # Fetch liked moment IDs
    moment_ids = [row.Moment.id for row in rows]
    liked_moment_ids = await _get_liked_moment_ids(db, user_id, moment_ids)

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

    return items, total


async def get_feed_cursor(
    db: AsyncSession,
    user_id: UUID,
    cursor: str | None = None,
    limit: int = 20,
    sort: str = "latest",
) -> tuple[list[dict], str | None, bool]:
    """Get feed with cursor-based pagination.

    Cursor format for latest: base64("{id},{created_at_isoformat}")
    Cursor format for hot:   base64("{id},{like_count}")

    Returns (items, next_cursor, has_more).
    """
    conditions, _, _ = await _build_feed_base_conditions(db, user_id)

    parsed_cursor_valid = False
    cursor_id: UUID | None = None
    cursor_value: str | None = None

    if cursor:
        try:
            decoded = base64.b64decode(cursor).decode("utf-8")
            parts = decoded.split(",", 1)
            if len(parts) == 2:
                cursor_id = UUID(parts[0])
                cursor_value = parts[1]
                parsed_cursor_valid = True
        except (ValueError, Exception):
            parsed_cursor_valid = False

    if parsed_cursor_valid and cursor_id and cursor_value is not None:
        if sort == "hot":
            try:
                cursor_like_count = int(cursor_value)
            except (ValueError, TypeError):
                parsed_cursor_valid = False
            else:
                conditions.append(
                    or_(
                        Moment.like_count < cursor_like_count,
                        and_(
                            Moment.like_count == cursor_like_count,
                            Moment.id > cursor_id,
                        ),
                    )
                )
        else:
            try:
                cursor_dt = datetime.fromisoformat(cursor_value)
            except (ValueError, TypeError):
                parsed_cursor_valid = False
            else:
                conditions.append(
                    or_(
                        Moment.created_at < cursor_dt,
                        and_(
                            Moment.created_at == cursor_dt,
                            Moment.id > cursor_id,
                        ),
                    )
                )

    # Fetch limit+1 to detect has_more
    fetch_limit = limit + 1

    if sort == "hot":
        order_by_clause = [Moment.like_count.desc(), Moment.id.asc()]
    else:
        order_by_clause = [Moment.created_at.desc(), Moment.id.asc()]

    query = (
        select(Moment, User.nickname, User.avatar_url)
        .join(User, Moment.user_id == User.id)
        .where(*conditions)
        .order_by(*order_by_clause)
        .limit(fetch_limit)
    )
    result = await db.execute(query)
    rows = result.all()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    # Fetch liked moment IDs
    moment_ids = [row.Moment.id for row in rows]
    liked_moment_ids = await _get_liked_moment_ids(db, user_id, moment_ids)

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

    # Build next cursor from the last item
    next_cursor = None
    if has_more and items:
        last = items[-1]
        if sort == "hot":
            cursor_raw = f"{last['id']},{last['like_count']}"
        else:
            cursor_raw = f"{last['id']},{last['created_at'].isoformat()}"
        next_cursor = base64.b64encode(cursor_raw.encode()).decode()

    return items, next_cursor, has_more


async def get_moment_with_like_status(
    db: AsyncSession,
    moment_id: UUID,
    current_user_id: UUID,
) -> dict | None:
    """Get a single Moment by ID with is_liked flag.

    Returns a dict with Moment data plus is_liked, or None if not accessible.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()
    if moment is None:
        return None

    # Owner can always view
    if moment.user_id == current_user_id:
        pass  # proceed
    elif moment.privacy_level == 0:
        pass  # public
    elif moment.privacy_level == 3:
        return None  # private
    elif moment.privacy_level in (1, 2):
        # TODO: implement follower/mutual check
        return None

    # Check is_liked
    like_result = await db.execute(
        select(Like).where(
            Like.user_id == current_user_id,
            Like.target_type == 1,
            Like.target_id == moment_id,
            Like.deleted_at.is_(None),
        )
    )
    is_liked = like_result.scalars().first() is not None

    result_dict = {
        "id": moment.id,
        "user_id": moment.user_id,
        "title": moment.title,
        "content": moment.content,
        "mood": moment.mood,
        "weather": moment.weather,
        "location_name": moment.location_name,
        "location_lat": moment.location_lat,
        "location_lng": moment.location_lng,
        "privacy_level": moment.privacy_level,
        "visibility_group": moment.visibility_group,
        "is_archived": moment.is_archived,
        "ai_tags": moment.ai_tags,
        "ai_summary": moment.ai_summary,
        "ai_emotion": moment.ai_emotion,
        "comment_count": moment.comment_count,
        "like_count": moment.like_count,
        "view_count": moment.view_count,
        "created_at": moment.created_at,
        "updated_at": moment.updated_at,
        "is_liked": is_liked,
    }

    return result_dict


async def update_moment(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
    data: dict,
) -> Moment | None:
    """Edit a Moment. Only the author can edit.

    Returns the updated Moment, or None if not found / not owner.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()

    if moment is None or moment.user_id != user_id:
        return None

    # Update only provided fields
    updatable_fields = [
        "title", "content", "mood", "weather",
        "location_name", "location_lat", "location_lng",
    ]
    for field in updatable_fields:
        if field in data and data[field] is not None:
            setattr(moment, field, data[field])

    moment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(moment)
    return moment


async def delete_moment(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
) -> bool:
    """Soft-delete a Moment. Only the author can delete.

    Returns True if deleted, False if not found / not owner.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()

    if moment is None or moment.user_id != user_id:
        return False

    moment.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


async def toggle_archive(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
) -> Moment | None:
    """Toggle the archived state of a Moment. Only the author can archive.

    Returns the updated Moment, or None if not found / not owner.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()

    if moment is None or moment.user_id != user_id:
        return None

    moment.is_archived = not moment.is_archived
    moment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(moment)
    return moment


async def update_privacy(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
    privacy_level: int,
    visibility_group: list[UUID] | None = None,
) -> Moment | None:
    """Update the privacy level of a Moment. Only the author can change it.

    Returns the updated Moment, or None if not found / not owner.
    """
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()

    if moment is None or moment.user_id != user_id:
        return None

    moment.privacy_level = privacy_level
    if visibility_group is not None:
        moment.visibility_group = visibility_group
    moment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(moment)
    return moment
