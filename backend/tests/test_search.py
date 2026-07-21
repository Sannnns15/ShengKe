"""Tests for search endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_moments(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Search moments by keyword."""
    # Create a moment with searchable content
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={
            "title": "UniqueSearchTerm Sydney",
            "content": "This is about searching for Sydney landmarks",
            "privacy_level": 0,
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200

    # Search for it
    resp = await test_client.get(
        "/api/v1/search/moments?q=Sydney",
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert len(body["data"]) >= 1, "Expected at least 1 result"
    # Verify FeedItem format with author info
    item = body["data"][0]
    assert "author_nickname" in item
    assert "author_avatar_url" in item
    assert "is_liked" in item


@pytest.mark.asyncio
async def test_search_moments_with_tag(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Search moments with tag filter."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={
            "title": "Tagged Search",
            "content": "This has special tags",
            "tag_names": ["test-tag-xzy"],
            "privacy_level": 0,
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200

    # Search with tag
    resp = await test_client.get(
        "/api/v1/search/moments?q=Tagged&tag=test-tag-xzy",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) >= 1


@pytest.mark.asyncio
async def test_search_users(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Search users by nickname."""
    # The user registered by auth_headers has a nickname like "test_user_XXXX"
    # Search for a distinct part of it
    resp = await test_client.get(
        "/api/v1/search/users?q=test_user",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) >= 1, f"Expected at least 1 user, got {body}"
    assert body["data"][0]["nickname"].startswith("test_user")


@pytest.mark.asyncio
async def test_search_no_results(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Search with a term that has no matches returns empty results."""
    resp = await test_client.get(
        "/api/v1/search/moments?q=ZZZZNONEXISTENT9999",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) == 0
    assert body["meta"]["total"] == 0
