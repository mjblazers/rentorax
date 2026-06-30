"""Tenant portal routes: profile, payment history, maintenance, announcements."""
from fastapi import APIRouter, Depends, HTTPException
from auth import require_roles
from db_utils import new_id, utcnow_iso, doc_out, expiry_status, days_between, log_activity, push_notification
from models import TenantMaintenanceIn

router = APIRouter(prefix="/api/tenant", tags=["tenant"])
TENANT_DEP = Depends(require_roles("tenant"))


async def _resolve_tenant(db, user: dict) -> dict:
    tenant = await db.tenants.find_one({"_id": user.get("tenant_id")})
    if not tenant:
        raise HTTPException(404, "Tenant record not found")
    return tenant


@router.get("/dashboard")
async def tenant_dashboard(user: dict = TENANT_DEP):
    from server import db
    tenant = await _resolve_tenant(db, user)
    payments = await db.payments.find({"tenant_id": tenant["_id"]}).sort("payment_date", -1).to_list(200)
    last_payment = payments[0] if payments else None
    landlord = await db.users.find_one({"_id": tenant["landlord_id"]})
    return {
        "tenant": {**doc_out(tenant),
                    "lease_status": expiry_status(tenant.get("lease_expiry")),
                    "days_to_expiry": days_between(tenant.get("lease_expiry"))},
        "landlord_name": landlord.get("name") if landlord else None,
        "landlord_phone": landlord.get("phone") if landlord else None,
        "last_payment": doc_out(last_payment) if last_payment else None,
        "payment_count": len(payments),
        "total_paid": sum(float(p.get("amount") or 0) for p in payments),
    }


@router.get("/payments")
async def tenant_payments(user: dict = TENANT_DEP):
    from server import db
    tenant = await _resolve_tenant(db, user)
    docs = await db.payments.find({"tenant_id": tenant["_id"]}).sort("payment_date", -1).to_list(500)
    return [doc_out(d) for d in docs]


@router.get("/maintenance")
async def tenant_maintenance(user: dict = TENANT_DEP):
    from server import db
    tenant = await _resolve_tenant(db, user)
    docs = await db.maintenance_tickets.find({"tenant_id": tenant["_id"]}).sort("created_at", -1).to_list(500)
    return [doc_out(d) for d in docs]


@router.post("/maintenance")
async def submit_maintenance(payload: TenantMaintenanceIn, user: dict = TENANT_DEP):
    from server import db
    tenant = await _resolve_tenant(db, user)
    count = await db.maintenance_tickets.count_documents({"landlord_id": tenant["landlord_id"]})
    ticket_number = f"TCK-{(count + 1):05d}"
    doc = {
        "_id": new_id(),
        "ticket_number": ticket_number,
        "landlord_id": tenant["landlord_id"],
        "property_id": tenant["property_id"],
        "property_name": tenant.get("property_name"),
        "unit_id": tenant.get("unit_id"),
        "unit_name": tenant.get("unit_name"),
        "tenant_id": tenant["_id"],
        "tenant_name": tenant.get("full_name"),
        "category": payload.category,
        "priority": payload.priority,
        "description": payload.description,
        "photos": payload.photos,
        "date_reported": utcnow_iso(),
        "estimated_cost": 0,
        "actual_cost": 0,
        "status": "Open",
        "created_by": user["_id"],
        "created_by_role": "tenant",
        "created_at": utcnow_iso(),
    }
    await db.maintenance_tickets.insert_one(doc)
    await push_notification(db, tenant["landlord_id"], f"New tenant request {ticket_number}",
                            f"{tenant.get('full_name')} reported a {payload.category} issue ({payload.priority}).",
                            "maintenance")
    await log_activity(db, user, "maintenance_create", "maintenance", doc["_id"])
    return doc_out(doc)


@router.get("/announcements")
async def tenant_announcements(user: dict = TENANT_DEP):
    from server import db
    tenant = await _resolve_tenant(db, user)
    docs = await db.announcements.find(
        {"$or": [{"landlord_id": tenant["landlord_id"]}, {"audience": "all"}, {"audience": "tenants"}]}
    ).sort("created_at", -1).to_list(200)
    return [doc_out(d) for d in docs]


@router.get("/notifications")
async def my_notifications(user: dict = TENANT_DEP):
    from server import db
    docs = await db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(200)
    return [doc_out(d) for d in docs]


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = TENANT_DEP):
    from server import db
    await db.notifications.update_one({"_id": nid, "user_id": user["_id"]}, {"$set": {"read": True}})
    return {"ok": True}
