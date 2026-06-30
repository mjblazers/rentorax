"""Super Admin routes: landlord management, platform stats, activity logs, announcements."""
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from auth import require_roles, hash_password
from db_utils import new_id, utcnow_iso, doc_out, log_activity, push_notification
from models import LandlordCreateIn, LandlordUpdateIn, AnnouncementIn

router = APIRouter(prefix="/api/admin", tags=["admin"])
ADMIN_DEP = Depends(require_roles("super_admin"))


def _gen_password(n: int = 10) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@$"
    return "".join(secrets.choice(alphabet) for _ in range(n))


@router.get("/stats")
async def platform_stats(user: dict = ADMIN_DEP):
    from server import db
    landlords = await db.users.count_documents({"role": "landlord"})
    properties = await db.properties.count_documents({})
    units = await db.units.count_documents({})
    tenants = await db.tenants.count_documents({})
    caretakers = await db.users.count_documents({"role": "caretaker"})
    active_subs = await db.users.count_documents({"role": "landlord", "suspended": {"$ne": True}})
    suspended = await db.users.count_documents({"role": "landlord", "suspended": True})
    payments = await db.payments.find({}, {"amount": 1, "payment_date": 1}).to_list(10000)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    monthly_rev = 0.0
    yearly_rev = 0.0
    for p in payments:
        try:
            dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.year == now.year:
            yearly_rev += float(p.get("amount") or 0)
            if dt.month == now.month:
                monthly_rev += float(p.get("amount") or 0)
    return {
        "total_landlords": landlords,
        "total_properties": properties,
        "total_units": units,
        "total_tenants": tenants,
        "total_caretakers": caretakers,
        "active_subscriptions": active_subs,
        "suspended": suspended,
        "monthly_revenue": monthly_rev,
        "yearly_revenue": yearly_rev,
    }


@router.get("/landlords")
async def list_landlords(q: str = "", user: dict = ADMIN_DEP):
    from server import db
    query = {"role": "landlord"}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.users.find(query).sort("created_at", -1).to_list(500)
    # enrich with property/tenant counts
    out = []
    for d in docs:
        props = await db.properties.count_documents({"landlord_id": d["_id"]})
        tenants = await db.tenants.count_documents({"landlord_id": d["_id"]})
        item = doc_out(d)
        item["property_count"] = props
        item["tenant_count"] = tenants
        out.append(item)
    return out


@router.post("/landlords")
async def create_landlord(payload: LandlordCreateIn, user: dict = ADMIN_DEP):
    from server import db
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    plain_password = payload.password or _gen_password()
    doc = {
        "_id": new_id(),
        "email": email,
        "password_hash": hash_password(plain_password),
        "name": payload.name,
        "phone": payload.phone,
        "role": "landlord",
        "plan": payload.plan or "starter",
        "suspended": False,
        "created_by": user["_id"],
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity(db, user, "landlord_create", "landlord", doc["_id"], {"email": email})
    out = doc_out(doc)
    out["generated_password"] = plain_password  # shown once to admin
    return out


@router.patch("/landlords/{landlord_id}")
async def update_landlord(landlord_id: str, payload: LandlordUpdateIn, user: dict = ADMIN_DEP):
    from server import db
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.users.update_one({"_id": landlord_id, "role": "landlord"}, {"$set": updates})
    fresh = await db.users.find_one({"_id": landlord_id})
    if not fresh:
        raise HTTPException(404, "Not found")
    return doc_out(fresh)


@router.post("/landlords/{landlord_id}/reset-password")
async def reset_landlord_password(landlord_id: str, user: dict = ADMIN_DEP):
    from server import db
    landlord = await db.users.find_one({"_id": landlord_id, "role": "landlord"})
    if not landlord:
        raise HTTPException(404, "Landlord not found")
    new_pw = _gen_password()
    await db.users.update_one({"_id": landlord_id}, {"$set": {"password_hash": hash_password(new_pw), "updated_at": utcnow_iso()}})
    await log_activity(db, user, "landlord_password_reset", "landlord", landlord_id)
    return {"new_password": new_pw}


@router.post("/landlords/{landlord_id}/suspend")
async def suspend_landlord(landlord_id: str, user: dict = ADMIN_DEP):
    from server import db
    await db.users.update_one({"_id": landlord_id, "role": "landlord"}, {"$set": {"suspended": True}})
    await log_activity(db, user, "landlord_suspend", "landlord", landlord_id)
    return {"ok": True}


@router.post("/landlords/{landlord_id}/activate")
async def activate_landlord(landlord_id: str, user: dict = ADMIN_DEP):
    from server import db
    await db.users.update_one({"_id": landlord_id, "role": "landlord"}, {"$set": {"suspended": False}})
    await log_activity(db, user, "landlord_activate", "landlord", landlord_id)
    return {"ok": True}


@router.delete("/landlords/{landlord_id}")
async def delete_landlord(landlord_id: str, user: dict = ADMIN_DEP):
    from server import db
    # cascade-ish: mark deletion. Hard-delete user + related orphans.
    await db.users.delete_one({"_id": landlord_id, "role": "landlord"})
    await db.users.delete_many({"landlord_id": landlord_id})  # caretakers, tenants portal users
    await db.properties.delete_many({"landlord_id": landlord_id})
    await db.units.delete_many({"landlord_id": landlord_id})
    await db.tenants.delete_many({"landlord_id": landlord_id})
    await db.payments.delete_many({"landlord_id": landlord_id})
    await db.expenses.delete_many({"landlord_id": landlord_id})
    await db.maintenance_tickets.delete_many({"landlord_id": landlord_id})
    await db.income.delete_many({"landlord_id": landlord_id})
    await db.announcements.delete_many({"landlord_id": landlord_id})
    await log_activity(db, user, "landlord_delete", "landlord", landlord_id)
    return {"ok": True}


@router.get("/activity-logs")
async def activity_logs(limit: int = Query(100, le=500), user: dict = ADMIN_DEP):
    from server import db
    logs = await db.activity_logs.find({}).sort("created_at", -1).to_list(limit)
    return [doc_out(log) for log in logs]


@router.post("/scheduler/run-now")
async def run_scheduler_now(user: dict = ADMIN_DEP):
    """Manually trigger daily checks (for testing / catch-up)."""
    from server import db
    from scheduler_jobs import run_now
    await run_now(db)
    return {"ok": True}


@router.post("/announcements")
async def broadcast_announcement(payload: AnnouncementIn, user: dict = ADMIN_DEP):
    from server import db
    doc = {
        "_id": new_id(),
        "title": payload.title,
        "message": payload.message,
        "audience": payload.audience,
        "from": "platform",
        "created_by": user["_id"],
        "created_at": utcnow_iso(),
    }
    await db.announcements.insert_one(doc)

    target_role = {"tenants": "tenant", "caretakers": "caretaker", "all": None, "landlords": "landlord"}.get(payload.audience)
    query = {} if target_role is None else {"role": target_role}
    recipients = await db.users.find(query, {"_id": 1}).to_list(10000)
    for r in recipients:
        await push_notification(db, r["_id"], payload.title, payload.message, type_="announcement")
    await log_activity(db, user, "announcement_broadcast", "announcement", doc["_id"])
    return doc_out(doc)
