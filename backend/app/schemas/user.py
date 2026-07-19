from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Register ──

class RegisterRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", examples=["13800138000"])
    password: str = Field(..., min_length=8, max_length=128)
    code: str = Field(..., min_length=4, max_length=6)
    nickname: str = Field(..., min_length=1, max_length=50)


# ── Login ──

class LoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    password: str = Field(..., min_length=8, max_length=128)


# ── Token ──

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int = 900  # 15 minutes
    token_type: str = "Bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int = 900


# ── User info ──

class UserPublicInfo(BaseModel):
    id: UUID
    phone: str
    nickname: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class RegisterResponseData(BaseModel):
    user: UserPublicInfo
    access_token: str
    refresh_token: str
    expires_in: int = 900


# ── SMS code ──

class SendCodeRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    type: str = Field(..., pattern=r"^(register|login|reset_password)$")


class ResetPasswordRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    code: str = Field(..., min_length=4, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)
