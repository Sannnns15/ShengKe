from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.comment import CreateCommentRequest, CommentResponse
from app.services.comment import (
    create_comment,
    get_moment_comments,
    delete_comment,
)
from app.services.moment import get_moment

router = APIRouter()


@router.post("/moments/{moment_id}/comments", response_model=Result[CommentResponse])
async def create_comment_endpoint(
    moment_id: UUID,
    body: CreateCommentRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new comment on a Moment."""
    # Verify moment exists (quick existence check via get_moment)
    moment = await get_moment(db, moment_id, user_id)
    if moment is None:
        return Result(code=1404, message="时刻不存在或无权访问", data=None)

    comment = await create_comment(
        db,
        moment_id=moment_id,
        user_id=user_id,
        content=body.content,
        parent_id=body.parent_id,
    )
    return Result(
        code=0,
        message="success",
        data=CommentResponse.model_validate(comment),
    )


@router.get("/moments/{moment_id}/comments", response_model=PaginatedResult[CommentResponse])
async def list_moment_comments_endpoint(
    moment_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get paginated comments for a Moment."""
    # Verify moment exists
    moment = await get_moment(db, moment_id, user_id)
    if moment is None:
        return PaginatedResult(
            code=1404, message="时刻不存在或无权访问", data=[], meta=PaginationMeta()
        )

    comments, total = await get_moment_comments(db, moment_id, page, page_size)
    items = [CommentResponse.model_validate(c) for c in comments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.delete("/comments/{comment_id}", response_model=Result)
async def delete_comment_endpoint(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Soft-delete a comment (author only)."""
    ok = await delete_comment(db, comment_id, user_id)
    if not ok:
        return Result(code=1404, message="评论不存在或无权限删除", data=None)
    return Result(code=0, message="success")
