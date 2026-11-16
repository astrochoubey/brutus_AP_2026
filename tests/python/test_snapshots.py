import pytest
from backend.app.schemas.snapshot import SnapshotCreate, SnapshotResponse

def test_snapshot_create_validation():
    data = {
        "observer_id": "obs_101",
        "scan_id": "scn_2026_01",
        "total_followers": 150,
        "total_following": 120,
        "total_mutuals": 80
    }
    snapshot = SnapshotCreate(**data)
    assert snapshot.observer_id == "obs_101"
    assert snapshot.total_followers == 150
    assert snapshot.total_following == 120
    assert snapshot.total_mutuals == 80

def test_snapshot_negative_counts_rejected():
    with pytest.raises(ValueError):
        SnapshotCreate(
            observer_id="obs_101",
            scan_id="scn_2026_01",
            total_followers=-5
        )
