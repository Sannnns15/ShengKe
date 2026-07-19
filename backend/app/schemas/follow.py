from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FollowItem(BaseModel):
    follow_id: UUID
    user_id: UUID
    nickname: str | None = None
    avatar_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
