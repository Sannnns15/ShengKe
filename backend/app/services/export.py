from __future__ import annotations

import json
import csv
import os
import tempfile
from datetime import datetime, timezone
from uuid import UUID
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moment import Moment
from app.models.comment import Comment
from app.models.like import Like
from app.models.media import Media


class ExportTaskStore:
    """In-memory export task status store. Replace with Redis in production."""

    _tasks: dict[UUID, dict] = {}

    @classmethod
    def create_task(cls, user_id: UUID, task_id: UUID) -> dict:
        task: dict[str, Any] = {
            "id": task_id,
            "user_id": user_id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "file_path": None,
            "error": None,
        }
        cls._tasks[task_id] = task
        return task

    @classmethod
    def get_task(cls, task_id: UUID) -> dict | None:
        return cls._tasks.get(task_id)

    @classmethod
    def update_task(cls, task_id: UUID, **kwargs: Any) -> None:
        if task_id in cls._tasks:
            cls._tasks[task_id].update(**kwargs)


async def export_user_data(
    db: AsyncSession,
    user_id: UUID,
    task_id: UUID,
    include_media: bool = True,
) -> None:
    """Background task: export user data to JSON file."""
    ExportTaskStore.update_task(task_id, status="processing")
    try:
        # 1. Fetch moments
        moments_result = await db.execute(
            select(Moment).where(
                Moment.user_id == user_id,
                Moment.deleted_at.is_(None),
            ).order_by(Moment.created_at.desc())
        )
        moments = moments_result.scalars().all()

        data: dict[str, list] = {"moments": []}
        for m in moments:
            moment_data: dict[str, Any] = {
                "id": str(m.id),
                "title": m.title,
                "content": m.content,
                "mood": m.mood,
                "weather": m.weather,
                "location_name": m.location_name,
                "privacy_level": m.privacy_level,
                "ai_tags": m.ai_tags,
                "ai_summary": m.ai_summary,
                "ai_emotion": m.ai_emotion,
                "like_count": m.like_count,
                "comment_count": m.comment_count,
                "created_at": m.created_at.isoformat(),
            }
            # Fetch comments for this moment
            comments_result = await db.execute(
                select(Comment).where(
                    Comment.moment_id == m.id,
                    Comment.deleted_at.is_(None),
                )
            )
            comments = comments_result.scalars().all()
            moment_data["comments"] = [
                {
                    "content": c.content,
                    "created_at": c.created_at.isoformat(),
                }
                for c in comments
            ]
            # Fetch media for this moment
            if include_media:
                media_result = await db.execute(
                    select(Media).where(Media.moment_id == m.id)
                )
                media_list = media_result.scalars().all()
                moment_data["media"] = [
                    {
                        "object_key": m_obj.object_key,
                        "mime_type": m_obj.mime_type,
                    }
                    for m_obj in media_list
                ]
            data["moments"].append(moment_data)

        # 2. Export to JSON file
        export_dir = os.path.join(tempfile.gettempdir(), "shengke_exports")
        os.makedirs(export_dir, exist_ok=True)
        file_path = os.path.join(
            export_dir, f"export_{user_id}_{task_id}.json"
        )
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        ExportTaskStore.update_task(
            task_id, status="done", file_path=file_path
        )
    except Exception as e:
        ExportTaskStore.update_task(task_id, status="failed", error=str(e))


async def get_task_status(task_id: UUID) -> dict | None:
    """Get the current status of an export task."""
    return ExportTaskStore.get_task(task_id)
