from typing import List, Optional
from pydantic import BaseModel, Field


class AnswerIn(BaseModel):
    question_id: int
    answer: str


class MediaIn(BaseModel):
    media_type: str
    file_path: str
    question_id: Optional[int] = None


class PostCreate(BaseModel):
    user_id: Optional[int] = None
    movie_id: Optional[int] = None
    tmdb_id: Optional[int] = None
    title: str = Field(..., max_length=150)
    # optional rating the author gives to the movie; stored in ratings table
    rating: Optional[float] = None
    emojis_id: Optional[int] = None
    visibility: str = Field("public")
    spoiler: bool = False
    answers: Optional[List[AnswerIn]] = None
    medias: Optional[List[MediaIn]] = None


class PostUpdate(BaseModel):
    user_id: int
    title: Optional[str] = None
    emojis_id: Optional[int] = None
    visibility: Optional[str] = None
    spoiler: Optional[bool] = None
    rating: Optional[float] = None  # 평점 수정
    answers: Optional[List[AnswerIn]] = None  # 답변 추가/수정/삭제
    medias: Optional[List[MediaIn]] = None  # 미디어 추가/수정/삭제
