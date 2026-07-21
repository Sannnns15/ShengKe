from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateCommentRequest(BaseModel):
    moment_id: UUID
    content: str = Field(..., min_length=1)
    parent_id: UUID | None = None


class CommentResponse(BaseModel):
    id: UUID
    moment_id: UUID
    user_id: UUID
    parent_id: UUID | None
    content: str
    like_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommentTreeItem(BaseModel):
    """A comment node in the tree, with author info and nested replies."""
    id: UUID
    moment_id: UUID
    user_id: UUID
    parent_id: UUID | None
    content: str
    like_count: int
    created_at: datetime
    updated_at: datetime
    author_nickname: str
    author_avatar_url: str | None = None
    replies: list[CommentTreeItem] = []

    class Config:
        from_attributes = True
