from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.moment import MomentListItem
from app.schemas.user_profile import (
    UserProfileResponse,
    UpdateProfileRequest,
)
from app.services.user import (
    get_own_profile,
    get_user_profile,
    update_user_profile,
    delete_user,
    get_user_moments,
)

router = APIRouter()


@router.get("/me", response_model=Result[UserProfileResponse])
async def get_me(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the current user's own complete profile.

    Returns full phone number and all counts.
    """
    profile = await get_own_profile(db, user_id)
    if profile is None:
        return Result(code=1404, message="用户不存在", data=None)
    return Result(code=0, message="success", data=profile)


@router.patch("/me", response_model=Result[UserProfileResponse])
async def update_me(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Update the current user's own profile.

    Only supplied fields are updated.  Returns the full updated profile.
    """
    data = body.model_dump(exclude_unset=True)
    user = await update_user_profile(db, user_id, data)
    if user is None:
        return Result(code=1404, message="用户不存在", data=None)

    # Return full profile after update
    profile = await get_own_profile(db, user_id)
    return Result(code=0, message="success", data=profile)


@router.get("/{user_id}", response_model=Result[UserProfileResponse])
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get a user's public profile.

    - Phone number is masked (138****8000)
    - Includes is_following status for the current user
    - moments_count is scoped to public moments only
    """
    profile = await get_user_profile(db, user_id, current_user_id)
    if profile is None:
        return Result(code=1404, message="用户不存在", data=None)
    return Result(code=0, message="success", data=profile)


@router.delete("/me", response_model=Result)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Deactivate (soft-delete) the current user's account."""
    ok = await delete_user(db, user_id)
    if not ok:
        return Result(code=1404, message="注销失败或用户不存在")
    return Result(code=0, message="success")


@router.get("/{user_id}/moments", response_model=PaginatedResult[MomentListItem])
async def get_user_moments_route(
    user_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get a user's moments.

    The owner sees all non-deleted moments; other users see only public ones.
    """
    moments, total = await get_user_moments(
        db, user_id, current_user_id, page, page_size,
    )
    items = [MomentListItem.model_validate(m) for m in moments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
