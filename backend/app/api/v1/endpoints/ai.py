from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone, timedelta, date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result
from app.schemas.ai import MoodReportResponse, MoodStatsResponse, ChatRequest, ChatResponse
from app.services.ai import analyze_moment as analyze_moment_service, chat_with_ai
from app.models.moment import Moment

router = APIRouter()


@router.post("/moments/{moment_id}/analyze", response_model=Result)
async def analyze_moment(
    moment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Analyze a single Moment with AI (tag extraction, summary, emotion)."""
    # Check that the moment belongs to the current user
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()

    if moment is None:
        raise HTTPException(status_code=404, detail="Moment not found")

    if moment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot analyze another user's moment")

    analysis = await analyze_moment_service(db, moment_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Moment not found")

    return Result(
        code=0,
        message="success",
        data=analysis,
    )


@router.get("/mood-report", response_model=Result[MoodReportResponse])
async def get_mood_report(
    period: str = Query("week", pattern="^(week|month)$"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Generate a mood report for the specified period.

    Statistics include emotion distribution, daily mood breakdown, and top keywords.
    """
    now = datetime.now(timezone.utc)

    # Determine date range
    if start_date and end_date:
        start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
    elif period == "week":
        start = now - timedelta(days=7)
        end = now
    else:  # month
        start = now - timedelta(days=30)
        end = now

    # Fetch moments in range
    moments_result = await db.execute(
        select(Moment).where(
            Moment.user_id == user_id,
            Moment.deleted_at.is_(None),
            Moment.created_at >= start,
            Moment.created_at <= end,
        ).order_by(Moment.created_at.asc())
    )
    moments = list(moments_result.scalars().all())

    if not moments:
        return Result(
            code=0,
            message="success",
            data=MoodReportResponse(
                period=period,
                summary="该时间段内没有记录",
                emotion_distribution={},
                daily_moods=[],
                top_keywords=[],
            ),
        )

    # Emotion distribution
    emotion_counts = Counter()
    for m in moments:
        emotion = m.ai_emotion or "neutral"
        emotion_counts[emotion] += 1

    emotion_distribution = dict(emotion_counts)

    # Daily mood breakdown
    daily_map: dict[str, dict] = {}
    for m in moments:
        day_key = m.created_at.strftime("%Y-%m-%d") if m.created_at else "unknown"
        if day_key not in daily_map:
            daily_map[day_key] = {"date": day_key, "total": 0, "positive": 0, "neutral": 0, "negative": 0}
        daily_map[day_key]["total"] += 1
        emotion = m.ai_emotion or "neutral"
        daily_map[day_key][emotion] += 1

    daily_moods = sorted(daily_map.values(), key=lambda x: x["date"])

    # Top keywords from ai_tags
    all_tags = []
    for m in moments:
        if m.ai_tags:
            all_tags.extend(m.ai_tags)
    tag_counter = Counter(all_tags)
    top_keywords = [{"keyword": k, "count": v} for k, v in tag_counter.most_common(10)]

    # Generate summary
    total = len(moments)
    if total > 0:
        dominant_emotion = emotion_counts.most_common(1)[0][0]
        emotion_labels = {"positive": "积极", "neutral": "中性", "negative": "消极"}
        dominant_label = emotion_labels.get(dominant_emotion, "中性")
        summary = f"在最近{total}条记录中，整体情绪偏向{dominant_label}"
    else:
        summary = "该时间段内没有记录"

    return Result(
        code=0,
        message="success",
        data=MoodReportResponse(
            period=period,
            summary=summary,
            emotion_distribution=emotion_distribution,
            daily_moods=daily_moods,
            top_keywords=top_keywords,
        ),
    )


@router.post("/chat", response_model=Result[ChatResponse])
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """AI companion chat. Send a message and get an AI reply.

    Optionally provide context_moment_ids to include specific moments
    as context for the AI.
    """
    # Fetch context moments if provided
    context_moments = None
    if body.context_moment_ids:
        result = await db.execute(
            select(Moment).where(
                Moment.id.in_(body.context_moment_ids),
                Moment.user_id == user_id,
                Moment.deleted_at.is_(None),
            )
        )
        context_moments = list(result.scalars().all())

    reply = await chat_with_ai(
        user_id=user_id,
        message=body.message,
        context_moments=context_moments,
    )

    return Result(
        code=0,
        message="success",
        data=ChatResponse(reply=reply),
    )


@router.get("/mood-stats", response_model=Result[MoodStatsResponse])
async def get_mood_stats(
    days: int = Query(default=30, ge=7, le=90, description="统计天数范围"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get mood statistics for frontend charts.

    Returns:
    - daily_moods: array of {date, positive, neutral, negative, count} for each day
    - emotion_pie: {positive: N, neutral: N, negative: N} totals
    - top_tags: top 10 AI tags by frequency
    """
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # Fetch moments in range
    moments_result = await db.execute(
        select(Moment).where(
            Moment.user_id == user_id,
            Moment.deleted_at.is_(None),
            Moment.created_at >= start,
            Moment.created_at <= now,
        ).order_by(Moment.created_at.asc())
    )
    moments = list(moments_result.scalars().all())

    if not moments:
        return Result(
            code=0,
            message="success",
            data=MoodStatsResponse(
                daily_moods=[],
                emotion_pie={},
                top_tags=[],
            ),
        )

    # Emotion distribution (pie chart)
    emotion_counts = Counter()
    for m in moments:
        emotion = m.ai_emotion or "neutral"
        emotion_counts[emotion] += 1

    emotion_pie = dict(emotion_counts)

    # Daily mood breakdown
    daily_map: dict[str, dict] = {}
    for m in moments:
        day_key = m.created_at.strftime("%Y-%m-%d") if m.created_at else "unknown"
        if day_key not in daily_map:
            daily_map[day_key] = {"date": day_key, "positive": 0, "neutral": 0, "negative": 0, "count": 0}
        daily_map[day_key]["count"] += 1
        emotion = m.ai_emotion or "neutral"
        daily_map[day_key][emotion] += 1

    daily_moods = sorted(daily_map.values(), key=lambda x: x["date"])

    # Top tags from ai_tags
    all_tags = []
    for m in moments:
        if m.ai_tags:
            all_tags.extend(m.ai_tags)
    tag_counter = Counter(all_tags)
    top_tags = [{"tag": k, "count": v} for k, v in tag_counter.most_common(10)]

    return Result(
        code=0,
        message="success",
        data=MoodStatsResponse(
            daily_moods=daily_moods,
            emotion_pie=emotion_pie,
            top_tags=top_tags,
        ),
    )
