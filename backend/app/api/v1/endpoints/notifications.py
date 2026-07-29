from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.notification import NotificationItem, UnreadCountResponse
from app.services.notification import (
    get_user_notifications,
    mark_as_read,
    mark_all_as_read,
    get_unread_count,
)

router = APIRouter()


@router.get("", response_model=PaginatedResult[NotificationItem])
async def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get paginated notifications for the current user."""
    notifications, total = await get_user_notifications(db, user_id, page, page_size)
    items = [NotificationItem(**n) for n in notifications]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.patch("/{notification_id}/read", response_model=Result)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Mark a single notification as read."""
    ok = await mark_as_read(db, notification_id, user_id)
    if not ok:
        return Result(code=1404, message="通知不存在")
    return Result(code=0, message="success")


@router.patch("/read-all", response_model=Result)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Mark all notifications as read."""
    count = await mark_all_as_read(db, user_id)
    return Result(code=0, message="success", data={"updated": count})


@router.get("/unread-count", response_model=Result[UnreadCountResponse])
async def unread_notification_count(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the number of unread notifications."""
    count = await get_unread_count(db, user_id)
    return Result(code=0, message="success", data=UnreadCountResponse(count=count))
