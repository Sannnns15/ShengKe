from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.moment import FeedItem
from app.schemas.user_profile import (
    UserProfileResponse,
    UpdateProfileRequest,
)
from app.schemas.user_settings import UserSettingsResponse, UpdateUserSettingsRequest
from app.services.user import (
    get_own_profile,
    get_user_profile,
    update_user_profile,
    delete_user,
    get_user_moments,
)
from app.services.user_settings import get_user_settings, update_user_settings
from app.services.export import (
    ExportTaskStore,
    export_user_data,
    get_task_status,
)
from app.utils import uuid_v7
import os

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


@router.get("/me/settings", response_model=Result[UserSettingsResponse])
async def get_my_settings(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the current user's settings."""
    settings = await get_user_settings(db, user_id)
    if settings is None:
        return Result(code=1404, message="用户不存在", data=None)
    return Result(code=0, message="success", data=settings)


@router.patch("/me/settings", response_model=Result[UserSettingsResponse])
async def update_my_settings(
    body: UpdateUserSettingsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Update the current user's settings (partial update)."""
    settings = await update_user_settings(db, user_id, body)
    if settings is None:
        return Result(code=1404, message="用户不存在", data=None)
    return Result(code=0, message="success", data=settings)


@router.get("/{user_id}/moments", response_model=PaginatedResult[FeedItem])
async def get_user_moments_route(
    user_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
):
    """Get a user's moments with author info and like status.

    The owner sees all non-deleted moments; other users see only public ones.
    """
    items, total = await get_user_moments(
        db, user_id, current_user_id, page, page_size,
    )
    return PaginatedResult(
        code=0,
        message="success",
        data=[FeedItem(**m) for m in items],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


# ── Data Export ──


@router.post("/me/export", response_model=Result)
async def request_export(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Request an export of all user data (moments, comments, media).

    Returns a task_id that can be polled for status.
    """
    task_id = uuid_v7()
    ExportTaskStore.create_task(user_id, task_id)
    background_tasks.add_task(export_user_data, db, user_id, task_id)
    return Result(
        code=0,
        message="success",
        data={"task_id": str(task_id), "status": "pending"},
    )


@router.get("/me/export/{task_id}", response_model=Result)
async def get_export_status(
    task_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the status of an export task."""
    task = await get_task_status(task_id)
    if task is None:
        return Result(code=1404, message="导出任务不存在", data=None)
    if task["user_id"] != user_id:
        return Result(
            code=1403, message="无权查看此导出任务", data=None
        )
    return Result(
        code=0,
        message="success",
        data={
            "task_id": str(task["id"]),
            "status": task["status"],
            "error": task.get("error"),
            "created_at": task["created_at"].isoformat(),
        },
    )


@router.get("/me/export/{task_id}/download")
async def download_export(
    task_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Download the exported data file."""
    task = await get_task_status(task_id)
    if task is None:
        return Result(code=1404, message="导出任务不存在", data=None)
    if task["user_id"] != user_id:
        return Result(
            code=1403, message="无权下载此导出文件", data=None
        )
    if task["status"] != "done":
        return Result(
            code=1400,
            message="导出尚未完成",
            data=None,
        )
    file_path = task.get("file_path")
    if not file_path or not os.path.exists(file_path):
        return Result(code=1404, message="导出文件不存在", data=None)
    return FileResponse(
        path=file_path,
        filename=f"shengke_export_{task_id}.json",
        media_type="application/json",
    )
