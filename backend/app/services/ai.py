from __future__ import annotations

import random
from datetime import datetime, timezone, timedelta
from uuid import UUID

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.moment import Moment

settings = get_settings()

MOCK_TAGS_POOL = [
    "生活记录", "心情", "日常", "美食", "旅行",
    "工作", "学习", "运动", "阅读", "电影",
    "音乐", "家人", "朋友", "感悟", "风景",
]


async def _call_llm(messages: list[dict], max_tokens: int = 512) -> str | None:
    """Call the 通义千问 (Aliyun LLM) compatible API.

    Returns the response content string, or None if the call fails.
    When ali_llm_api_key is empty, returns a mock response.
    """
    if not settings.ali_llm_api_key:
        return None  # Caller should fall back to mock data

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{settings.ali_llm_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.ali_llm_api_key}"},
                json={
                    "model": settings.ali_llm_model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                },
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            # Log error silently; fall back to mock
            print(f"[AI Service] LLM call failed: {e}")
            return None


async def _generate_mock_tags() -> list[str]:
    """Generate mock AI tags."""
    tags = ["生活记录", "心情"]
    extra = random.sample(MOCK_TAGS_POOL, min(random.randint(1, 3), len(MOCK_TAGS_POOL)))
    for t in extra:
        if t not in tags:
            tags.append(t)
    return tags


async def analyze_moment(db: AsyncSession, moment_id: UUID) -> dict | None:
    """Analyze a single Moment using AI (or mock mode).

    Extracts tags, summary, and emotion from the moment content.
    Updates the Moment record in the database with the results.

    Returns a dict with 'ai_tags', 'ai_summary', 'ai_emotion' keys,
    or None if the moment is not found.
    """
    # Fetch the moment
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()
    if moment is None:
        return None

    # Prepare content for analysis
    content_text = moment.content or ""
    title_text = moment.title or ""
    full_text = f"标题：{title_text}\n内容：{content_text}" if title_text else content_text

    if not full_text.strip():
        # No content to analyze, use mock
        tags = await _generate_mock_tags()
        result_data = {
            "ai_tags": tags,
            "ai_summary": "这是一条生活记录",
            "ai_emotion": "neutral",
        }
        moment.ai_tags = list(dict.fromkeys((moment.ai_tags or []) + tags))
        moment.ai_summary = "这是一条生活记录"
        moment.ai_emotion = "neutral"
        await db.commit()
        await db.refresh(moment)
        return result_data

    # Build the prompt
    system_prompt = (
        "你是一名生活记录分析助手。请分析以下生活记录，并以JSON格式返回结果。"
        "字段说明：\n"
        "- tags: 标签列表，每个标签是2-4个字的中文词，3-5个标签\n"
        "- summary: 一句话摘要（20字以内）\n"
        "- emotion: 情绪分类，只能是 \"positive\"、\"neutral\" 或 \"negative\"\n\n"
        "只返回JSON，不要额外说明。"
    )

    user_prompt = f"请分析这条生活记录：\n{full_text}"

    response_text = await _call_llm(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )

    if response_text:
        # Try to parse JSON from the response
        import json
        try:
            # Find JSON block in response (handle potential markdown wrapping)
            json_str = response_text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[len("```json"):]
            if json_str.startswith("```"):
                json_str = json_str[len("```"):]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            json_str = json_str.strip()

            data = json.loads(json_str)
            tags = data.get("tags", ["生活记录", "心情"])
            summary = data.get("summary", "这是一条生活记录")
            emotion = data.get("emotion", "neutral")

            # Validate emotion
            if emotion not in ("positive", "neutral", "negative"):
                emotion = "neutral"

            result_data = {
                "ai_tags": tags,
                "ai_summary": summary,
                "ai_emotion": emotion,
            }
            moment.ai_tags = list(dict.fromkeys((moment.ai_tags or []) + tags))
            moment.ai_summary = summary
            moment.ai_emotion = emotion
            await db.commit()
            await db.refresh(moment)
            return result_data
        except (json.JSONDecodeError, KeyError, TypeError):
            # Fallback to mock if parsing fails
            pass

    # Fallback to mock data
    tags = await _generate_mock_tags()
    result_data = {
        "ai_tags": tags,
        "ai_summary": "这是一条生活记录",
        "ai_emotion": "neutral",
    }
    moment.ai_tags = list(dict.fromkeys((moment.ai_tags or []) + tags))
    moment.ai_summary = "这是一条生活记录"
    moment.ai_emotion = "neutral"
    await db.commit()
    await db.refresh(moment)
    return result_data


async def chat_with_ai(
    user_id: UUID,
    message: str,
    context_moments: list[Moment] | None = None,
) -> str:
    """AI companion chat.

    Sends a message to the AI and returns the reply.
    Optionally includes recent moments as context.
    When ali_llm_api_key is empty, returns a mock reply.
    """
    if not settings.ali_llm_api_key:
        return "我是 ShengKe AI 助手。这是一条模拟回复。配置通义千问 API Key 后可以获得真实回复。"

    # Build system prompt with context
    system_prompt = (
        "你是一名温暖的AI生活陪伴助手，名叫ShengKe。"
        "你帮助用户记录生活、分析情绪、提供建议。"
        "请用自然、友好的语气回复，不要使用Markdown格式。"
        "回复控制在100字以内。"
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add context moments if provided
    if context_moments:
        context_text = "以下是用户最近的生活记录，供你参考：\n"
        for m in context_moments:
            title = m.title or ""
            content = m.content or ""
            created = m.created_at.strftime("%Y-%m-%d") if m.created_at else ""
            context_text += f"- [{created}] {title}: {content}\n"
        messages.append({"role": "system", "content": context_text})

    # Add user message
    messages.append({"role": "user", "content": message})

    response_text = await _call_llm(messages, max_tokens=512)
    if response_text:
        return response_text.strip()

    return "我是 ShengKe AI 助手。这是一条模拟回复。配置通义千问 API Key 后可以获得真实回复。"
