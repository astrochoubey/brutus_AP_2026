"""
users.py — API endpoints for user profile management.

These endpoints handle creating and looking up Instagram user profiles.
They use the existing UserCreate and UserResponse Pydantic schemas.

NOTE ON MISSING DEPENDENCY:
The database connection layer is a stub.
POST /users validates the payload and acknowledges it.
GET /users/{user_id} returns 503 until the database is available.
"""

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", status_code=status.HTTP_202_ACCEPTED)
def create_user(body: UserCreate):
    """
    Accept an Instagram user profile record.

    Validates using the UserCreate schema. Username is required.
    Persistence is blocked until the database connection is available.

    Ponytail dry-run:
      Input: { user_id: "123", username: "alice", is_verified: false, ... }
      Output: { "status": "accepted", "user_id": "123" }
    """
    return {
        "status": "accepted",
        "user_id": body.user_id,
        "username": body.username,
        "note": "Payload validated. Persistence pending database connection implementation."
    }


@router.get("/{user_id}")
def get_user(user_id: str):
    """
    Retrieve a user profile by their Instagram user ID.

    BLOCKED: Requires database session.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": f"Cannot retrieve user '{user_id}'. Database connection not implemented.",
            "missing_module": "backend/app/database/connection.py"
        }
    )


@router.get("/by-username/{username}")
def get_user_by_username(username: str):
    """
    Look up a user profile by Instagram username handle.

    BLOCKED: Requires database session.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": f"Cannot find user '@{username}'. Database connection not implemented.",
            "missing_module": "backend/app/database/connection.py"
        }
    )
