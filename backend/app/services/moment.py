from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment
from app.models.follow import Follow
from app.models.tag import Tag, MomentTag


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
    media_ids: list[UUID] | None = None,
) -> Moment:
    """Create a new Moment.

    Associates media and triggers AI tag extraction (AI step skipped for now,
    only basic creation is performed).
    """
    moment = Moment(
        user_id=user_id,
        title=data.get("title"),
        content=data.get("content"),
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


async def get_feed(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Moment], int]:
    """Get the home Feed — moments from followed users and public moments.

    Includes:
    - Public (privacy_level == 0) moments from everyone
    - Follow-visible (privacy_level == 1) moments from followed users
    - Mutual-only (privacy_level == 2) moments from mutual followers
    - Excludes archived (is_archived=True), deleted, and own moments
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

    # Build OR conditions for visibility:
    # - privacy_level == 0: always shown (public)
    # - privacy_level == 1: shown if user follows the author (followers only)
    # - privacy_level == 2: shown only if mutual
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

    conditions.append(or_(*visibility_clauses))

    # Count
    count_query = select(func.count(Moment.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch
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
