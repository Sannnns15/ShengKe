from fastapi import APIRouter

from app.schemas.common import Result

router = APIRouter()


@router.get("/me", response_model=Result)
async def get_me():
    """Get current user profile."""
    return Result(code=0, message="not implemented")


@router.patch("/me", response_model=Result)
async def update_me():
    """Update current user profile."""
    return Result(code=0, message="not implemented")


@router.get("/{user_id}", response_model=Result)
async def get_user(user_id: str):
    """Get public user profile."""
    return Result(code=0, message="not implemented")
