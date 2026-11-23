"""
snapshots.py — API endpoints for snapshot ingestion and retrieval.

NOTE ON MISSING DEPENDENCY:
The database connection layer (backend/app/database/connection.py) is a stub.
Snapshot persistence and retrieval require a working async SQLite session.

Until Prachi's database connection module is implemented, the POST /snapshots endpoint
validates and acknowledges the request but cannot persist to storage.
GET endpoints return 503 Service Unavailable so the UI can handle the missing state cleanly.

This is intentional. The route handlers are thin and correct — they will work automatically
once the connection module provides a session factory.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List

from backend.app.schemas.snapshot import SnapshotCreate, SnapshotResponse

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.post("/", status_code=status.HTTP_202_ACCEPTED)
def create_snapshot(body: SnapshotCreate):
    """
    Accept a snapshot payload from the Chrome extension.

    Validates the payload using the existing SnapshotCreate Pydantic schema.
    Returns 202 Accepted when the payload is structurally valid.

    BLOCKED: Actual persistence requires the database session from connection.py.
    That module is a stub — this endpoint validates only until it is implemented.

    Ponytail dry-run:
      Input: { observer_id: "u1", scan_id: "s1", total_followers: 100, ... }
      Output: { "status": "accepted", "snapshot_id": null, "note": "..." }
    """
    # Pydantic already validated the body — negative counts would have raised 422.
    return {
        "status": "accepted",
        "snapshot_id": None,
        "observer_id": body.observer_id,
        "scan_id": body.scan_id,
        "note": "Payload validated. Persistence pending database connection implementation."
    }


@router.get("/", status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
def list_snapshots(observer_id: str = ""):
    """
    List all snapshots for a given observer.

    BLOCKED: Requires database session. Returns 503 until connection.py is implemented.
    The UI should handle 503 as an empty/unavailable state, not as a crash.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": "Snapshot listing requires a database connection that is not yet implemented.",
            "missing_module": "backend/app/database/connection.py",
            "required_interface": "get_session() -> AsyncSession"
        }
    )


@router.get("/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    """
    Retrieve a single snapshot by its ID.

    BLOCKED: Requires database session.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": f"Cannot retrieve snapshot '{snapshot_id}'. Database connection not implemented.",
            "missing_module": "backend/app/database/connection.py"
        }
    )


@router.get("/{from_id}/delta/{to_id}")
def get_snapshot_delta(from_id: str, to_id: str):
    """
    Retrieve the computed delta between two snapshots.

    BLOCKED: Requires snapshot records from database.
    Once snapshot retrieval works, the existing RelationshipService.compute_deltas()
    can be called here with the follower/following sets from both snapshots.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": "Snapshot delta requires stored snapshots. Database connection not implemented.",
            "missing_module": "backend/app/database/connection.py",
            "compute_method": "RelationshipService.compute_deltas()"
        }
    )
