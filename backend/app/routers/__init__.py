from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.masjid import router as masjid_router
from app.routers.community import router as community_router
from app.routers.collections import router as collections_router
from app.routers.properties import router as properties_router

__all__ = [
    "auth_router",
    "admin_router",
    "masjid_router",
    "community_router",
    "collections_router",
    "properties_router"
]
