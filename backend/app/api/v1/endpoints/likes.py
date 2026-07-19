from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result
from app.schemas.like import ToggleLikeRequest, LikeStatusResponse
from app.services.like import toggle_like, get_like_status

router = APIRouter()


@router.post("/likes/toggle", response_model=Result[LikeStatusResponse])
async def toggle_like_endpoint(
    body: ToggleLikeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Toggle like/unlike on a Moment or Comment."""
    result = await toggle_like(
        db,
        user_id=user_id,
        target_type=body.target_type,
        target_id=body.target_id,
    )
    return Result(
        code=0,
        message="success",
        data=LikeStatusResponse(**result),
    )


@router.get("/likes/status", response_model=Result[LikeStatusResponse])
async def get_like_status_endpoint(
    target_type: int = Query(..., ge=1, le=2, description="1=Moment, 2=Comment"),
    target_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Check whether the current user has liked a target."""
    result = await get_like_status(db, user_id, target_type, target_id)
    return Result(
        code=0,
        message="success",
        data=LikeStatusResponse(**result),
    )
