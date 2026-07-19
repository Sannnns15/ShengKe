from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class MoodReportResponse(BaseModel):
    """Response model for mood report."""
    period: str  # "week" | "month"
    summary: str
    emotion_distribution: dict[str, int]  # e.g. {"positive": 5, "neutral": 3, "negative": 1}
    daily_moods: list[dict]  # e.g. [{"date": "2026-07-13", "total": 2, "positive": 1, "neutral": 1, "negative": 0}]
    top_keywords: list[dict]  # e.g. [{"keyword": "生活", "count": 5}]

    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat(),
        }


class ChatRequest(BaseModel):
    """Request model for AI chat."""
    message: str
    context_moment_ids: list[UUID] | None = None


class ChatResponse(BaseModel):
    """Response model for AI chat."""
    reply: str
