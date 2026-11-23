"""
routes.py — Central router aggregator.

This file imports the individual endpoint routers and includes them
into one main APIRouter that the FastAPI application mounts.

Adding a new endpoint group:
  1. Create the file in backend/app/api/endpoints/
  2. Import its router here
  3. Include it with main_router.include_router(...)
"""

from fastapi import APIRouter

from backend.app.api.endpoints.relationships import router as relationships_router
from backend.app.api.endpoints.snapshots import router as snapshots_router
from backend.app.api.endpoints.analytics import router as analytics_router
from backend.app.api.endpoints.users import router as users_router

# Single router that is mounted in main.py under the /api/v1 prefix.
main_router = APIRouter()

main_router.include_router(relationships_router)
main_router.include_router(snapshots_router)
main_router.include_router(analytics_router)
main_router.include_router(users_router)
