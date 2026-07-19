from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field


# ── Upload URL ──

class UploadUrlResponse(BaseModel):
    url: str
    object_key: str


# ── Confirm Upload ──

class ConfirmUploadRequest(BaseModel):
    object_key: str = Field(..., description="The object_key returned by upload-url")
    moment_id: UUID | None = Field(default=None, description="Optional: associate with a moment")


# ── Media Response ──

class MediaResponse(BaseModel):
    id: UUID
    user_id: UUID
    moment_id: UUID | None = None
    media_type: str
    object_key: str
    thumbnail_key: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    width: int | None = None
    height: int | None = None
    status: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
