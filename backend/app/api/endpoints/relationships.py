"""
relationships.py — API endpoints for relationship classification and delta queries.

These routes use RelationshipService for all business logic.
No SQL or computation happens here — the route just receives data, calls the service,
and returns the result.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from backend.app.services.relationship_service import RelationshipService

router = APIRouter(prefix="/relationships", tags=["relationships"])


# --- Request body models used only by these endpoints ---

class ClassifyRequest(BaseModel):
    """Body for POST /relationships/classify.
    Caller provides two lists of Instagram user IDs.
    """
    followers: List[str]
    following: List[str]


class DeltaRequest(BaseModel):
    """Body for POST /relationships/delta.
    Caller provides the previous and current follower/following lists.
    """
    prev_followers: List[str]
    curr_followers: List[str]
    prev_following: List[str]
    curr_following: List[str]


# --- Endpoints ---

@router.post("/classify")
def classify_relationships(body: ClassifyRequest):
    """
    Classify follower/following lists into mutuals, not-following-back,
    and don't-follow-back categories.

    Returns counts and the categorized user ID lists.

    Ponytail dry-run:
      followers = {A, B}  following = {B, C}
      mutuals = {B}  not_following_back = {C}  dont_follow_back = {A}
    """
    followers_set = set(body.followers)
    following_set = set(body.following)

    # Delegate entirely to the existing service — no logic duplicated here.
    result = RelationshipService.classify_relationships(followers_set, following_set)
    return result


@router.post("/delta")
def compute_relationship_delta(body: DeltaRequest):
    """
    Compute the relationship delta between two sequential snapshots.

    Returns new_followers, lost_followers, new_following, unfollowed.

    Ponytail dry-run:
      prev_followers = {A, B}  curr_followers = {A, C}
      new_followers = {C}  lost_followers = {B}
    """
    result = RelationshipService.compute_deltas(
        set(body.prev_followers),
        set(body.curr_followers),
        set(body.prev_following),
        set(body.curr_following)
    )
    return result


@router.get("/mutuals")
def get_mutuals_summary(followers: str = "", following: str = ""):
    """
    Quick GET endpoint that accepts comma-separated follower and following IDs
    and returns only the mutual users.

    Example: GET /relationships/mutuals?followers=A,B&following=B,C
    Returns: { "mutuals": ["B"], "count": 1 }
    """
    # Parse the comma-separated query parameters into sets.
    follower_set = set(f.strip() for f in followers.split(",") if f.strip())
    following_set = set(f.strip() for f in following.split(",") if f.strip())

    mutuals = follower_set.intersection(following_set)
    return {"mutuals": list(mutuals), "count": len(mutuals)}
