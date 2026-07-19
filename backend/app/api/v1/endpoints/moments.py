from fastapi import APIRouter

from app.schemas.common import Result, PaginatedResult
from app.schemas.moment import MomentCreateRequest, MomentResponse

router = APIRouter()


@router.post("", response_model=Result)
async def create_moment(body: MomentCreateRequest):
    """Create a new Moment."""
    return Result(code=0, message="not implemented")


@router.get("/{moment_id}", response_model=Result[MomentResponse])
async def get_moment(moment_id: str):
    """Get a single Moment by id."""
    return Result(code=0, message="not implemented", data=None)


@router.patch("/{moment_id}", response_model=Result)
async def update_moment(moment_id: str):
    """Edit a Moment."""
    return Result(code=0, message="not implemented")


@router.delete("/{moment_id}", response_model=Result)
async def delete_moment(moment_id: str):
    """Soft-delete a Moment."""
    return Result(code=0, message="not implemented")


@router.get("", response_model=PaginatedResult[MomentResponse])
async def list_moments(page: int = 1, page_size: int = 20):
    """Feed / explore moments."""
    return PaginatedResult(code=0, message="not implemented")
