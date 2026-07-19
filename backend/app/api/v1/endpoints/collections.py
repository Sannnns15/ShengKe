from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.schemas.common import Result, PaginatedResult, PaginationMeta
from app.schemas.collection import (
    CreateCollectionRequest,
    UpdateCollectionRequest,
    AddToCollectionRequest,
    CollectionResponse,
    CollectionItemResponse,
)
from app.services.collection import (
    create_collection,
    get_user_collections,
    get_collection,
    update_collection,
    delete_collection,
    add_to_collection,
    remove_from_collection,
    get_collection_moments,
)
from app.models.collection import CollectionItem
from app.schemas.moment import MomentListItem

router = APIRouter()


def _enrich_collection_with_count(collection, item_count: int) -> CollectionResponse:
    resp = CollectionResponse.model_validate(collection)
    resp.item_count = item_count
    return resp


@router.post("", response_model=Result[CollectionResponse])
async def create_collection_endpoint(
    body: CreateCollectionRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new collection."""
    collection = await create_collection(db, user_id, body.name, body.description)
    return Result(
        code=0,
        message="success",
        data=_enrich_collection_with_count(collection, 0),
    )


@router.get("", response_model=PaginatedResult[CollectionResponse])
async def list_collections(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """List collections of the current user."""
    collections, total = await get_user_collections(db, user_id, page, page_size)

    # Enrich with item counts
    items = []
    for col in collections:
        count_result = await db.execute(
            select(func.count(CollectionItem.id)).where(
                CollectionItem.collection_id == col.id,
            )
        )
        item_count = count_result.scalar() or 0
        items.append(_enrich_collection_with_count(col, item_count))

    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/{collection_id}", response_model=Result[CollectionResponse])
async def get_collection_endpoint(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a single collection."""
    collection = await get_collection(db, collection_id, user_id)
    if collection is None:
        return Result(code=1404, message="合集不存在", data=None)
    count_result = await db.execute(
        select(func.count(CollectionItem.id)).where(
            CollectionItem.collection_id == collection.id,
        )
    )
    item_count = count_result.scalar() or 0
    return Result(
        code=0,
        message="success",
        data=_enrich_collection_with_count(collection, item_count),
    )


@router.patch("/{collection_id}", response_model=Result[CollectionResponse])
async def update_collection_endpoint(
    collection_id: UUID,
    body: UpdateCollectionRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Update a collection (owner only)."""
    data = body.model_dump(exclude_unset=True)
    collection = await update_collection(db, collection_id, user_id, data)
    if collection is None:
        return Result(code=1404, message="合集不存在或无权限编辑", data=None)
    count_result = await db.execute(
        select(func.count(CollectionItem.id)).where(
            CollectionItem.collection_id == collection.id,
        )
    )
    item_count = count_result.scalar() or 0
    return Result(
        code=0,
        message="success",
        data=_enrich_collection_with_count(collection, item_count),
    )


@router.delete("/{collection_id}", response_model=Result)
async def delete_collection_endpoint(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Soft-delete a collection (owner only)."""
    ok = await delete_collection(db, collection_id, user_id)
    if not ok:
        return Result(code=1404, message="合集不存在或无权限删除", data=None)
    return Result(code=0, message="success")


@router.post("/items", response_model=Result[CollectionItemResponse])
async def add_item_to_collection(
    body: AddToCollectionRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Add a moment to a collection."""
    item = await add_to_collection(db, body.collection_id, body.moment_id, user_id)
    if item is None:
        return Result(code=1404, message="合集或时刻不存在", data=None)
    return Result(
        code=0,
        message="success",
        data=CollectionItemResponse.model_validate(item),
    )


@router.delete("/items/{item_id}", response_model=Result)
async def remove_item_from_collection(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Remove a moment from a collection."""
    ok = await remove_from_collection(db, item_id, user_id)
    if not ok:
        return Result(code=1404, message="不存在或无权限移除", data=None)
    return Result(code=0, message="success")


@router.get("/{collection_id}/moments", response_model=PaginatedResult[MomentListItem])
async def list_collection_moments(
    collection_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get paginated list of moments in a collection."""
    moments, total = await get_collection_moments(db, collection_id, user_id, page, page_size)
    items = [MomentListItem.model_validate(m) for m in moments]
    return PaginatedResult(
        code=0,
        message="success",
        data=items,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
