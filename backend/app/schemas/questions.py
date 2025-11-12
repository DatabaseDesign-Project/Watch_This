from pydantic import BaseModel, Field
from typing import Optional

class QuestionOut(BaseModel):
    id: int
    content: str

class QuestionCreate(BaseModel):
    content: str = Field(min_length=1, max_length=255)

class QuestionUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1, max_length=255)
