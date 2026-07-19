"""Media upload service — OSS presigned URL generation and management.

When OSS settings are empty (dev/test), returns mock upload URLs.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Media
from app.core.config import get_settings


def _gen_object_key(file_name: str) -> str:
    """Generate a unique object key for OSS storage."""
    ext = ""
    if "." in file_name:
        ext = file_name[file_name.rfind("."):]
    return f"uploads/{uuid.uuid4().hex}{ext}"


def _oss_enabled() -> bool:
    """Check if OSS configuration is available."""
    settings = get_settings()
    return bool(
        settings.ali_oss_endpoint
        and settings.ali_oss_bucket
        and settings.ali_oss_access_key_id
        and settings.ali_oss_access_key_secret
    )


async def generate_upload_url(
    file_name: str,
    content_type: str,
) -> dict[str, str]:
    """Generate a presigned upload URL for the given file.

    When OSS is not configured, returns a mock URL.
    """
    object_key = _gen_object_key(file_name)

    if not _oss_enabled():
        return {
            "url": f"/mock-uploads/{object_key}",
            "object_key": object_key,
        }

    # TODO: implement real OSS presigned URL generation
    # Example with alibabacloud_oss_v2:
    #   import oss2
    #   auth = oss2.Auth(settings.ali_oss_access_key_id, settings.ali_oss_access_key_secret)
    #   bucket = oss2.Bucket(auth, settings.ali_oss_endpoint, settings.ali_oss_bucket)
    #   url = bucket.sign_url('PUT', object_key, expires=3600)
    raise NotImplementedError("OSS presigned URL generation not yet implemented")


async def create_media_record(
    db: AsyncSession,
    user_id: uuid.UUID,
    file_info: dict[str, Any],
) -> Media:
    """Create a Media record for a pending upload."""
    media = Media(
        user_id=user_id,
        object_key=file_info["object_key"],
        mime_type=file_info.get("mime_type"),
        file_size=file_info.get("file_size"),
        media_type=file_info.get("media_type", "image"),
        status=0,  # pending
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media


async def confirm_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    object_key: str,
) -> Media | None:
    """Confirm that an upload has completed.

    Finds the pending Media record matching the object_key and user_id,
    then marks it as uploaded (status=1).
    """
    result = await db.execute(
        select(Media).where(
            Media.object_key == object_key,
            Media.user_id == user_id,
            Media.status == 0,
        )
    )
    media = result.scalars().first()
    if media is None:
        return None

    media.status = 1  # uploaded
    media.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(media)
    return media


async def get_media_by_moment(
    db: AsyncSession,
    moment_id: uuid.UUID,
) -> list[Media]:
    """Get all Media records associated with a Moment."""
    result = await db.execute(
        select(Media)
        .where(
            Media.moment_id == moment_id,
            Media.status == 1,
        )
        .order_by(Media.created_at.asc())
    )
    return list(result.scalars().all())


async def delete_media(
    db: AsyncSession,
    media_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Soft-delete / remove a Media record (owner only).

    Returns True if deleted, False if not found or not owner.
    """
    result = await db.execute(
        select(Media).where(
            Media.id == media_id,
            Media.user_id == user_id,
        )
    )
    media = result.scalars().first()
    if media is None:
        return False

    await db.delete(media)
    await db.commit()
    return True
