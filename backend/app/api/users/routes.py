# backend/app/api/users/routes.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from prisma import Prisma
from passlib.hash import bcrypt
from fastapi.responses import JSONResponse
from app.db import db

router = APIRouter()


# Pydantic 모델
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# 회원가입 API
@router.post("/signup")
async def signup(data: SignupRequest):
    user = await db.users.find_unique(where={"email": data.email})
    if user:
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")

    hashed_pw = bcrypt.hash(data.password)

    new_user = await db.users.create(
        data={
            "email": data.email,
            "password_hash": hashed_pw,
            "nickname": data.nickname,
        }
    )
    return {"message": "회원가입 성공", "user_id": new_user.id}


# 로그인 API
@router.post("/login")
async def login(data: LoginRequest):
    user = await db.users.find_unique(where={"email": data.email})
    if not user or not bcrypt.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    return {"message": "로그인 성공", "user_id": user.id, "nickname": user.nickname}
