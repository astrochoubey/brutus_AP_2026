"""
main.py — FastAPI application entry point.

Creates the FastAPI app, registers CORS middleware, mounts the main router,
and provides a health-check endpoint.

Run with:
  uvicorn backend.app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import main_router

app = FastAPI(
    title="Brutus — Instagram Network Observatory API",
    description="Backend analytics API for the Brutus Chrome Extension.",
    version="0.1.0"
)

# Allow the Chrome extension's content pages to call this API.
# In production, origins should be restricted to the extension's chrome-extension:// URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Mount all API routes under /api/v1
app.include_router(main_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    """Simple liveness check — returns OK when the server is running."""
    return {"status": "ok", "service": "brutus-api"}
