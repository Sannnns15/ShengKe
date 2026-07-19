from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field


# ── Create ──

class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Collection name")
    description: str | None = Field(default=None, max_length=1000)


# ── Update ──

class UpdateCollectionRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    sort_order: int | None = Field(default=None, ge=0)


# ── Add to Collection ──

class AddToCollectionRequest(BaseModel):
    collection_id: UUID
    moment_id: UUID


# ── Collection Response ──

class CollectionResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    sort_order: int
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Collection Item Response ──

class CollectionItemResponse(BaseModel):
    id: UUID
    collection_id: UUID
    moment_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
