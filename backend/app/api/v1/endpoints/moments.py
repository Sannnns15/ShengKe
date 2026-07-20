from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta, CursorPaginatedResult, CursorMeta
from app.schemas.moment import (
    CreateMomentRequest,
    CreateMomentResponseData,
    UpdateMomentRequest,
    UpdatePrivacyRequest,
    MomentResponse,
    FeedItem,
)
from app.services.moment import (
    create_moment,
    get_moment_with_like_status,
    get_feed,
    get_feed_cursor,
    update_moment,
    delete_moment,
    toggle_archive,
    update_privacy,
)
from app.models.media import Media

router = APIRouter()


@router.post("", response_model=Result[CreateMomentResponseData])
async def create_moment_endpoint(
    body: CreateMomentRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new Moment."""
    data = body.model_dump(exclude={"media_ids"})
    moment = await create_moment(db, user_id, data)

    # Associate media with moment
    if body.media_ids:
        stmt = (
            sa_update(Media)
            .where(Media.id.in_(body.media_ids), Media.user_id == user_id)
            .values(moment_id=moment.id)
        )
        await db.execute(stmt)
        await db.commit()

    # TODO: trigger AI tag extraction asynchronously

    return Result(
        code=0,
        message="success",
        data=CreateMomentResponseData(
            id=moment.id,
            created_at=moment.created_at,
        ),
    )


@router.get("/{moment_id}", response_model=Result[MomentResponse])
async def get_moment_endpoint(
    moment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a single Moment by id (includes is_liked flag)."""
    moment_dict = await get_moment_with_like_status(db, moment_id, user_id)
    if moment_dict is None:
        return Result(code=1404, message="时刻不存在或无权访问", data=None)
    return Result(code=0, message="success", data=MomentResponse(**moment_dict))


@router.patch("/{moment_id}", response_model=Result[MomentResponse])
async def update_moment_endpoint(
    moment_id: UUID,
    body: UpdateMomentRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Edit a Moment (author only)."""
    data = body.model_dump(exclude_unset=True)
    moment = await update_moment(db, moment_id, user_id, data)
    if moment is None:
        return Result(code=1404, message="时刻不存在或无权限编辑", data=None)
    return Result(code=0, message="success", data=MomentResponse.model_validate(moment))


@router.delete("/{moment_id}", response_model=Result)
async def delete_moment_endpoint(
    moment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Soft-delete a Moment (author only)."""
    ok = await delete_moment(db, moment_id, user_id)
    if not ok:
        return Result(code=1404, message="时刻不存在或无权限删除")
    return Result(code=0, message="success")


@router.get("", response_model=PaginatedResult[FeedItem])
async def list_moments_feed(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="latest", pattern=r"^(latest|hot)$"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Feed / explore moments (public + followed users).

    Sort options:
    - latest (default): by created_at descending
    - hot: by like_count descending
    """
    moments, total = await get_feed(db, user_id, page, page_size, sort)
    items = [FeedItem(**m) for m in moments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/cursor", response_model=CursorPaginatedResult[FeedItem])
async def list_moments_cursor(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="latest", pattern=r"^(latest|hot)$"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Feed with cursor-based pagination.

    Cursor is base64("{id},{created_at_timestamp}") for latest sort,
    or base64("{id},{like_count}") for hot sort.
    """
    items, next_cursor, has_more = await get_feed_cursor(db, user_id, cursor, limit, sort)
    return CursorPaginatedResult(
        code=0,
        message="success",
        data=[FeedItem(**m) for m in items],
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more),
    )


@router.post("/{moment_id}/archive", response_model=Result[MomentResponse])
async def archive_moment_endpoint(
    moment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Toggle archive state of a Moment (author only)."""
    moment = await toggle_archive(db, moment_id, user_id)
    if moment is None:
        return Result(code=1404, message="时刻不存在或无权限操作", data=None)
    return Result(code=0, message="success", data=MomentResponse.model_validate(moment))


@router.patch("/{moment_id}/privacy", response_model=Result[MomentResponse])
async def update_privacy_endpoint(
    moment_id: UUID,
    body: UpdatePrivacyRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Update the privacy level of a Moment (author only)."""
    moment = await update_privacy(
        db, moment_id, user_id, body.privacy_level, body.visibility_group,
    )
    if moment is None:
        return Result(code=1404, message="时刻不存在或无权限操作", data=None)
    return Result(code=0, message="success", data=MomentResponse.model_validate(moment))
