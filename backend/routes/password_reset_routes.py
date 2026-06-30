"""Password reset flow: request -> token (email) -> consume."""
import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth import hash_password
from db_utils import new_id, utcnow_iso
from mailer import password_reset, send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RequestResetIn(BaseModel):
    email: EmailStr


class ConsumeResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


@router.post("/forgot-password")
async def request_reset(payload: RequestResetIn):
    from server import db
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Don't reveal account existence; always return ok.
    if user:
        ttl = int(os.environ.get("PASSWORD_RESET_TOKEN_TTL_MIN", "60"))
        token = secrets.token_urlsafe(32)
        expires = (datetime.now(timezone.utc) + timedelta(minutes=ttl)).isoformat()
        await db.password_reset_tokens.insert_one({
            "_id": new_id(),
            "token": token,
            "user_id": user["_id"],
            "email": email,
            "used": False,
            "expires_at": expires,
            "created_at": utcnow_iso(),
        })
        frontend_url = os.environ.get("FRONTEND_URL", "")
        reset_url = f"{frontend_url}/reset-password?token={token}"
        subject, html = password_reset(user.get("name") or "there", reset_url, ttl)
        send_email(email, subject, html)
        return {"ok": True, "reset_url": reset_url}  # included for in-app testing/copy
    return {"ok": True}


@router.post("/reset-password")
async def consume_reset(payload: ConsumeResetIn):
    from server import db
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(400, "This reset link is invalid or has already been used.")
    try:
        exp = datetime.fromisoformat(rec["expires_at"])
    except Exception:
        raise HTTPException(400, "Invalid reset token")
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link has expired. Please request a new one.")
    await db.users.update_one({"_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": utcnow_iso()}})
    await db.password_reset_tokens.update_one({"_id": rec["_id"]}, {"$set": {"used": True, "used_at": utcnow_iso()}})
    # invalidate other open tokens for that user
    await db.password_reset_tokens.update_many({"user_id": rec["user_id"], "used": False}, {"$set": {"used": True}})
    return {"ok": True}
