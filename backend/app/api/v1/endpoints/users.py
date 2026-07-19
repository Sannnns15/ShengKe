from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.moment import MomentListItem
from app.services.moment import get_user_moments

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


@router.get("/{user_id}/moments", response_model=PaginatedResult[MomentListItem])
async def get_user_moments_route(
    user_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get a user's published moments."""
    moments, total = await get_user_moments(db, user_id, current_user_id, page, page_size)
    items = [MomentListItem.model_validate(m) for m in moments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
