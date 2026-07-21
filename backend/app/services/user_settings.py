from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user_settings import UserSettingsResponse, UpdateUserSettingsRequest

_DEFAULT_SETTINGS: dict = {
    "notification_enabled": True,
    "privacy_default": 0,
}


def _merge_settings(current: dict, update: dict) -> dict:
    """Merge update dict into current settings, preserving defaults."""
    merged = dict(_DEFAULT_SETTINGS)
    merged.update(current)
    merged.update({k: v for k, v in update.items() if v is not None})
    return merged


async def get_user_settings(
    db: AsyncSession,
    user_id: UUID,
) -> UserSettingsResponse | None:
    """Read settings from the user's settings_json field.

    Returns None if the user does not exist.
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

    merged = _merge_settings(user.settings_json or {}, {})
    return UserSettingsResponse(**merged)


async def update_user_settings(
    db: AsyncSession,
    user_id: UUID,
    update: UpdateUserSettingsRequest,
) -> UserSettingsResponse | None:
    """Partially update user settings and persist to settings_json.

    Returns the full, merged settings after the update,
    or None if the user does not exist.
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

    update_dict = update.model_dump(exclude_unset=True)
    merged = _merge_settings(user.settings_json or {}, update_dict)
    user.settings_json = merged
    await db.commit()

    return UserSettingsResponse(**merged)
