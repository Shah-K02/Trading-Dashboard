from fastapi import APIRouter

from app.api.routes import accounts, analytics, auth, imports, trades, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(imports.router, prefix="/import", tags=["import"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
