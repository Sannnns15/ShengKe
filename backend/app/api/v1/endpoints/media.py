from __future__ import annotations

import os
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result
from app.schemas.media import (
    UploadUrlResponse,
    ConfirmUploadRequest,
    MediaResponse,
)
from app.services.media import (
    generate_upload_url,
    create_media_record,
    confirm_upload,
    get_media_by_moment,
    delete_media,
)
from app.models.media import Media
from app.utils import uuid_v7

router = APIRouter()


@router.post("/upload", response_model=Result[UploadUrlResponse])
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Direct file upload for development.

    Saves file to local uploads/ directory, creates a Media record
    with status=1 (uploaded), and returns the URL + object_key.
    """
    # Determine file extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1] or ""
    object_key = f"{uuid_v7().hex}{ext}"

    # Ensure uploads directory exists
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, object_key)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create Media record
    media_type = "image"
    if file.content_type:
        if file.content_type.startswith("video/"):
            media_type = "video"
        elif file.content_type.startswith("audio/"):
            media_type = "audio"

    media = Media(
        user_id=user_id,
        object_key=object_key,
        mime_type=file.content_type,
        file_size=len(content),
        media_type=media_type,
        status=1,  # uploaded
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return Result(
        code=0,
        message="success",
        data=UploadUrlResponse(url=f"/uploads/{object_key}", object_key=object_key),
    )


@router.post("/upload-url", response_model=Result[UploadUrlResponse])
async def get_upload_url(
    file_name: str = Query(..., description="Original file name, e.g. photo.jpg"),
    content_type: str = Query(..., description="MIME type, e.g. image/jpeg"),
):
    """Generate a presigned upload URL for a file.

    Returns a URL the client can PUT to, along with the object_key
    that must be used in the subsequent confirm-upload call.
    """
    result = await generate_upload_url(file_name, content_type)
    return Result(code=0, message="success", data=UploadUrlResponse(**result))


@router.post("/confirm", response_model=Result[MediaResponse])
async def confirm_upload_endpoint(
    body: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Confirm that an upload has completed.

    Marks the Media record as uploaded (status=1) and optionally
    associates it with a Moment.
    """
    # Create the media record first (or find pending one)
    # If the record already exists from a prior step, confirm it
    media = await confirm_upload(db, user_id, body.object_key)
    if media is None:
        return Result(code=1404, message="未找到待确认的上传记录", data=None)
    if body.moment_id:
        media.moment_id = body.moment_id
        await db.commit()
        await db.refresh(media)
    return Result(code=0, message="success", data=MediaResponse.model_validate(media))


@router.get("/{media_id}", response_model=Result[MediaResponse])
async def get_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get media info by ID."""
    result = await db.execute(
        select(Media).where(Media.id == media_id)
    )
    media = result.scalars().first()
    if media is None:
        return Result(code=1404, message="媒体不存在", data=None)
    return Result(code=0, message="success", data=MediaResponse.model_validate(media))


@router.delete("/{media_id}", response_model=Result)
async def delete_media_endpoint(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a media record (owner only)."""
    ok = await delete_media(db, media_id, user_id)
    if not ok:
        return Result(code=1404, message="媒体不存在或无权限删除", data=None)
    return Result(code=0, message="success")
