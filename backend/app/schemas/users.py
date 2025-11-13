from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class ProfileOut(BaseModel):
    id: int
    email: EmailStr
    nickname: str
    profile_image: Optional[str]
    created_at: Optional[str]


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(None, max_length=20)
    profile_image: Optional[str] = None
