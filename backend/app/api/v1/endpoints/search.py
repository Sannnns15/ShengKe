from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.moment import FeedItem
from app.schemas.user_profile import SearchUserItem
from app.services.search import search_moments
from app.services.user import search_users

router = APIRouter()


@router.get("/moments", response_model=PaginatedResult[FeedItem])
async def search_moments_endpoint(
    q: str = Query(..., min_length=1, max_length=200, description="搜索关键词"),
    tag: str | None = Query(
        None, max_length=50, description="按 AI 标签筛选（可选）"
    ),
    sort: str = Query(
        default="relevance",
        pattern=r"^(relevance|latest|hot)$",
        description="排序方式：relevance(相关度), latest(最新), hot(最热)",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id_filter: UUID | None = Query(
        None, alias="user_id", description="按作者 ID 筛选（可选）"
    ),
    date_from: str | None = Query(
        None, description="起始日期 YYYY-MM-DD（可选）"
    ),
    date_to: str | None = Query(
        None, description="结束日期 YYYY-MM-DD（可选）"
    ),
    mood: str | None = Query(
        None, pattern=r"^(positive|neutral|negative)$",
        description="按情绪筛选：positive/neutral/negative（可选）"
    ),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Full-text search over Moments using PostgreSQL tsvector.

    Supports weighted search (title > content) with sorting options.
    Returns public moments and the current user's own moments.
    Optionally filter by AI tag, author, date range, or emotion.
    """
    moments, total = await search_moments(
        db, q, current_user_id, page, page_size,
        tag=tag, sort=sort,
        user_id=user_id_filter,
        date_from=date_from,
        date_to=date_to,
        mood=mood,
    )
    items = [FeedItem(**m) for m in moments]
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
