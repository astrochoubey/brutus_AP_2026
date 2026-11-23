import pytest
from backend.app.api.endpoints.analytics import compute_metrics, MetricsRequest, get_anomalies
from backend.app.api.endpoints.relationships import (
    classify_relationships,
    ClassifyRequest,
    compute_relationship_delta,
    DeltaRequest,
    get_mutuals_summary
)
from backend.app.schemas.analytics import AnomalyReport

def test_api_classify_relationships():
    req = ClassifyRequest(followers=["alice", "charlie"], following=["alice", "bob"])
    res = classify_relationships(req)

    assert "alice" in res["mutuals"]
    assert "bob" in res["not_following_back"]
    assert "charlie" in res["dont_follow_back"]
    assert res["metrics"]["mutuals_count"] == 1

def test_api_compute_delta():
    req = DeltaRequest(
        prev_followers=["alice", "bob"],
        curr_followers=["alice", "david"],
        prev_following=["alice"],
        curr_following=["alice", "eve"]
    )
    res = compute_relationship_delta(req)

    assert res["new_followers"] == ["david"]
    assert res["lost_followers"] == ["bob"]
    assert res["new_following"] == ["eve"]
    assert res["unfollowed"] == []

def test_api_mutuals_summary():
    res = get_mutuals_summary(followers="alice,bob,charlie", following="bob,charlie,david")
    assert sorted(res["mutuals"]) == ["bob", "charlie"]
    assert res["count"] == 2

def test_api_compute_metrics():
    req = MetricsRequest(followers=["u1", "u2"], following=["u2", "u3"])
    res = compute_metrics(req)

    assert res["followers_count"] == 2
    assert res["following_count"] == 2
    assert res["mutuals_count"] == 1
    assert res["not_following_back_count"] == 1
    assert res["dont_follow_back_count"] == 1
    assert res["reciprocity_ratio"] == 0.5

def test_api_get_anomalies_placeholder():
    res = get_anomalies("snap_123")
    assert isinstance(res, AnomalyReport)
    assert res.anomaly_detected is False
    assert res.risk_level == "NONE"
