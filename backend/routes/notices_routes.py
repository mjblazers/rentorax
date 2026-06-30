"""Notices: landlord/caretaker issue notices to tenants. Tenants can view and acknowledge."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import require_roles, get_landlord_scope, caretaker_can, get_current_user
from db_utils import new_id, utcnow_iso, doc_out, log_activity, push_notification
from mailer import notice_issued, send_email

router = APIRouter(prefix="/api/notices", tags=["notices"])

NOTICE_TYPES = [
    "Friendly Rent Reminder", "Late Payment Notice", "Final Demand Notice",
    "Notice to Quit", "Notice of Tenancy Termination",
    "Move-Out Inspection Notice", "Move-Out Completed", "General Notice",
]
STATUSES = ["Draft", "Sent", "Acknowledged", "Expired", "Cancelled"]


class NoticeIn(BaseModel):
    tenant_id: str
    notice_type: str
    reason: Optional[str] = ""
    description: Optional[str] = ""
    due_date: Optional[str] = None
    attachments: List[dict] = []
    send: bool = True  # if False -> Draft


class NoticeUpdateIn(BaseModel):
    reason: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    attachments: Optional[List[dict]] = None


async def _next_notice_number(db, landlord_id: str) -> str:
    n = await db.notices.count_documents({"landlord_id": landlord_id})
    return f"NTC-{(n + 1):05d}"


@router.get("/types")
async def list_types():
    return {"types": NOTICE_TYPES, "statuses": STATUSES}


@router.get("")
async def list_notices(tenant_id: Optional[str] = None, user: dict = Depends(require_roles("landlord", "caretaker"))):
    from server import db
    landlord_id = get_landlord_scope(user)
    q = {"landlord_id": landlord_id}
    if tenant_id:
        q["tenant_id"] = tenant_id
    docs = await db.notices.find(q).sort("created_at", -1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("")
async def create_notice(payload: NoticeIn, user: dict = Depends(require_roles("landlord", "caretaker"))):
    from server import db
    landlord_id = get_landlord_scope(user)
    tenant = await db.tenants.find_one({"_id": payload.tenant_id, "landlord_id": landlord_id})
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    if payload.notice_type not in NOTICE_TYPES:
        raise HTTPException(400, "Invalid notice type")
    number = await _next_notice_number(db, landlord_id)
    status = "Sent" if payload.send else "Draft"
    doc = {
        "_id": new_id(),
        "notice_number": number,
        "landlord_id": landlord_id,
        "tenant_id": tenant["_id"],
        "tenant_name": tenant.get("full_name"),
        "property_id": tenant.get("property_id"),
        "property_name": tenant.get("property_name"),
        "unit_id": tenant.get("unit_id"),
        "unit_name": tenant.get("unit_name"),
        "notice_type": payload.notice_type,
        "reason": payload.reason,
        "description": payload.description,
        "due_date": payload.due_date,
        "attachments": payload.attachments,
        "status": status,
        "issue_date": utcnow_iso(),
        "created_by": user["_id"],
        "created_by_role": user["role"],
        "created_at": utcnow_iso(),
    }
    await db.notices.insert_one(doc)
    # Mark tenant status if relevant
    if payload.notice_type in ("Notice to Quit", "Notice of Tenancy Termination", "Move-Out Inspection Notice"):
        await db.tenants.update_one({"_id": tenant["_id"]}, {"$set": {"status": "notice_issued"}})

    await log_activity(db, user, "notice_create", "notice", doc["_id"], {"type": payload.notice_type})
    if status == "Sent":
        # notify tenant in-app
        if tenant.get("user_id"):
            await push_notification(
                db, tenant["user_id"], f"Notice issued — {payload.notice_type}",
                payload.reason or payload.description or "Please review your notice.",
                "warning", link=f"/tenant/notices/{doc['_id']}",
            )
        # email tenant if email available
        if tenant.get("email"):
            import os
            url = os.environ.get("FRONTEND_URL", "") + "/tenant/notices"
            subject, html = notice_issued(tenant.get("full_name") or "tenant", payload.notice_type, number, payload.due_date or "—", url)
            send_email(tenant["email"], subject, html)
    return doc_out(doc)


@router.patch("/{notice_id}")
async def update_notice(notice_id: str, payload: NoticeUpdateIn, user: dict = Depends(require_roles("landlord", "caretaker"))):
    from server import db
    landlord_id = get_landlord_scope(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "status" in updates and updates["status"] not in STATUSES:
        raise HTTPException(400, "Invalid status")
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.notices.update_one({"_id": notice_id, "landlord_id": landlord_id}, {"$set": updates})
    fresh = await db.notices.find_one({"_id": notice_id})
    if not fresh:
        raise HTTPException(404, "Not found")
    return doc_out(fresh)


@router.get("/{notice_id}")
async def get_notice(notice_id: str, user: dict = Depends(get_current_user)):
    from server import db
    role = user.get("role")
    q = {"_id": notice_id}
    if role in ("landlord", "caretaker"):
        q["landlord_id"] = get_landlord_scope(user)
    elif role == "tenant":
        q["tenant_id"] = user.get("tenant_id")
    elif role != "super_admin":
        raise HTTPException(403, "Forbidden")
    doc = await db.notices.find_one(q)
    if not doc:
        raise HTTPException(404, "Not found")
    return doc_out(doc)


@router.post("/{notice_id}/acknowledge")
async def acknowledge(notice_id: str, user: dict = Depends(require_roles("tenant"))):
    from server import db
    doc = await db.notices.find_one({"_id": notice_id, "tenant_id": user.get("tenant_id")})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.notices.update_one(
        {"_id": notice_id},
        {"$set": {"status": "Acknowledged", "acknowledged_at": utcnow_iso()}},
    )
    await push_notification(
        db, doc["landlord_id"], f"Notice {doc['notice_number']} acknowledged",
        f"{doc['tenant_name']} acknowledged the {doc['notice_type']}.", "info",
    )
    return {"ok": True}


@router.get("/tenant/list")
async def tenant_my_notices(user: dict = Depends(require_roles("tenant"))):
    from server import db
    docs = await db.notices.find({"tenant_id": user.get("tenant_id")}).sort("created_at", -1).to_list(500)
    return [doc_out(d) for d in docs]
