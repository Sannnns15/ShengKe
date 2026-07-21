"""Tests for likes endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_like_moment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Like a Moment."""
    # Create a moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Like Test", "content": "Test like", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Like it
    resp = await test_client.post(
        "/api/v1/likes/toggle",
        json={"target_type": 1, "target_id": moment_id},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert body["data"]["is_liked"] is True
    assert body["data"]["count"] == 1


@pytest.mark.asyncio
async def test_unlike_moment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Unlike a previously liked Moment."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Unlike Test", "content": "Test unlike", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Like
    await test_client.post(
        "/api/v1/likes/toggle",
        json={"target_type": 1, "target_id": moment_id},
        headers=auth_headers,
    )

    # Unlike
    resp = await test_client.post(
        "/api/v1/likes/toggle",
        json={"target_type": 1, "target_id": moment_id},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["is_liked"] is False
    assert body["data"]["count"] == 0


@pytest.mark.asyncio
async def test_like_twice_is_idempotent(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Liking twice toggles back to unliked (toggle behavior)."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Idempotent", "content": "Double like", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Like
    await test_client.post(
        "/api/v1/likes/toggle",
        json={"target_type": 1, "target_id": moment_id},
        headers=auth_headers,
    )

    # Verify status
    status_resp = await test_client.get(
        f"/api/v1/likes/status?target_type=1&target_id={moment_id}",
        headers=auth_headers,
    )
    body = status_resp.json()
    assert body["data"]["is_liked"] is True
    assert body["data"]["count"] == 1


@pytest.mark.asyncio
async def test_like_count_updates(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Like count on the Moment is updated correctly."""
    # User A creates a moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Count Test", "content": "Test count", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # User B likes it
    await test_client.post(
        "/api/v1/likes/toggle",
        json={"target_type": 1, "target_id": moment_id},
        headers=second_user_headers,
    )

    # Check moment like_count
    get_resp = await test_client.get(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    body = get_resp.json()
    assert body["code"] == 0
    assert body["data"]["like_count"] == 1
