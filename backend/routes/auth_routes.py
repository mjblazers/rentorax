"""Authentication routes: login, me, logout, change password, profile update."""
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from auth import (
    verify_password, hash_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, sanitize_user, get_current_user,
)
from db_utils import doc_out, utcnow_iso, log_activity
from models import LoginIn, ChangePasswordIn, ProfileUpdateIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginIn, response: Response):
    from server import db
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access = create_access_token(user["_id"], user["email"], user["role"])
    refresh = create_refresh_token(user["_id"])
    set_auth_cookies(response, access, refresh)
    await log_activity(db, user, "login")
    return {"user": doc_out(user), "access_token": access}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
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
