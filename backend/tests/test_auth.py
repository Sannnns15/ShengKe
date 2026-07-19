"""Tests for authentication endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# Use unique test data per function to avoid test-order dependencies.
#
# `test_register_duplicate_phone` uses its own payload to be self-contained:
# it registers the same phone twice in sequence and expects the second attempt
# to fail with a server error (IntegrityError → 500) since the service layer
# does not yet catch unique-constraint violations.


@pytest.mark.asyncio
async def test_register(test_client: AsyncClient) -> None:
    """Register a new user successfully."""
    payload = {
        "phone": "13800138001",
        "password": "TestPass123!",
        "code": "123456",
        "nickname": "testuser_register",
    }
    resp = await test_client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert body["data"]["user"]["phone"] == payload["phone"]
    assert body["data"]["user"]["nickname"] == payload["nickname"]
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]
    assert body["data"]["expires_in"] > 0


@pytest.mark.asyncio
async def test_login(test_client: AsyncClient) -> None:
    """Register, then log in, and receive tokens."""
    phone = "13800138002"
    password = "TestPass123!"
    payload = {
        "phone": phone,
        "password": password,
        "code": "123456",
        "nickname": "testuser_login",
    }

    # First register
    reg_resp = await test_client.post("/api/v1/auth/register", json=payload)
    assert reg_resp.status_code == 200

    # Then login
    login_resp = await test_client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": password},
    )
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]
    assert body["data"]["expires_in"] > 0


@pytest.mark.asyncio
async def test_refresh_token(test_client: AsyncClient) -> None:
    """Register, then refresh the access token."""
    phone = "13800138003"
    payload = {
        "phone": phone,
        "password": "TestPass123!",
        "code": "123456",
        "nickname": "testuser_refresh",
    }

    # Register
    reg_resp = await test_client.post("/api/v1/auth/register", json=payload)
    assert reg_resp.status_code == 200
    body = reg_resp.json()
    refresh_token = body["data"]["refresh_token"]

    # Refresh
    refresh_resp = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    body = refresh_resp.json()
    assert body["code"] == 0, f"Expected code 0, got {body['code']}: {body['message']}"
    assert "access_token" in body["data"]
    assert body["data"]["expires_in"] == 900


@pytest.mark.asyncio
async def test_register_duplicate_phone(test_client: AsyncClient) -> None:
    """Registering with the same phone twice should fail."""
    phone = "13800138004"
    payload = {
        "phone": phone,
        "password": "TestPass123!",
        "code": "123456",
        "nickname": "testuser_dup",
    }

    # First registration — should succeed
    resp1 = await test_client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["code"] == 0

    # Second registration with same phone — the service layer does not handle
    # the IntegrityError gracefully yet, so it results in a 500 response.
    resp2 = await test_client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code != 200 or resp2.json()["code"] != 0, (
        f"Duplicate registration unexpectedly succeeded: {resp2.text}"
    )
