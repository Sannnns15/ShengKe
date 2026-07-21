from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.like import Like
from app.models.moment import Moment
from app.models.user import User


async def get_user_profile(
    db: AsyncSession,
    user_id: UUID,
    current_user_id: UUID,
) -> dict | None:
    """Get a user's public profile with aggregated counts and follow status.

    Returns a dict with user info plus:
      - moments_count
      - followers_count
      - following_count
      - is_following (whether current_user_id follows this user)

    Returns None if the user does not exist or is soft-deleted.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalars().first()
    if user is None:
        return None

    # Count moments (public for others, all for owner)
    moments_conditions = [
        Moment.user_id == user_id,
        Moment.deleted_at.is_(None),
    ]
    if user_id != current_user_id:
        moments_conditions.append(Moment.privacy_level == 0)

    moments_count_result = await db.execute(
        select(func.count(Moment.id)).where(*moments_conditions)
    )
    moments_count = moments_count_result.scalar() or 0

    # Count followers
    followers_count_result = await db.execute(
        select(func.count(Follow.id)).where(
            Follow.following_id == user_id,
            Follow.deleted_at.is_(None),
        )
    )
    followers_count = followers_count_result.scalar() or 0

    # Count following
    following_count_result = await db.execute(
        select(func.count(Follow.id)).where(
            Follow.follower_id == user_id,
            Follow.deleted_at.is_(None),
        )
    )
    following_count = following_count_result.scalar() or 0

    # Count likes received (sum of like_count on all user's moments)
    likes_received_result = await db.execute(
        select(func.coalesce(func.sum(Moment.like_count), 0)).where(
            Moment.user_id == user_id,
            Moment.deleted_at.is_(None),
        )
    )
    likes_received_count = likes_received_result.scalar() or 0

    # Check if current user is following this user
    is_following = False
    if current_user_id and current_user_id != user_id:
        follow_result = await db.execute(
            select(Follow).where(
                Follow.follower_id == current_user_id,
                Follow.following_id == user_id,
                Follow.deleted_at.is_(None),
            )
        )
        is_following = follow_result.scalars().first() is not None

    return {
        "id": user.id,
        "phone": _mask_phone(user.phone),
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "gender": user.gender,
        "birthday": user.birthday,
        "created_at": user.created_at,
        "moments_count": moments_count,
        "followers_count": followers_count,
        "following_count": following_count,
        "likes_received_count": likes_received_count,
        "is_following": is_following,
    }


async def get_own_profile(
    db: AsyncSession,
    user_id: UUID,
) -> dict | None:
    """Get the current user's own full profile with aggregated counts.

    Similar to get_user_profile but:
      - Returns the actual phone number (unmasked)
      - Returns moments_count across all privacy levels
      - Always sets is_following = False (can't follow yourself)
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalars().first()
    if user is None:
        return None

    # Count moments (all, including private)
    moments_count_result = await db.execute(
        select(func.count(Moment.id)).where(
            Moment.user_id == user_id,
            Moment.deleted_at.is_(None),
        )
    )
    moments_count = moments_count_result.scalar() or 0

    # Count followers
    followers_count_result = await db.execute(
        select(func.count(Follow.id)).where(
            Follow.following_id == user_id,
            Follow.deleted_at.is_(None),
        )
    )
    followers_count = followers_count_result.scalar() or 0

    # Count following
    following_count_result = await db.execute(
        select(func.count(Follow.id)).where(
            Follow.follower_id == user_id,
            Follow.deleted_at.is_(None),
        )
    )
    following_count = following_count_result.scalar() or 0

    return {
        "id": user.id,
        "phone": user.phone,  # unmasked for own profile
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "gender": user.gender,
        "birthday": user.birthday,
        "created_at": user.created_at,
        "moments_count": moments_count,
        "followers_count": followers_count,
        "following_count": following_count,
    }


async def update_user_profile(
    db: AsyncSession,
    user_id: UUID,
    data: dict,
) -> User | None:
    """Update the current user's own profile.

    Accepts any of: nickname, bio, gender, birthday, avatar_url.
    Only supplied fields (non-None) are updated.
    Returns the updated User, or None if user not found/deleted.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalars().first()
    if user is None:
        return None

    updatable_fields = ["nickname", "bio", "gender", "birthday", "avatar_url"]
    for field in updatable_fields:
        if field in data and data[field] is not None:
            setattr(user, field, data[field])

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(
    db: AsyncSession,
    user_id: UUID,
) -> bool:
    """Soft-delete (deactivate) a user account.

    Returns True if deleted, False if user already deleted or not found.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalars().first()
    if user is None:
        return False

    user.deleted_at = datetime.now(timezone.utc)
    user.status = 0
    await db.commit()
    return True


async def get_user_moments(
    db: AsyncSession,
    user_id: UUID,
    current_user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Moment], int]:
    """Get paginated moments for a specific user.

    Owner sees all non-deleted moments; others see only public ones.
    This is a convenience wrapper that delegates to the moment service
    logic inline to avoid circular imports.
    """
    is_owner = current_user_id == user_id

    conditions = [
        Moment.user_id == user_id,
        Moment.deleted_at.is_(None),
    ]

    if not is_owner:
        conditions.append(Moment.privacy_level == 0)

    # Count
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


def _mask_phone(phone: str) -> str:
    """Mask the middle digits of a phone number.

    E.g., '13800138000' -> '138****8000'
    """
    if len(phone) >= 7:
        return phone[:3] + "****" + phone[-4:]
    return phone
