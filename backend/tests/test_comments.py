"""Tests for comments endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_comment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Create a comment on a Moment."""
    # Create a moment first
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Comment Test", "content": "Test comment", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Create comment
    resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={"moment_id": moment_id, "content": "Nice moment!"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert body["data"]["content"] == "Nice moment!"
    assert body["data"]["moment_id"] == moment_id
    assert body["data"]["parent_id"] is None


@pytest.mark.asyncio
async def test_create_reply_comment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Create a reply (nested comment) to an existing comment."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Reply Test", "content": "Test reply", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Create parent comment
    parent_resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={"moment_id": moment_id, "content": "Parent comment"},
        headers=auth_headers,
    )
    parent_id = parent_resp.json()["data"]["id"]

    # Create reply
    reply_resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={
            "moment_id": moment_id,
            "content": "Reply to parent",
            "parent_id": parent_id,
        },
        headers=auth_headers,
    )
    assert reply_resp.status_code == 200
    body = reply_resp.json()
    assert body["code"] == 0
    assert body["data"]["parent_id"] == parent_id


@pytest.mark.asyncio
async def test_list_comments(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """List comments for a Moment."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "List Comments", "content": "Test list", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Create a comment
    await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={"moment_id": moment_id, "content": "First comment"},
        headers=auth_headers,
    )

    # List comments
    resp = await test_client.get(
        f"/api/v1/moments/{moment_id}/comments",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert len(body["data"]) >= 1
    assert body["data"][0]["content"] == "First comment"
    assert body["data"][0]["author_nickname"] is not None


@pytest.mark.asyncio
async def test_delete_comment(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Author can delete their own comment."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Delete Comment", "content": "Test delete", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Create comment
    comment_resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={"moment_id": moment_id, "content": "Delete me"},
        headers=auth_headers,
    )
    comment_id = comment_resp.json()["data"]["id"]

    # Delete comment
    resp = await test_client.delete(
        f"/api/v1/comments/{comment_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0


@pytest.mark.asyncio
async def test_delete_comment_not_author(
    test_client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
) -> None:
    """Non-author cannot delete a comment."""
    # User A creates moment and comment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={"title": "Not Yours", "content": "Comment delete", "privacy_level": 0},
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    comment_resp = await test_client.post(
        f"/api/v1/moments/{moment_id}/comments",
        json={"moment_id": moment_id, "content": "User A's comment"},
        headers=auth_headers,
    )
    comment_id = comment_resp.json()["data"]["id"]

    # User B tries to delete
    resp = await test_client.delete(
        f"/api/v1/comments/{comment_id}",
        headers=second_user_headers,
    )
    body = resp.json()
    assert body["code"] == 1404


@pytest.mark.asyncio
async def test_comment_count_decrements_on_delete(
    test_client: AsyncClient, auth_headers: dict,
) -> None:
    """Deleting a comment decrements the moment's comment_count."""
    # Create moment
    create_resp = await test_client.post(
        "/api/v1/moments",
        json={
            "title": "Count Test",
            "content": "Test comment count",
            "privacy_level": 0,
        },
        headers=auth_headers,
    )
    moment_id = create_resp.json()["data"]["id"]

    # Create 2 comments
    for i in range(2):
        await test_client.post(
            f"/api/v1/moments/{moment_id}/comments",
            json={"moment_id": moment_id, "content": f"Comment {i}"},
            headers=auth_headers,
        )

    # Get moment to check count
    get_resp = await test_client.get(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    assert get_resp.json()["data"]["comment_count"] == 2

    # Delete one comment
    # List comments to get comment ID
    list_resp = await test_client.get(
        f"/api/v1/moments/{moment_id}/comments",
        headers=auth_headers,
    )
    comment_id = list_resp.json()["data"][0]["id"]

    await test_client.delete(
        f"/api/v1/comments/{comment_id}",
        headers=auth_headers,
    )

    # Check count decremented
    get_resp = await test_client.get(
        f"/api/v1/moments/{moment_id}",
        headers=auth_headers,
    )
    assert get_resp.json()["data"]["comment_count"] == 1
