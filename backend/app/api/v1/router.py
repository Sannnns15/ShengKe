from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, moments, comments, likes, follows, search

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(moments.router, prefix="/moments", tags=["Moments"])
router.include_router(comments.router, prefix="", tags=["Comments"])
router.include_router(likes.router, prefix="", tags=["Likes"])
router.include_router(follows.router, prefix="", tags=["Follows"])
router.include_router(search.router, prefix="/search", tags=["Search"])
