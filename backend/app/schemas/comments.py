from typing import Optional
from pydantic import BaseModel, Field


class CommentCreateIn(BaseModel):
    body: str = Field(..., min_length=1)
    parent_comment_id: Optional[int] = None


class CommentUpdateIn(BaseModel):
    body: str = Field(..., min_length=1)
