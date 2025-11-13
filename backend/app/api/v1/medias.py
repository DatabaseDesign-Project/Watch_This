import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.api.v1.posts import get_current_user_id
from app.db import db
from app.schemas.medias import MediaUploadOut

router = APIRouter()

# 프로젝트 내 정적 업로드 디렉터리 (개발용 로컬 저장)
# 최종 배포 시엔 S3 등으로 어댑터 교체만 하면 됨.
APP_ROOT = Path(__file__).resolve().parents[3]  # backend/app
UPLOAD_DIR = APP_ROOT / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", response_model=MediaUploadOut)
async def upload_media(
    post_id: int = Form(...),
    question_id: int = Form(...),
    media_type: str = Form(...),   # "image" | "video"
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
        # 게시글 존재/소유 확인
    post = await db.posts.find_unique(where={"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인 게시글에만 업로드할 수 있습니다.")

    # 질문 존재 확인 (추가)
    qrow = await db.questions.find_unique(where={"id": question_id})
    if not qrow:
        raise HTTPException(status_code=400, detail="유효하지 않은 question_id 입니다.")

    # 확장자 보존
    _, ext = os.path.splitext(file.filename or "")
    fname = f"{uuid.uuid4().hex}{ext.lower()}"
    abs_path = UPLOAD_DIR / fname

    # 파일 저장
    content = await file.read()
    abs_path.write_bytes(content)

    # DB 기록
    media = await db.medias.create(
        data={
            "post_id": post_id,
            "question_id": question_id,
            "media_type": media_type,
            "file_path": f"/static/uploads/{fname}",  # 프런트에서 바로 접근할 경로
        }
    )
    return MediaUploadOut(id=media.id, file_path=media.file_path)

@router.delete("/{media_id}", status_code=204)
async def delete_media(
    media_id: int,
    user_id: int = Depends(get_current_user_id),
):
    media = await db.medias.find_unique(where={"id": media_id}, include={"post": True})
    if not media:
        raise HTTPException(status_code=404, detail="미디어를 찾을 수 없습니다.")
    if media.post.user_id != user_id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    # 파일 삭제 (best-effort)
    try:
        fpath = media.file_path.lstrip("/")
        abs_path = APP_ROOT.parent / fpath if not fpath.startswith("backend/") else Path(fpath)
        # 위 한 줄은 배치/경로 구성에 따라 조정 가능. 현재 구조에선 /static/... 이므로 아래처럼 처리:
        abs_path = APP_ROOT / fpath  # "/static/..." 기준으로 backend/app/static/...
        if abs_path.exists():
            abs_path.unlink(missing_ok=True)
    except Exception:
        pass

    await db.medias.delete(where={"id": media_id})
