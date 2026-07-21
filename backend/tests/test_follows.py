"""Tests for follows endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_follow_user(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Follow another user."""
    # Get second user's ID by looking at their profile
    # We need to know the second user's ID. Let's get it from a moment they create.
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={
            "title": "Follow Target",
            "content": "I am user 2",
            "privacy_level": 0,
        },
        headers=second_user_headers,
    )
    assert create_resp.status_code == 200
    target_user_id = create_resp.json()["data"]["user_id"]

    # Follow them
    resp = await test_client.post(
        f"/api/v1/users/{target_user_id}/follow",
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"


@pytest.mark.asyncio
async def test_unfollow_user(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Unfollow a user."""
    # Get second user's ID
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Unfollow Target", "content": "User 2", "privacy_level": 0},
        headers=second_user_headers,
    )
    target_user_id = create_resp.json()["data"]["user_id"]

    # Follow first
    await test_client.post(
        f"/api/v1/users/{target_user_id}/follow",
        headers=auth_headers,
    )

    # Then unfollow
    resp = await test_client.delete(
        f"/api/v1/users/{target_user_id}/follow",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0


@pytest.mark.asyncio
async def test_cannot_follow_self(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Cannot follow yourself."""
    # Get own user ID from creating a moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Self", "content": "Self follow test", "privacy_level": 0},
        headers=auth_headers,
    )
    own_id = create_resp.json()["data"]["user_id"]

    # Try to follow self
    resp = await test_client.post(
        f"/api/v1/users/{own_id}/follow",
        headers=auth_headers,
    )
    body = resp.json()
    assert body["code"] == 1404


@pytest.mark.asyncio
async def test_followers_list(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Get followers list."""
    # User B creates moment to get their ID
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Followers", "content": "Test", "privacy_level": 0},
        headers=second_user_headers,
    )
    user_b_id = create_resp.json()["data"]["user_id"]

    # User A follows User B
    await test_client.post(
        f"/api/v1/users/{user_b_id}/follow",
        headers=auth_headers,
    )

    # User B checks their followers
    resp = await test_client.get(
        f"/api/v1/users/{user_b_id}/followers",
        headers=second_user_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) >= 1
    # A follower entry exists


@pytest.mark.asyncio
async def test_following_list(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Get following list."""
    # User B creates moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Following", "content": "Test", "privacy_level": 0},
        headers=second_user_headers,
    )
    user_b_id = create_resp.json()["data"]["user_id"]

    # User A follows User B
    await test_client.post(
        f"/api/v1/users/{user_b_id}/follow",
        headers=auth_headers,
    )

    # User A checks who they're following
    resp = await test_client.get(
        f"/api/v1/users/{user_b_id}/following",
        headers=auth_headers,
    )
    # This checks user_b's following, but user A followed user B — so user B's following may be empty
    # Actually this reads another user's following list; we want user A's following.
    # Let's get user A's ID
    create_a_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "User A Moment", "content": "A's moment", "privacy_level": 0},
        headers=auth_headers,
    )
    user_a_id = create_a_resp.json()["data"]["user_id"]

    resp = await test_client.get(
        f"/api/v1/users/{user_a_id}/following",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) >= 1
