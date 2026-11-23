"""
analytics.py — API endpoints for social network analytics and metrics.

These endpoints expose the analytics and anomaly detection functionality.

NOTE ON MISSING DEPENDENCIES:
analytics_service.py and anomaly_service.py are stubs.
The /metrics endpoint accepts a counts payload and computes metrics directly
using the logic from relationship_service.py — no fabricated data.
The /anomalies endpoint documents the missing interface.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.relationship_service import RelationshipService
from backend.app.schemas.analytics import MetricResponse, AnomalyReport

router = APIRouter(prefix="/analytics", tags=["analytics"])


class MetricsRequest(BaseModel):
    """
    Request body for computing network metrics from raw counts.
    The caller provides follower and following sets and the computed mutuals count.
    """
    followers: list[str] = Field(default_factory=list)
    following: list[str] = Field(default_factory=list)


@router.post("/metrics")
def compute_metrics(body: MetricsRequest):
    """
    Compute reciprocity, counts, and relationship metrics for the provided lists.

    Does NOT require a database — works directly from the posted data.
    Uses RelationshipService.classify_relationships() to derive all metrics.

    Ponytail dry-run:
      Input: followers=[A, B], following=[B, C]
      Output: mutuals=1, not_following_back=1, dont_follow_back=1, reciprocity=0.5
    """
    followers_set = set(body.followers)
    following_set = set(body.following)

    classification = RelationshipService.classify_relationships(followers_set, following_set)
    metrics = classification["metrics"]

    return {
        "followers_count": len(followers_set),
        "following_count": len(following_set),
        "mutuals_count": metrics["mutuals_count"],
        "not_following_back_count": metrics["not_following_back_count"],
        "dont_follow_back_count": metrics["dont_follow_back_count"],
        "reciprocity_ratio": round(metrics["reciprocity_ratio"], 4)
    }


@router.get("/anomalies/{snapshot_id}")
def get_anomalies(snapshot_id: str):
    """
    Return anomaly detection results for a given snapshot.

    BLOCKED: anomaly_service.py is a stub — no detection logic is implemented yet.
    Returns a no-anomaly placeholder so the UI can render an empty state cleanly
    without crashing.

    When anomaly_service.py is implemented, replace this return with a service call.
    """
    # Returning a safe no-anomaly response so the UI's AnomalyPanel shows "No anomalies"
    # instead of an error. This is honest — we genuinely have no detection data.
    return AnomalyReport(
        anomaly_detected=False,
        risk_level="NONE",
        description="Anomaly detection service not yet implemented.",
        flagged_accounts_count=0
    )


@router.get("/summary/{observer_id}")
def get_analytics_summary(observer_id: str):
    """
    Return a high-level analytics summary for an observer.

    BLOCKED: Requires snapshot history from the database.
    Returns 503 until database connection is implemented.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": "Analytics summary requires snapshot history from the database.",
            "missing_module": "backend/app/database/connection.py",
            "observer_id": observer_id
        }
    )
