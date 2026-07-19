from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationItem(BaseModel):
    """A single notification returned to the client."""
    id: UUID
    user_id: UUID
    actor_id: UUID | None = None
    type: str
    target_type: str | None = None
    target_id: UUID | None = None
    content: str | None = None
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int = 0
