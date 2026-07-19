from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.moment import MomentListItem
from app.schemas.user_profile import SearchUserItem
from app.services.search import search_moments
from app.services.user import search_users

router = APIRouter()


@router.get("/moments", response_model=PaginatedResult[MomentListItem])
async def search_moments_endpoint(
    q: str = Query(..., min_length=1, max_length=200, description="搜索关键词"),
    tag: str | None = Query(
        None, max_length=50, description="按 AI 标签筛选（可选）"
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Search moments by content and title (ILIKE full-text).

    Returns only public moments and moments owned by the current user.
    Optionally filter by a specific AI tag.
    """
    moments, total = await search_moments(
        db, q, user_id, page, page_size, tag=tag,
    )
    items = [MomentListItem.model_validate(m) for m in moments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/users", response_model=PaginatedResult[SearchUserItem])
async def search_users_endpoint(
    q: str = Query(..., min_length=1, max_length=50, description="搜索昵称"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Search users by nickname (ILIKE partial match)."""
    users, total = await search_users(db, q, page, page_size)
    items = [SearchUserItem.model_validate(u) for u in users]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
