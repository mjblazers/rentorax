"""Common DB helpers: UUID ids, datetime, document serialization."""
import uuid
from datetime import datetime, timezone


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_iso(dt) -> str:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(dt)


def doc_out(doc: dict) -> dict:
    """Return a JSON-safe copy of a Mongo document, renaming _id -> id."""
    if doc is None:
        return None
    out = {k: v for k, v in doc.items() if k != "password_hash"}
    if "_id" in out:
        out["id"] = out.pop("_id")
    return out


def days_between(iso_date: str) -> int:
    """Days remaining from now until iso_date (negative if expired)."""
    if not iso_date:
        return 0
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
    except Exception:
        return 0
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = dt - datetime.now(timezone.utc)
    return delta.days


def expiry_status(iso_date: str) -> str:
    days = days_between(iso_date)
    if days < 0:
        return "expired"
    if days < 14:
        return "critical"
    if days < 60:
        return "urgent"
    if days <= 90:
        return "warning"
    return "safe"


async def log_activity(db, user: dict, action: str, target: str = None, target_id: str = None, metadata: dict = None):
    await db.activity_logs.insert_one({
        "_id": new_id(),
        "user_id": user.get("_id") or user.get("id"),
        "user_email": user.get("email"),
        "user_role": user.get("role"),
        "action": action,
        "target": target,
        "target_id": target_id,
        "metadata": metadata or {},
        "created_at": utcnow_iso(),
    })


async def push_notification(db, user_id: str, title: str, message: str, type_: str = "info", link: str = None):
    await db.notifications.insert_one({
        "_id": new_id(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type_,
        "link": link,
        "read": False,
        "created_at": utcnow_iso(),
    })
