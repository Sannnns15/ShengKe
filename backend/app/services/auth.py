from __future__ import annotations

from datetime import timedelta, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.models.user import User

settings = get_settings()

# ── In-memory refresh token store (placeholder — replace with Redis) ──

_refresh_tokens: dict[str, dict] = {}


async def create_user(
    db: AsyncSession,
    phone: str,
    password: str,
    nickname: str,
) -> User:
    """Create a new user with hashed password.

    Returns the persisted User instance (already committed and refreshed).
    """
    user = User(
        phone=phone,
        password_hash=hash_password(password),
        nickname=nickname,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    """Look up a user by phone number."""
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalars().first()


async def authenticate_user(
    db: AsyncSession,
    phone: str,
    password: str,
) -> User | None:
    """Verify phone + password combination.

    Returns the User if credentials are valid, None otherwise.
    """
    user = await get_user_by_phone(db, phone)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def store_refresh_token(db: AsyncSession, user_id: UUID, token: str) -> None:
    """Persist a refresh token mapped to a user (Redis placeholder).

    TODO: Replace with Redis SET with TTL (refresh_token_expire_days).
    """
    _refresh_tokens[token] = {
        "user_id": str(user_id),
        "expires_at": datetime.now(timezone.utc)
        + timedelta(days=settings.refresh_token_expire_days),
    }


async def validate_refresh_token(db: AsyncSession, token: str) -> UUID | None:
    """Validate a refresh token and return the associated user_id.

    Returns UUID if valid, None otherwise.
    """
    entry = _refresh_tokens.get(token)
    if entry is None:
        return None
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _refresh_tokens.pop(token, None)
        return None
    return UUID(entry["user_id"])


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    """Remove a refresh token from the store."""
    _refresh_tokens.pop(token, None)


async def create_login_tokens(user: User) -> dict:
    """Generate access + refresh token pair for a user.

    Returns a dict with keys: access_token, refresh_token, expires_in.
    """
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.access_token_expire_minutes * 60,
    }
