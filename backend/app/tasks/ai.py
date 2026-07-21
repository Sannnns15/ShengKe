"""Celery tasks for AI-related background processing.

Currently used for async AI tag extraction after moment creation.
When Celery is configured, tasks run asynchronously via the broker.
In the default no-Celery mode, AI analysis runs synchronously in
the service layer during moment creation.
"""

from __future__ import annotations

from uuid import UUID

# If Celery app is configured, import and create task:
#
# from app.core.celery_app import celery_app
# from app.core.database import SessionLocal
# from app.services.ai import analyze_moment
#
# @celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
# def analyze_moment_task(self, moment_id_str: str) -> dict | None:
#     """Background task to analyze a Moment with AI.
#
#     Extracts tags, summary, and emotion from moment content.
#     Updates the Moment record in the database.
#     """
#     import asyncio
#     from sqlalchemy.ext.asyncio import AsyncSession
#
#     async def _run():
#         async with SessionLocal() as db:
#             moment_id = UUID(moment_id_str)
#             return await analyze_moment(db, moment_id)
#
#     try:
#         return asyncio.run(_run())
#     except Exception as exc:
#         raise self.retry(exc=exc)

# For now, AI analysis is called directly in the service layer (synchronous within
# the request lifecycle). When Celery is wired up, uncomment the above and call:
#   analyze_moment_task.delay(str(moment.id))
# from create_moment in app/services/moment.py.
