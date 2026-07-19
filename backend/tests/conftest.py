"""pytest fixtures for ShengKe backend tests.

Usage (from project root / backend):
    pytest tests/ -v --asyncio-mode=auto
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# ── Override settings BEFORE any app module imports ────────────────────
# Must be set before pytest discovers tests or imports the app package.
# These match the CI environment variables defined in .github/workflows/ci.yml
# and also work with local .env overrides.

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://shengke:shengke_secret@localhost:5432/shengke_dev",
)
os.environ.setdefault(
    "DATABASE_SYNC_URL",
    "postgresql://shengke:shengke_secret@localhost:5432/shengke_dev",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production")

# ── Now it is safe to import the app ───────────────────────────────────
from app.core.config import get_settings  # noqa: E402
from app.models import Base  # noqa: E402
from app.main import app  # noqa: E402

settings = get_settings()

# Sanity check: ensure env vars were picked up
assert "shengke_dev" in settings.database_url, (
    f"DATABASE_URL not resolved correctly: {settings.database_url}"
)

# Override the app's get_db dependency to use our test session factory.
# We do this by modifying the app's dependency_overrides.
from app.core import database  # noqa: E402


@pytest_asyncio.fixture(scope="function")
async def async_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Function-scoped engine: creates tables per test and drops on teardown.

    Uses a dedicated engine so each test function gets a clean database state.
    """
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(
    async_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh async session per test with automatic rollback."""
    session_factory = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest_asyncio.fixture
async def test_client(
    async_engine: AsyncEngine,
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an httpx AsyncClient bound to the FastAPI app,
    with the database dependency overridden to use the test engine.
    """
    # Create a session factory bound to the test engine
    SessionFactory = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with SessionFactory() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[database.get_db] = override_get_db

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Clean up override
    app.dependency_overrides.pop(database.get_db, None)
