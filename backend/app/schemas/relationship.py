from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

RelationshipCategory = Literal["MUTUAL", "FOLLOWING_ONLY", "FOLLOWER_ONLY"]

class RelationshipBase(BaseModel):
    snapshot_id: str
    target_user_id: str
    relationship_type_id: int

class RelationshipResponse(RelationshipBase):
    category: RelationshipCategory
    follows_observer: bool
    followed_by_observer: bool
    is_mutual: bool
    observed_at: datetime

    class Config:
        from_attributes = True
