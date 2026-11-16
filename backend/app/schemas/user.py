from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    user_id: str = Field(..., description="Unique Instagram account ID")
    username: str = Field(..., description="Instagram handle without @")
    full_name: Optional[str] = Field(None, description="Profile display name")
    avatar_url: Optional[str] = Field(None, description="URL of profile image")
    is_verified: bool = Field(False, description="Verification badge status")
    is_private: bool = Field(False, description="Privacy status of profile")

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    first_seen_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
