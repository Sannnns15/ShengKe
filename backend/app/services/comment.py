from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.moment import Moment
from app.models.user import User
from app.services.notification import create_notification
from app.services.mention import process_mentions


async def create_comment(
    db: AsyncSession,
    moment_id: UUID,
    user_id: UUID,
    content: str,
    parent_id: UUID | None = None,
) -> Comment:
    """Create a new comment on a Moment.

    If parent_id is provided, the comment becomes a reply to an existing comment.
    Updates the moment's comment_count.
    """
    comment = Comment(
        moment_id=moment_id,
        user_id=user_id,
        content=content,
        parent_id=parent_id,
    )
    db.add(comment)

    # Increment moment comment_count
    result = await db.execute(
        select(Moment).where(
            Moment.id == moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = result.scalars().first()
    if moment:
        moment.comment_count = Moment.comment_count + 1

    await db.commit()
    await db.refresh(comment)

    # Invalidate moment cache so next GET returns fresh comment_count
    from app.core.cache import delete, make_key
    await delete(make_key("moment", str(moment_id)))

    # Notify moment author about the new comment
    if moment and moment.user_id != user_id:
        content_preview = content[:100] if len(content) > 100 else content
        await create_notification(
            db,
            user_id=moment.user_id,
            actor_id=user_id,
            type="comment",
            target_type="moment",
            target_id=moment_id,
            content=content_preview,
        )

    # Process @mentions in comment content
    await process_mentions(
        db,
        text=content,
        actor_id=user_id,
        target_type="comment",
        target_id=comment.id,
        content=content[:100],
    )

    return comment


async def _build_comment_tree(
    db: AsyncSession,
    moment_id: UUID,
) -> list[dict]:
    """Fetch all active comments for a moment and build a reply tree.

    Returns a list of root comment dicts, each with nested ``replies``.
    Each dict contains:
        - All Comment columns
        - ``author_nickname`` (str)
        - ``author_avatar_url`` (str | None)
        - ``replies`` (list of nested dicts, same shape)
    """
    # Fetch all non-deleted comments for this moment, joined with user
    stmt = (
        select(Comment, User.nickname, User.avatar_url)
        .join(User, Comment.user_id == User.id)
        .where(
            Comment.moment_id == moment_id,
            Comment.deleted_at.is_(None),
        )
        .order_by(Comment.created_at.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Build lookup: comment_id -> dict
    comments_by_id: dict[UUID, dict] = {}
    root_comments: list[dict] = []

    for comment, nickname, avatar_url in rows:
        d = {
            "id": comment.id,
            "moment_id": comment.moment_id,
            "user_id": comment.user_id,
            "parent_id": comment.parent_id,
            "content": comment.content,
            "like_count": comment.like_count,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "author_nickname": nickname,
            "author_avatar_url": avatar_url,
            "replies": [],
        }
        comments_by_id[comment.id] = d

        if comment.parent_id is None:
            root_comments.append(d)

    # Attach replies recursively
    for cid, d in comments_by_id.items():
        parent_id = d["parent_id"]
        if parent_id is not None and parent_id in comments_by_id:
            comments_by_id[parent_id]["replies"].append(d)

    return root_comments


async def get_moment_comments(
    db: AsyncSession,
    moment_id: UUID,
) -> list[dict]:
    """Get all comments for a Moment as a tree structure with author info.

    Returns a flat list of root comments; each comment contains nested
    ``replies`` populated with its child comments (single level of nesting
    is typical, but the tree supports arbitrary depth).
    """
    return await _build_comment_tree(db, moment_id)


async def delete_comment(
    db: AsyncSession,
    comment_id: UUID,
    user_id: UUID,
) -> bool:
    """Soft-delete a comment by replacing its content.

    Only the author can delete. Content becomes ``"[该评论已被删除]"``.
    Also decrements the moment's comment_count.

    Returns True if deleted, False if not found or not the author.
    """
    result = await db.execute(
        select(Comment).where(
            Comment.id == comment_id,
            Comment.deleted_at.is_(None),
        )
    )
    comment = result.scalars().first()

    if comment is None or comment.user_id != user_id:
        return False

    # Soft-delete: replace content with placeholder instead of hard delete
    comment.content = "[该评论已被删除]"

    # Decrement moment comment_count
    moment_result = await db.execute(
        select(Moment).where(
            Moment.id == comment.moment_id,
            Moment.deleted_at.is_(None),
        )
    )
    moment = moment_result.scalars().first()
    if moment and moment.comment_count > 0:
        moment.comment_count = Moment.comment_count - 1

    await db.commit()

    # Invalidate moment cache so next GET returns fresh comment_count
    from app.core.cache import delete, make_key
    await delete(make_key("moment", str(comment.moment_id)))

    return True
