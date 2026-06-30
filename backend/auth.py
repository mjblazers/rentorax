"""Authentication utilities: password hashing, JWT, current user dependency, RBAC."""
import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from typing import Optional

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access, httponly=True, secure=True, samesite="none",
        max_age=43200, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True, samesite="none",
        max_age=604800, path="/",
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def sanitize_user(user: dict) -> dict:
    """Strip sensitive fields before returning user to client."""
    if not user:
        return user
    out = {k: v for k, v in user.items() if k != "password_hash"}
    return out


async def get_current_user(request: Request) -> dict:
    """Decode JWT from cookie or Bearer header and return the active user."""
    from server import db  # lazy import to avoid cycle

    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = await db.users.find_one({"_id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Account suspended")
    return sanitize_user(user)


def require_roles(*roles: str):
    """Dependency factory: ensure current user has one of the given roles."""
    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return _checker


def get_landlord_scope(user: dict) -> str:
    """Returns the landlord_id under whose data scope this user operates.
    - Landlord: own id
    - Caretaker/Tenant: parent landlord_id field
    """
    if user["role"] == "landlord":
        return user["_id"]
    return user.get("landlord_id")


def caretaker_can(user: dict, permission: str) -> bool:
    if user.get("role") != "caretaker":
        return True
    perms = user.get("permissions") or {}
    return bool(perms.get(permission, False))


def caretaker_has_property(user: dict, property_id: str) -> bool:
    if user.get("role") != "caretaker":
        return True
    if user.get("all_properties"):
        return True
    return property_id in (user.get("assigned_properties") or [])
