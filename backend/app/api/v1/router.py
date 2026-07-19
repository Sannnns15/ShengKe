from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, moments

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(moments.router, prefix="/moments", tags=["Moments"])
