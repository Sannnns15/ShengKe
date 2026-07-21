"""Redis caching utilities for ShengKe.

Provides simple async helpers for common caching patterns.
Default TTLs:
  - Feed entries: 60s
  - User profile: 300s
  - Moment detail: 120s
  - Search results: 30s
"""
from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings

settings = get_settings()

# Global Redis client (lazy-init)
_client: redis.Redis | None = None

TTL = {
    "feed": 60,
    "profile": 300,
    "moment": 120,
    "search": 30,
    "counters": 10,
}


async def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _client


async def close():
    global _client
    if _client:
        await _client.close()
        _client = None


async def get(key: str) -> Any | None:
    try:
        client = await get_client()
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass  # Cache miss -> fall through to DB
    return None


async def set(key: str, value: Any, ttl: int = 60) -> None:
    try:
        client = await get_client()
        await client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass  # Cache write failure -> non-fatal


async def delete(key: str) -> None:
    try:
        client = await get_client()
        await client.delete(key)
    except Exception:
        pass


async def delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern (e.g., 'feed:*')."""
    try:
        client = await get_client()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception:
        pass


def make_key(prefix: str, *parts: str | int) -> str:
    return "shengke:" + prefix + ":" + ":".join(str(p) for p in parts)
