from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    """Detailed user profile returned in profile endpoints."""
    id: UUID
    phone: str
    nickname: str
    avatar_url: str | None = None
    bio: str | None = None
    gender: int = 0
    birthday: date | None = None
    moments_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    likes_received_count: int = 0
    is_following: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """Request body for updating user profile.

    All fields are optional — only supplied fields will be updated.
    """
    nickname: str | None = Field(None, min_length=1, max_length=50)
    bio: str | None = Field(None, max_length=300)
    gender: int | None = Field(None, ge=0, le=2)
    birthday: date | None = None
    avatar_url: str | None = Field(None, max_length=500)


class SearchUserItem(BaseModel):
    """Compact user representation for search results."""
    id: UUID
    nickname: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True
