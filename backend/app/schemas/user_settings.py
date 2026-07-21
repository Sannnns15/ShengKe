from __future__ import annotations

from pydantic import BaseModel, Field


class UserSettingsResponse(BaseModel):
    """Current user settings, read from the JSONB settings_json field."""
    notification_enabled: bool = True
    privacy_default: int = Field(default=0, ge=0, le=3)


class UpdateUserSettingsRequest(BaseModel):
    """Partial update payload for user settings."""
    notification_enabled: bool | None = None
    privacy_default: int | None = Field(None, ge=0, le=3)
