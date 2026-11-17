from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SnapshotCreate(BaseModel):
    observer_id: str
    scan_id: str
    total_followers: int = Field(default=0, ge=0)
    total_following: int = Field(default=0, ge=0)
    total_mutuals: int = Field(default=0, ge=0)

class SnapshotResponse(SnapshotCreate):
    snapshot_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class SnapshotDeltaResponse(BaseModel):
    delta_id: int
    from_snapshot_id: str
    to_snapshot_id: str
    target_user_id: str
    change_type_code: str
    detected_at: datetime

    class Config:
        from_attributes = True
