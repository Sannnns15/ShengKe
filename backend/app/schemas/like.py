from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class ToggleLikeRequest(BaseModel):
    target_type: int = Field(..., ge=1, le=2, description="1=Moment, 2=Comment")
    target_id: UUID


class LikeStatusResponse(BaseModel):
    is_liked: bool
    count: int
