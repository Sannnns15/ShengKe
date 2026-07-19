from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result
from app.schemas.user import (
    RegisterRequest,
    RegisterResponseData,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    SendCodeRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserPublicInfo,
)
from app.services.auth import (
    create_user,
    authenticate_user,
    create_login_tokens,
    store_refresh_token,
    validate_refresh_token,
    revoke_refresh_token,
)

router = APIRouter()


@router.post("/register", response_model=Result[RegisterResponseData])
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with phone + password + nickname.

    Note: SMS code verification is skipped during development.
    """
    user = await create_user(
        db,
        phone=body.phone,
        password=body.password,
        nickname=body.nickname,
    )
    tokens = await create_login_tokens(user)
    await store_refresh_token(db, user.id, tokens["refresh_token"])

    return Result(
        code=0,
        message="success",
        data=RegisterResponseData(
            user=UserPublicInfo(
                id=user.id,
                phone=user.phone,
                nickname=user.nickname,
                avatar_url=user.avatar_url,
            ),
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=tokens["expires_in"],
        ),
    )


@router.post("/login", response_model=Result[TokenResponse])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with phone + password."""
    user = await authenticate_user(db, phone=body.phone, password=body.password)
    if user is None:
        return Result(code=1001, message="手机号或密码错误", data=None)

    tokens = await create_login_tokens(user)
    await store_refresh_token(db, user.id, tokens["refresh_token"])

    return Result(
        code=0,
        message="success",
        data=TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=tokens["expires_in"],
        ),
    )


@router.post("/refresh", response_model=Result[RefreshResponse])
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    user_id = await validate_refresh_token(db, body.refresh_token)
    if user_id is None:
        return Result(code=1002, message="无效或已过期的 refresh token", data=None)

    # Generate new access token
    from app.core.security import create_access_token
    from datetime import timedelta

    new_access_token = create_access_token(
        subject=str(user_id),
        expires_delta=timedelta(minutes=15),
    )

    return Result(
        code=0,
        message="success",
        data=RefreshResponse(
            access_token=new_access_token,
            expires_in=900,
        ),
    )


@router.post("/logout", response_model=Result)
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Logout and revoke current refresh token."""
    await revoke_refresh_token(db, body.refresh_token)
    return Result(code=0, message="success")


@router.post("/send-code", response_model=Result)
async def send_code(body: SendCodeRequest):
    """Send SMS verification code (stub — no real SMS integration)."""
    return Result(code=0, message="验证码已发送")


@router.post("/reset-password", response_model=Result)
async def reset_password(body: ResetPasswordRequest):
    """Reset password via SMS code (not implemented)."""
    return Result(code=0, message="not implemented")
