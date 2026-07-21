from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Create ──

class CreateMomentRequest(BaseModel):
    content: str | None = None
    title: str | None = None
    mood: str | None = None
    weather: str | None = None
    location_name: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    privacy_level: int = Field(default=0, ge=0, le=3)
    visibility_group: list[UUID] = []
    media_ids: list[UUID] = []
    tag_names: list[str] = []


class CreateMomentResponseData(BaseModel):
    id: UUID
    user_id: UUID
    created_at: datetime
    ai_tags: list[str] | None = None
    ai_summary: str | None = None
    ai_emotion: str | None = None


# ── Update ──

class UpdateMomentRequest(BaseModel):
    content: str | None = None
    title: str | None = None
    mood: str | None = None
    weather: str | None = None
    location_name: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None


# ── Privacy ──

class UpdatePrivacyRequest(BaseModel):
    privacy_level: int = Field(..., ge=0, le=3)
    visibility_group: list[UUID] = []


# ── Full Moment Response ──

class MomentResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None
    content: str | None
    mood: str | None
    weather: str | None
    location_name: str | None
    location_lat: float | None = None
    location_lng: float | None = None
    privacy_level: int
    visibility_group: list[UUID] | None = None
    is_archived: bool
    ai_tags: list[str] | None
    ai_summary: str | None
    ai_emotion: str | None
    comment_count: int
    like_count: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False

    class Config:
        from_attributes = True


# ── Feed / List Item (compact) ──

class MomentListItem(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None
    content: str | None
    mood: str | None
    weather: str | None
    location_name: str | None
    privacy_level: int
    is_archived: bool
    ai_tags: list[str] | None
    comment_count: int
    like_count: int
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Feed Item (with author info + is_liked) ──

class FeedItem(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None
    content: str | None
    mood: str | None
    weather: str | None
    location_name: str | None
    privacy_level: int
    is_archived: bool
    ai_tags: list[str] | None
    comment_count: int
    like_count: int
    view_count: int
    created_at: datetime
    author_nickname: str
    author_avatar_url: str | None = None
    is_liked: bool = False
