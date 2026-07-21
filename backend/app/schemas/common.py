from __future__ import annotations

from typing import TypeVar, Generic
from pydantic import BaseModel, Field

T = TypeVar("T")


class Result(BaseModel, Generic[T]):
    """Unified API response wrapper."""
    code: int = 0
    message: str = "success"
    data: T | None = None


class PaginationMeta(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int = 0


class PaginatedResult(BaseModel, Generic[T]):
    code: int = 0
    message: str = "success"
    data: list[T] = []
    meta: PaginationMeta = PaginationMeta()


# ── Cursor-based pagination ──


class CursorParams(BaseModel):
    cursor: str | None = None  # base64 of "id,timestamp"
    limit: int = Field(default=20, ge=1, le=100)


class CursorMeta(BaseModel):
    next_cursor: str | None = None
    has_more: bool = False


class CursorPaginatedResult(BaseModel, Generic[T]):
    code: int = 0
    message: str = "success"
    data: list[T] = []
    meta: CursorMeta = CursorMeta()


# ── Audit ──


class AuditRejected(Exception):
    """Raised when content fails content audit."""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)
