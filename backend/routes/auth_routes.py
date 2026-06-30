"""Authentication routes: login (with rate-limit + lockout), me, logout, change password, profile update."""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from auth import (
    verify_password, hash_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
)
from db_utils import doc_out, utcnow_iso, log_activity
from models import LoginIn, ChangePasswordIn, ProfileUpdateIn

router = APIRouter(prefix="/api/auth", tags=["auth"])

LOCKOUT_THRESHOLD = int(os.environ.get("ACCOUNT_LOCKOUT_THRESHOLD", "6"))
LOCKOUT_MINUTES = int(os.environ.get("ACCOUNT_LOCKOUT_MINUTES", "15"))


async def _record_failure(db, email: str, ip: str):
    rec = await db.login_attempts.find_one({"email": email})
    now = datetime.now(timezone.utc)
    if rec:
        await db.login_attempts.update_one(
            {"email": email},
            {"$inc": {"fails": 1}, "$set": {"last_at": now.isoformat(), "last_ip": ip}},
        )
    else:
        await db.login_attempts.insert_one({
            "email": email, "fails": 1, "last_at": now.isoformat(), "last_ip": ip,
        })


async def _is_locked(db, email: str) -> bool:
    rec = await db.login_attempts.find_one({"email": email})
    if not rec:
        return False
    if rec.get("fails", 0) < LOCKOUT_THRESHOLD:
        return False
    try:
        last = datetime.fromisoformat(rec["last_at"])
    except Exception:
        return False
    if last + timedelta(minutes=LOCKOUT_MINUTES) > datetime.now(timezone.utc):
        return True
    # Lock period passed — reset
    await db.login_attempts.delete_one({"email": email})
    return False


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    from server import db
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else ""

    if await _is_locked(db, email):
        raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.")

    user = await db.users.find_one({"email": email})
    if not user:
        await _record_failure(db, email, ip)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")
    if not verify_password(payload.password, user["password_hash"]):
        await _record_failure(db, email, ip)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Success — clear failures
    await db.login_attempts.delete_one({"email": email})

    access = create_access_token(user["_id"], user["email"], user["role"])
    refresh = create_refresh_token(user["_id"])
    set_auth_cookies(response, access, refresh)
    await log_activity(db, user, "login", metadata={"ip": ip})
    return {"user": doc_out(user), "access_token": access}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    from server import db
    clear_auth_cookies(response)
    await log_activity(db, user, "logout")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return doc_out(user)


@router.post("/change-password")
async def change_password(payload: ChangePasswordIn, user: dict = Depends(get_current_user)):
    from server import db
    full = await db.users.find_one({"_id": user["_id"]})
    if not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": utcnow_iso()}},
    )
    await log_activity(db, user, "password_change")
    return {"ok": True}


@router.patch("/profile")
async def update_profile(payload: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    from server import db
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return doc_out(fresh)
