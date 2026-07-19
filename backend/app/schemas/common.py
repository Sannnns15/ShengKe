from __future__ import annotations

from typing import TypeVar, Generic
from pydantic import BaseModel

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
