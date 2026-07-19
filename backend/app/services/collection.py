"""Collection service — user-defined collections of Moments."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Collection, CollectionItem
from app.models.moment import Moment


async def create_collection(
    db: AsyncSession,
    user_id: UUID,
    name: str,
    description: str | None = None,
) -> Collection:
    """Create a new collection for the user."""
    # Get next sort_order
    result = await db.execute(
        select(func.coalesce(func.max(Collection.sort_order), -1))
        .where(
            Collection.user_id == user_id,
            Collection.deleted_at.is_(None),
        )
    )
    max_order: int = result.scalar() or -1

    collection = Collection(
        user_id=user_id,
        name=name,
        description=description,
        sort_order=max_order + 1,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return collection


async def get_user_collections(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Collection], int]:
    """Get paginated list of collections for a user."""
    conditions = [
        Collection.user_id == user_id,
        Collection.deleted_at.is_(None),
    ]

    # Count
    count_result = await db.execute(
        select(func.count(Collection.id)).where(*conditions)
    )
    total = count_result.scalar() or 0

    # Fetch
    query = (
        select(Collection)
        .where(*conditions)
        .order_by(Collection.sort_order.asc(), Collection.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    collections = list(result.scalars().all())

    return collections, total


async def get_collection(
    db: AsyncSession,
    collection_id: UUID,
    user_id: UUID,
) -> Collection | None:
    """Get a single collection by id, scoped to user."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == user_id,
            Collection.deleted_at.is_(None),
        )
    )
    return result.scalars().first()


async def update_collection(
    db: AsyncSession,
    collection_id: UUID,
    user_id: UUID,
    data: dict,
) -> Collection | None:
    """Update a collection's name and/or description (owner only)."""
    collection = await get_collection(db, collection_id, user_id)
    if collection is None:
        return None

    if "name" in data:
        collection.name = data["name"]
    if "description" in data:
        collection.description = data["description"]
    if "sort_order" in data:
        collection.sort_order = data["sort_order"]

    collection.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(collection)
    return collection


async def delete_collection(
    db: AsyncSession,
    collection_id: UUID,
    user_id: UUID,
) -> bool:
    """Soft-delete a collection (owner only)."""
    collection = await get_collection(db, collection_id, user_id)
    if collection is None:
        return False

    collection.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


async def add_to_collection(
    db: AsyncSession,
    collection_id: UUID,
    moment_id: UUID,
    user_id: UUID,
) -> CollectionItem | None:
    """Add a moment to a collection (owner only)."""
    collection = await get_collection(db, collection_id, user_id)
    if collection is None:
        return None

    # Check if Moment exists
    moment_result = await db.execute(
        select(Moment).where(Moment.id == moment_id, Moment.deleted_at.is_(None))
    )
    if moment_result.scalars().first() is None:
        return None

    # Check duplicates
    existing_result = await db.execute(
        select(CollectionItem).where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.moment_id == moment_id,
        )
    )
    if existing_result.scalars().first() is not None:
        # Already exists — return existing
        return existing_result.scalars().first()

    item = CollectionItem(
        collection_id=collection_id,
        moment_id=moment_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def remove_from_collection(
    db: AsyncSession,
    collection_item_id: UUID,
    user_id: UUID,
) -> bool:
    """Remove a collection item (owner only)."""
    result = await db.execute(
        select(CollectionItem)
        .join(Collection, CollectionItem.collection_id == Collection.id)
        .where(
            CollectionItem.id == collection_item_id,
            Collection.user_id == user_id,
            Collection.deleted_at.is_(None),
        )
    )
    item = result.scalars().first()
    if item is None:
        return False

    await db.delete(item)
    await db.commit()
    return True


async def get_collection_moments(
    db: AsyncSession,
    collection_id: UUID,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Moment], int]:
    """Get paginated moments within a collection (owner only)."""
    collection = await get_collection(db, collection_id, user_id)
    if collection is None:
        return [], 0

    # Count
    count_result = await db.execute(
        select(func.count(CollectionItem.id)).where(
            CollectionItem.collection_id == collection_id,
        )
    )
    total = count_result.scalar() or 0

    # Fetch moment IDs from collection items
    items_query = (
        select(CollectionItem)
        .where(CollectionItem.collection_id == collection_id)
        .order_by(CollectionItem.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items_result = await db.execute(items_query)
    items = list(items_result.scalars().all())

    if not items:
        return [], total

    moment_ids = [item.moment_id for item in items]
    moments_result = await db.execute(
        select(Moment).where(
            Moment.id.in_(moment_ids),
            Moment.deleted_at.is_(None),
        )
    )
    moments_map = {m.id: m for m in moments_result.scalars().all()}
    moments = [moments_map[mid] for mid in moment_ids if mid in moments_map]

    return moments, total
