from pydantic import BaseModel

class MediaUploadOut(BaseModel):
    id: int
    file_path: str
