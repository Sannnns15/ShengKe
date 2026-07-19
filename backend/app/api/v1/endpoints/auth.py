from fastapi import APIRouter

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
)

router = APIRouter()


@router.post("/register", response_model=Result[RegisterResponseData])
async def register(body: RegisterRequest):
    """Register a new user with phone + code."""
    # TBD: Implement registration logic
    return Result(code=0, message="not implemented", data=None)


@router.post("/login", response_model=Result[TokenResponse])
async def login(body: LoginRequest):
    """Login with phone + password."""
    return Result(code=0, message="not implemented", data=None)


@router.post("/refresh", response_model=Result[RefreshResponse])
async def refresh(body: RefreshRequest):
    """Refresh access token."""
    return Result(code=0, message="not implemented", data=None)


@router.post("/logout", response_model=Result)
async def logout():
    """Logout and revoke current token."""
    return Result(code=0, message="not implemented")


@router.post("/send-code", response_model=Result)
async def send_code(body: SendCodeRequest):
    """Send SMS verification code."""
    return Result(code=0, message="not implemented")


@router.post("/reset-password", response_model=Result)
async def reset_password(body: ResetPasswordRequest):
    """Reset password via SMS code."""
    return Result(code=0, message="not implemented")
