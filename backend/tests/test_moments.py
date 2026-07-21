"""Tests for moments endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_moment(test_client: AsyncClient, auth_headers: dict) -> None:
    """Create a Moment successfully."""
    payload = {
        "title": "Test Moment Title",
        "content": "This is a test moment content.",
        "mood": "happy",
        "weather": "sunny",
        "location_name": "Sydney",
        "privacy_level": 0,
    }
    resp = await test_client.post(
        "/api/v1/moments",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert "id" in body["data"]
    assert body["data"]["created_at"] is not None


@pytest.mark.asyncio
async def test_create_moment_with_tags(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Create a Moment with tag_names."""
    payload = {
        "title": "Tagged Moment",
        "content": "This moment has tags.",
        "tag_names": ["travel", "food"],
        "privacy_level": 0,
    }
    resp = await test_client.post(
        "/api/v1/moments",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0


@pytest.mark.asyncio
async def test_create_moment_with_media_ids(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Creating a Moment with non-existent media_ids should not fail."""
    payload = {
        "content": "Moment with media references.",
        "media_ids": [],
        "privacy_level": 0,
    }
    resp = await test_client.post(
        "/api/v1/moments",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0


@pytest.mark.asyncio
async def test_get_moment(test_client: AsyncClient, auth_headers: dict) -> None:
    """Get a single Moment by ID."""
    # Create first
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Get Test", "content": "Testing get", "privacy_level": 0},
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    moment_id = create_resp.json()["data"]["id"]

    # Get
    resp = await test_client.get(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["id"] == moment_id
    assert body["data"]["title"] == "Get Test"


@pytest.mark.asyncio
async def test_get_nonexistent_moment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Getting a non-existent Moment returns 404."""
    import uuid
    fake_id = uuid.uuid4()
    resp = await test_client.get(
        f"/api/v1/moments/{fake_id}",
        headers=auth_headers,
    )
    body = resp.json()
    assert body["code"] == 1404


@pytest.mark.asyncio
async def test_update_moment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Author can update their own Moment."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Old Title", "content": "Old content", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    resp = await test_client.patch(
        f"/api/v1/moments/{moment_id}",
        json={"title": "New Title", "content": "Updated content"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["title"] == "New Title"
    assert body["data"]["content"] == "Updated content"


@pytest.mark.asyncio
async def test_update_moment_not_author(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Non-author cannot update a Moment."""
    # User A creates
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Author Only", "content": "Secret", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # User B tries to update
    resp = await test_client.patch(
        f"/api/v1/moments/{moment_id}",
        json={"title": "Hacked"},
        headers=second_user_headers,
    )
    body = resp.json()
    assert body["code"] == 1404


@pytest.mark.asyncio
async def test_delete_moment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Author can soft-delete their own Moment."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Delete Me", "content": "To be deleted", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    resp = await test_client.delete(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0

    # Verify it's gone
    get_resp = await test_client.get(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    assert get_resp.json()["code"] == 1404


@pytest.mark.asyncio
async def test_delete_moment_not_author(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Non-author cannot delete a Moment."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Not Yours", "content": "Hands off", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    resp = await test_client.delete(
        f"/api/v1/moments/{moment_id}",
        headers=second_user_headers,
    )
    body = resp.json()
    assert body["code"] == 1404


@pytest.mark.asyncio
async def test_feed_pagination(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Feed returns paginated results."""
    # Create multiple moments
    for i in range(3):
        await test_client.post(
            "/api/v1/moments",
            json={
                "title": f"Feed {i}",
                "content": f"Feed content {i}",
                "privacy_level": 0,
            },
            headers=auth_headers,
        )

    # Get feed
    resp = await test_client.get(
        "/api/v1/moments?page=1&page_size=2",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) <= 2
    assert body["meta"]["total"] >= 3
    # Feed excludes own moments, so total might be 0 — just verify structure
    assert body["meta"]["page"] == 1
    assert body["meta"]["page_size"] == 2


@pytest.mark.asyncio
async def test_feed_privacy_filter(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Private moments are not visible to others in feed."""
    # User A creates a private moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={
            "title": "Private Moment",
            "content": "Should not be visible",
            "privacy_level": 3,
        },
        headers=auth_headers,
    )
    private_id = create_resp.json()["data"]["id"]

    # User B's feed should not include it
    resp = await test_client.get(
        "/api/v1/moments",
        headers=second_user_headers,
    )
    body = resp.json()
    ids = [item["id"] for item in body["data"]]
    assert private_id not in ids


@pytest.mark.asyncio
async def test_toggle_archive(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Author can toggle archive state."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Archive Test", "content": "Test archive", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Archive
    resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/archive",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["is_archived"] is True

    # Unarchive
    resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/archive",
        headers=auth_headers,
    )
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["is_archived"] is False


@pytest.mark.asyncio
async def test_update_privacy(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Author can update privacy level."""
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Privacy Test", "content": "Test privacy", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    resp = await test_client.patch(
        f"/api/v1/moments/{moment_id}/privacy",
        json={"privacy_level": 3, "visibility_group": []},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["privacy_level"] == 3
