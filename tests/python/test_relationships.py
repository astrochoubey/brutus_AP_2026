import pytest
from backend.app.services.relationship_service import RelationshipService

def test_relationship_classification():
    followers = {"alice", "charlie"}
    following = {"alice", "bob"}

    result = RelationshipService.classify_relationships(followers, following)

    assert result["mutuals"] == ["alice"]
    assert result["not_following_back"] == ["bob"]
    assert result["dont_follow_back"] == ["charlie"]
    assert result["metrics"]["mutuals_count"] == 1
    assert result["metrics"]["reciprocity_ratio"] == 0.5

def test_delta_computation():
    prev_followers = {"alice", "bob"}
    curr_followers = {"alice", "david"}

    deltas = RelationshipService.compute_deltas(
        prev_followers, curr_followers, set(), set()
    )

    assert deltas["new_followers"] == ["david"]
    assert deltas["lost_followers"] == ["bob"]
