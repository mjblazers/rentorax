"""Landlord (and authorized caretaker) routes: properties, units, tenants, payments,
maintenance, expenses, income, accounting, reports, caretakers, dashboard."""
from datetime import datetime, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from auth import (
    get_current_user, require_roles, hash_password, get_landlord_scope,
    caretaker_can, caretaker_has_property,
)
from db_utils import new_id, utcnow_iso, doc_out, expiry_status, days_between, log_activity, push_notification
from models import (
    PropertyIn, PropertyUpdateIn, UnitIn, UnitUpdateIn,
    TenantIn, TenantUpdateIn, PaymentIn, ExpenseIn, IncomeIn,
    MaintenanceIn, MaintenanceUpdateIn, CaretakerCreateIn, CaretakerUpdateIn,
    AnnouncementIn,
)
from pydantic import BaseModel
from typing import Optional
from mailer import (
    welcome_caretaker, welcome_tenant, payment_receipt, maintenance_update,
    announcement as announcement_email, send_email,
)
import os
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

router = APIRouter(prefix="/api", tags=["landlord"])
LANDLORD_OR_CARETAKER = Depends(require_roles("landlord", "caretaker"))


def _gen_password(n: int = 10) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@$"
    return "".join(secrets.choice(alphabet) for _ in range(n))


async def _next_ticket_number(db, landlord_id: str) -> str:
    count = await db.maintenance_tickets.count_documents({"landlord_id": landlord_id})
    return f"TCK-{(count + 1):05d}"


# ====== DASHBOARD ======
@router.get("/dashboard/landlord")
async def landlord_dashboard(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    properties = await db.properties.count_documents({"landlord_id": landlord_id})
    units = await db.units.count_documents({"landlord_id": landlord_id})
    occupied = await db.units.count_documents({"landlord_id": landlord_id, "status": "occupied"})
    vacant = await db.units.count_documents({"landlord_id": landlord_id, "status": "vacant"})
    tenants = await db.tenants.count_documents({"landlord_id": landlord_id})

    payments = await db.payments.find({"landlord_id": landlord_id}).to_list(10000)
    now = datetime.now(timezone.utc)
    today_iso = now.date().isoformat()
    monthly_rev = 0.0
    yearly_rev = 0.0
    today_rev = 0.0
    for p in payments:
        try:
            dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if p["payment_date"][:10] == today_iso:
            today_rev += float(p.get("amount") or 0)
        if dt.year == now.year:
            yearly_rev += float(p.get("amount") or 0)
            if dt.month == now.month:
                monthly_rev += float(p.get("amount") or 0)

    expenses = await db.expenses.find({"landlord_id": landlord_id}).to_list(10000)
    monthly_exp = 0.0
    yearly_exp = 0.0
    for e in expenses:
        try:
            dt = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.year == now.year:
            yearly_exp += float(e.get("amount") or 0)
            if dt.month == now.month:
                monthly_exp += float(e.get("amount") or 0)

    # rent expiry alerts
    all_tenants = await db.tenants.find({"landlord_id": landlord_id}).to_list(10000)
    expiring_soon = []
    expired = []
    for t in all_tenants:
        status = expiry_status(t.get("lease_expiry"))
        days = days_between(t.get("lease_expiry"))
        item = {
            "tenant_id": t["_id"], "tenant_name": t.get("full_name"),
            "unit_name": t.get("unit_name"), "property_name": t.get("property_name"),
            "lease_expiry": t.get("lease_expiry"), "days": days, "status": status,
        }
        if status == "expired":
            expired.append(item)
        elif status in ("critical", "urgent"):
            expiring_soon.append(item)
    expiring_soon.sort(key=lambda x: x["days"])

    # monthly chart 12-month
    chart = {}
    for i in range(11, -1, -1):
        month = (now.month - i - 1) % 12 + 1
        year = now.year if (now.month - i) > 0 else now.year - 1
        key = f"{year}-{month:02d}"
        chart[key] = {"month": key, "income": 0.0, "expense": 0.0}
    for p in payments:
        try:
            dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        k = f"{dt.year}-{dt.month:02d}"
        if k in chart:
            chart[k]["income"] += float(p.get("amount") or 0)
    for e in expenses:
        try:
            dt = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
        except Exception:
            continue
        k = f"{dt.year}-{dt.month:02d}"
        if k in chart:
            chart[k]["expense"] += float(e.get("amount") or 0)

    return {
        "total_properties": properties,
        "total_units": units,
        "occupied_units": occupied,
        "vacant_units": vacant,
        "occupancy_rate": (occupied / units * 100) if units else 0,
        "total_tenants": tenants,
        "today_revenue": today_rev,
        "monthly_revenue": monthly_rev,
        "yearly_revenue": yearly_rev,
        "monthly_expenses": monthly_exp,
        "yearly_expenses": yearly_exp,
        "net_income_monthly": monthly_rev - monthly_exp,
        "net_income_yearly": yearly_rev - yearly_exp,
        "outstanding_count": len(expired),
        "open_tickets": await db.maintenance_tickets.count_documents({"landlord_id": landlord_id, "status": {"$nin": ["Completed", "Cancelled"]}}),
        "expiring_soon": expiring_soon[:10],
        "expired": expired[:10],
        "expiring_count": len(expiring_soon),
        "expired_count": len(expired),
        "cash_flow_chart": list(chart.values()),
    }


# ====== PROPERTIES ======
@router.get("/properties")
async def list_properties(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    query = {"landlord_id": landlord_id}
    if user["role"] == "caretaker" and not user.get("all_properties"):
        query["_id"] = {"$in": user.get("assigned_properties") or []}
    docs = await db.properties.find(query).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        total_units = await db.units.count_documents({"property_id": d["_id"]})
        occ = await db.units.count_documents({"property_id": d["_id"], "status": "occupied"})
        item = doc_out(d)
        item["total_units"] = total_units
        item["occupied"] = occ
        item["vacant"] = total_units - occ
        out.append(item)
    return out


@router.post("/properties")
async def create_property(payload: PropertyIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    landlord_id = user["_id"]
    doc = {
        "_id": new_id(),
        "landlord_id": landlord_id,
        "name": payload.name,
        "type": payload.type,
        "description": payload.description,
        "address": payload.address,
        "state": payload.state,
        "lga": payload.lga,
        "gps": payload.gps,
        "photos": payload.photos,
        "active": payload.active,
        "unit_prefix": payload.unit_prefix or "Room",
        "created_at": utcnow_iso(),
    }
    await db.properties.insert_one(doc)
    # auto-generate units
    if payload.num_units and payload.num_units > 0:
        prefix = payload.unit_prefix or "Room"
        units = [
            {
                "_id": new_id(), "landlord_id": landlord_id,
                "property_id": doc["_id"], "name": f"{prefix} {i + 1}",
                "status": "vacant", "created_at": utcnow_iso(),
            }
            for i in range(payload.num_units)
        ]
        if units:
            await db.units.insert_many(units)
    await log_activity(db, user, "property_create", "property", doc["_id"])
    return doc_out(doc)


@router.get("/properties/{property_id}")
async def get_property(property_id: str, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    if user["role"] == "caretaker" and not caretaker_has_property(user, property_id):
        raise HTTPException(403, "No access to this property")
    doc = await db.properties.find_one({"_id": property_id, "landlord_id": landlord_id})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc_out(doc)


@router.patch("/properties/{property_id}")
async def update_property(property_id: str, payload: PropertyUpdateIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.properties.update_one({"_id": property_id, "landlord_id": user["_id"]}, {"$set": updates})
    fresh = await db.properties.find_one({"_id": property_id})
    return doc_out(fresh)


@router.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(require_roles("landlord"))):
    from server import db
    await db.properties.delete_one({"_id": property_id, "landlord_id": user["_id"]})
    await db.units.delete_many({"property_id": property_id})
    await log_activity(db, user, "property_delete", "property", property_id)
    return {"ok": True}


# ====== UNITS ======
@router.get("/units")
async def list_units(property_id: str = None, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    query = {"landlord_id": landlord_id}
    if property_id:
        query["property_id"] = property_id
    if user["role"] == "caretaker" and not user.get("all_properties"):
        query["property_id"] = {"$in": user.get("assigned_properties") or []}
    docs = await db.units.find(query).sort("name", 1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("/units")
async def create_unit(payload: UnitIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    doc = {
        "_id": new_id(),
        "landlord_id": user["_id"],
        "property_id": payload.property_id,
        "name": payload.name,
        "status": payload.status or "vacant",
        "created_at": utcnow_iso(),
    }
    await db.units.insert_one(doc)
    return doc_out(doc)


@router.patch("/units/{unit_id}")
async def update_unit(unit_id: str, payload: UnitUpdateIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.units.update_one({"_id": unit_id, "landlord_id": user["_id"]}, {"$set": updates})
    fresh = await db.units.find_one({"_id": unit_id})
    return doc_out(fresh)


@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: str, user: dict = Depends(require_roles("landlord"))):
    from server import db
    unit = await db.units.find_one({"_id": unit_id, "landlord_id": user["_id"]})
    if not unit:
        raise HTTPException(404, "Not found")
    await db.units.delete_one({"_id": unit_id})
    return {"ok": True}


# ====== TENANTS ======
@router.get("/tenants")
async def list_tenants(q: str = "", property_id: str = None, include_archived: bool = False, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "view_tenants"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    query = {"landlord_id": landlord_id}
    if not include_archived:
        query["archived"] = {"$ne": True}
    if property_id:
        query["property_id"] = property_id
    if user["role"] == "caretaker" and not user.get("all_properties"):
        query["property_id"] = {"$in": user.get("assigned_properties") or []}
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"nin": {"$regex": q, "$options": "i"}},
            {"guarantor_name": {"$regex": q, "$options": "i"}},
            {"occupation": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.tenants.find(query).sort("created_at", -1).to_list(2000)
    for d in docs:
        d["lease_status"] = expiry_status(d.get("lease_expiry"))
        d["days_to_expiry"] = days_between(d.get("lease_expiry"))
    return [doc_out(d) for d in docs]


@router.post("/tenants")
async def create_tenant(payload: TenantIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "add_tenants"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)

    prop = await db.properties.find_one({"_id": payload.property_id, "landlord_id": landlord_id})
    if not prop:
        raise HTTPException(400, "Invalid property")
    unit = await db.units.find_one({"_id": payload.unit_id, "property_id": payload.property_id})
    if not unit:
        raise HTTPException(400, "Invalid unit")

    tenant_id = new_id()
    portal_user_id = None
    if payload.portal_enabled and payload.email and payload.portal_password:
        existing = await db.users.find_one({"email": payload.email.lower()})
        if existing:
            raise HTTPException(400, "A user with this email already exists")
        portal_user_id = new_id()
        await db.users.insert_one({
            "_id": portal_user_id,
            "email": payload.email.lower(),
            "password_hash": hash_password(payload.portal_password),
            "name": payload.full_name,
            "phone": payload.phone,
            "role": "tenant",
            "landlord_id": landlord_id,
            "tenant_id": tenant_id,
            "created_at": utcnow_iso(),
        })

    data = payload.model_dump(exclude={"portal_password"})
    doc = {
        "_id": tenant_id,
        "landlord_id": landlord_id,
        "property_name": prop["name"],
        "unit_name": unit["name"],
        "user_id": portal_user_id,
        "created_at": utcnow_iso(),
        **data,
    }
    await db.tenants.insert_one(doc)
    await db.units.update_one({"_id": payload.unit_id}, {"$set": {"status": "occupied", "tenant_id": tenant_id}})
    # initial payment if amount_paid provided
    if payload.amount_paid and payload.amount_paid > 0:
        await db.payments.insert_one({
            "_id": new_id(),
            "landlord_id": landlord_id,
            "tenant_id": tenant_id,
            "tenant_name": payload.full_name,
            "property_id": payload.property_id,
            "property_name": prop["name"],
            "unit_id": payload.unit_id,
            "unit_name": unit["name"],
            "amount": payload.amount_paid,
            "payment_date": payload.lease_start,
            "payment_method": "Initial",
            "transaction_ref": "INIT",
            "receipt_number": f"RCP-{new_id()[:8].upper()}",
            "outstanding_balance": 0,
            "renewal_date": payload.lease_expiry,
            "recorded_by": user["_id"],
            "created_at": utcnow_iso(),
        })
    await log_activity(db, user, "tenant_create", "tenant", tenant_id)
    return doc_out(doc)


@router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    t = await db.tenants.find_one({"_id": tenant_id, "landlord_id": landlord_id})
    if not t:
        raise HTTPException(404, "Not found")
    t["lease_status"] = expiry_status(t.get("lease_expiry"))
    t["days_to_expiry"] = days_between(t.get("lease_expiry"))
    return doc_out(t)


@router.patch("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, payload: TenantUpdateIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "edit_tenants"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "unit_id" in updates or "property_id" in updates:
        old = await db.tenants.find_one({"_id": tenant_id})
        if old and updates.get("unit_id") and updates["unit_id"] != old.get("unit_id"):
            await db.units.update_one({"_id": old["unit_id"]}, {"$set": {"status": "vacant", "tenant_id": None}})
            await db.units.update_one({"_id": updates["unit_id"]}, {"$set": {"status": "occupied", "tenant_id": tenant_id}})
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.tenants.update_one({"_id": tenant_id, "landlord_id": landlord_id}, {"$set": updates})
    fresh = await db.tenants.find_one({"_id": tenant_id})
    fresh["lease_status"] = expiry_status(fresh.get("lease_expiry"))
    fresh["days_to_expiry"] = days_between(fresh.get("lease_expiry"))
    return doc_out(fresh)


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, user: dict = Depends(require_roles("landlord"))):
    """Archive a tenant. Preserves all history. Unit becomes vacant."""
    from server import db
    tenant = await db.tenants.find_one({"_id": tenant_id, "landlord_id": user["_id"]})
    if not tenant:
        raise HTTPException(404, "Not found")
    await db.tenants.update_one(
        {"_id": tenant_id},
        {"$set": {"archived": True, "status": "archived", "archived_at": utcnow_iso()}},
    )
    if tenant.get("unit_id"):
        await db.units.update_one({"_id": tenant["unit_id"]}, {"$set": {"status": "vacant", "tenant_id": None}})
    if tenant.get("user_id"):
        await db.users.update_one({"_id": tenant["user_id"]}, {"$set": {"suspended": True}})
    await log_activity(db, user, "tenant_archive", "tenant", tenant_id)
    return {"ok": True, "archived": True}


class MoveOutChecklist(BaseModel):
    rent_paid: bool = False
    utilities_settled: bool = False
    inspection_done: bool = False
    keys_returned: bool = False
    damage_assessed: bool = False
    deposit_refunded: Optional[float] = 0
    notes: Optional[str] = ""


@router.post("/tenants/{tenant_id}/move-out")
async def move_out_tenant(tenant_id: str, payload: MoveOutChecklist, user: dict = Depends(require_roles("landlord"))):
    """Move-out workflow: archive tenancy, mark unit vacant, preserve all history."""
    from server import db
    tenant = await db.tenants.find_one({"_id": tenant_id, "landlord_id": user["_id"]})
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    await db.move_outs.insert_one({
        "_id": new_id(),
        "landlord_id": user["_id"],
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("full_name"),
        "property_id": tenant.get("property_id"),
        "property_name": tenant.get("property_name"),
        "unit_id": tenant.get("unit_id"),
        "unit_name": tenant.get("unit_name"),
        "lease_start": tenant.get("lease_start"),
        "lease_expiry": tenant.get("lease_expiry"),
        "amount_paid": tenant.get("amount_paid"),
        "payment_frequency": tenant.get("payment_frequency"),
        "moved_out_at": utcnow_iso(),
        "checklist": payload.model_dump(),
        "performed_by": user["_id"],
    })
    await db.tenants.update_one(
        {"_id": tenant_id},
        {"$set": {
            "status": "vacated", "archived": True, "vacated_at": utcnow_iso(),
            "move_out": payload.model_dump(),
        }},
    )
    if tenant.get("unit_id"):
        await db.units.update_one({"_id": tenant["unit_id"]}, {"$set": {"status": "vacant", "tenant_id": None}})
    if tenant.get("user_id"):
        await db.users.update_one({"_id": tenant["user_id"]}, {"$set": {"suspended": True}})
    await log_activity(db, user, "tenant_move_out", "tenant", tenant_id, payload.model_dump())
    return {"ok": True}


class AssignExistingIn(BaseModel):
    tenant_id: str
    lease_start: str
    lease_expiry: str
    amount_paid: float = 0
    payment_frequency: str = "yearly"


@router.post("/units/{unit_id}/assign-existing")
async def assign_existing(unit_id: str, payload: AssignExistingIn, user: dict = Depends(require_roles("landlord"))):
    """Re-use an existing (typically archived) tenant for a vacant unit."""
    from server import db
    unit = await db.units.find_one({"_id": unit_id, "landlord_id": user["_id"]})
    if not unit:
        raise HTTPException(404, "Unit not found")
    if unit.get("status") == "occupied":
        raise HTTPException(400, "Unit is already occupied")
    tenant = await db.tenants.find_one({"_id": payload.tenant_id, "landlord_id": user["_id"]})
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    prop = await db.properties.find_one({"_id": unit["property_id"]})
    await db.tenants.update_one(
        {"_id": payload.tenant_id},
        {"$set": {
            "property_id": unit["property_id"],
            "property_name": prop["name"] if prop else None,
            "unit_id": unit_id,
            "unit_name": unit.get("name"),
            "lease_start": payload.lease_start,
            "lease_expiry": payload.lease_expiry,
            "amount_paid": payload.amount_paid,
            "payment_frequency": payload.payment_frequency,
            "archived": False, "status": "active",
            "reassigned_at": utcnow_iso(),
        }, "$unset": {"vacated_at": ""}},
    )
    await db.units.update_one({"_id": unit_id}, {"$set": {"status": "occupied", "tenant_id": payload.tenant_id}})
    if tenant.get("user_id"):
        await db.users.update_one({"_id": tenant["user_id"]}, {"$set": {"suspended": False}})
    await log_activity(db, user, "tenant_reassign", "tenant", payload.tenant_id, {"unit_id": unit_id})
    return {"ok": True}


@router.get("/units/{unit_id}/history")
async def unit_history(unit_id: str, user: dict = Depends(require_roles("landlord", "caretaker"))):
    """Occupancy history for a unit — every tenancy ever in this unit (past + current)."""
    from server import db
    landlord_id = get_landlord_scope(user)

    # Past tenancies from move_outs snapshots
    past = await db.move_outs.find({"landlord_id": landlord_id, "unit_id": unit_id}).to_list(500)
    rows = []
    for m in past:
        rows.append({
            "id": m.get("tenant_id"),
            "full_name": m.get("tenant_name"),
            "lease_start": m.get("lease_start"),
            "lease_expiry": m.get("lease_expiry"),
            "vacated_at": m.get("moved_out_at"),
            "status": "vacated",
            "archived": True,
            "amount_paid": m.get("amount_paid"),
        })

    # Current active tenant in this unit (not archived)
    current = await db.tenants.find_one(
        {"landlord_id": landlord_id, "unit_id": unit_id, "archived": {"$ne": True}}
    )
    if current:
        rows.append({
            "id": current["_id"], "full_name": current.get("full_name"),
            "lease_start": current.get("lease_start"), "lease_expiry": current.get("lease_expiry"),
            "vacated_at": current.get("vacated_at"), "status": current.get("status", "active"),
            "archived": False, "amount_paid": current.get("amount_paid"),
        })

    rows.sort(key=lambda r: r.get("lease_start") or "", reverse=True)
    return rows


# ====== PAYMENTS ======
@router.get("/payments")
async def list_payments(tenant_id: str = None, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    query = {"landlord_id": landlord_id}
    if tenant_id:
        query["tenant_id"] = tenant_id
    docs = await db.payments.find(query).sort("payment_date", -1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("/payments")
async def record_payment(payload: PaymentIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "record_payment"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    tenant = await db.tenants.find_one({"_id": payload.tenant_id, "landlord_id": landlord_id})
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    receipt_number = f"RCP-{new_id()[:8].upper()}"
    doc = {
        "_id": new_id(),
        "landlord_id": landlord_id,
        "tenant_id": payload.tenant_id,
        "tenant_name": tenant.get("full_name"),
        "property_id": tenant.get("property_id"),
        "property_name": tenant.get("property_name"),
        "unit_id": tenant.get("unit_id"),
        "unit_name": tenant.get("unit_name"),
        "amount": payload.amount,
        "payment_date": payload.payment_date,
        "payment_method": payload.payment_method,
        "transaction_ref": payload.transaction_ref,
        "receipt_number": receipt_number,
        "receipt_upload": payload.receipt_upload,
        "outstanding_balance": payload.outstanding_balance,
        "renewal_date": payload.renewal_date,
        "notes": payload.notes,
        "recorded_by": user["_id"],
        "created_at": utcnow_iso(),
    }
    await db.payments.insert_one(doc)
    if payload.renewal_date:
        await db.tenants.update_one({"_id": payload.tenant_id}, {"$set": {"lease_expiry": payload.renewal_date}})
    await log_activity(db, user, "payment_record", "payment", doc["_id"], {"amount": payload.amount})
    if tenant.get("user_id"):
        await push_notification(db, tenant["user_id"], "Payment recorded",
                                f"NGN {payload.amount:,.2f} received. Receipt: {receipt_number}", "success",
                                link="/tenant/payments")
        # email tenant
        if tenant.get("email"):
            try:
                subject, html = payment_receipt(
                    tenant.get("full_name") or "tenant",
                    f"NGN {payload.amount:,.2f}", receipt_number,
                    tenant.get("property_name") or "", tenant.get("unit_name") or "",
                    f"{FRONTEND_URL}/tenant/payments",
                )
                send_email(tenant["email"], subject, html)
            except Exception:
                pass
    return doc_out(doc)


# ====== MAINTENANCE ======
@router.get("/maintenance")
async def list_maintenance(status: str = None, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    query = {"landlord_id": landlord_id}
    if status:
        query["status"] = status
    if user["role"] == "caretaker" and not user.get("all_properties"):
        query["property_id"] = {"$in": user.get("assigned_properties") or []}
    docs = await db.maintenance_tickets.find(query).sort("created_at", -1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("/maintenance")
async def create_maintenance(payload: MaintenanceIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "create_maintenance"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    prop = await db.properties.find_one({"_id": payload.property_id, "landlord_id": landlord_id})
    if not prop:
        raise HTTPException(400, "Invalid property")
    unit = await db.units.find_one({"_id": payload.unit_id}) if payload.unit_id else None
    tenant = await db.tenants.find_one({"_id": payload.tenant_id}) if payload.tenant_id else None
    ticket_number = await _next_ticket_number(db, landlord_id)
    doc = {
        "_id": new_id(),
        "ticket_number": ticket_number,
        "landlord_id": landlord_id,
        "property_id": payload.property_id,
        "property_name": prop["name"],
        "unit_id": payload.unit_id,
        "unit_name": unit["name"] if unit else None,
        "tenant_id": payload.tenant_id,
        "tenant_name": tenant["full_name"] if tenant else None,
        "category": payload.category,
        "priority": payload.priority,
        "description": payload.description,
        "photos": payload.photos,
        "date_reported": utcnow_iso(),
        "estimated_cost": payload.estimated_cost,
        "actual_cost": 0,
        "status": "Open",
        "created_by": user["_id"],
        "created_by_role": user["role"],
        "created_at": utcnow_iso(),
    }
    await db.maintenance_tickets.insert_one(doc)
    await log_activity(db, user, "maintenance_create", "maintenance", doc["_id"])
    await push_notification(db, landlord_id, f"New Ticket {ticket_number}",
                            f"{payload.priority} priority — {payload.category} at {prop['name']}", "maintenance",
                            link=f"/landlord/maintenance/{doc['_id']}")
    return doc_out(doc)


@router.patch("/maintenance/{ticket_id}")
async def update_maintenance(ticket_id: str, payload: MaintenanceUpdateIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "update_maintenance"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.maintenance_tickets.update_one(
            {"_id": ticket_id, "landlord_id": landlord_id},
            {"$set": updates},
        )
    fresh = await db.maintenance_tickets.find_one({"_id": ticket_id})
    if not fresh:
        raise HTTPException(404, "Not found")
    if "status" in updates and fresh.get("tenant_id"):
        tenant = await db.tenants.find_one({"_id": fresh["tenant_id"]})
        if tenant and tenant.get("user_id"):
            await push_notification(db, tenant["user_id"], "Maintenance update",
                                    f"Ticket {fresh.get('ticket_number')} is now: {updates['status']}", "info")
            if tenant.get("email"):
                try:
                    subject, html = maintenance_update(
                        tenant.get("full_name") or "tenant", fresh.get("ticket_number") or "",
                        updates["status"], f"{FRONTEND_URL}/tenant/maintenance",
                    )
                    send_email(tenant["email"], subject, html)
                except Exception:
                    pass
    return doc_out(fresh)


# ====== EXPENSES ======
@router.get("/expenses")
async def list_expenses(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "view_accounting"):
        # Caretakers with record_expense can still post but may not view all
        if not caretaker_can(user, "record_expense"):
            raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    docs = await db.expenses.find({"landlord_id": landlord_id}).sort("date", -1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("/expenses")
async def create_expense(payload: ExpenseIn, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    if user["role"] == "caretaker" and not caretaker_can(user, "record_expense"):
        raise HTTPException(403, "Not allowed")
    landlord_id = get_landlord_scope(user)
    prop_name = None
    if payload.property_id:
        prop = await db.properties.find_one({"_id": payload.property_id, "landlord_id": landlord_id})
        prop_name = prop["name"] if prop else None
    doc = {
        "_id": new_id(),
        "landlord_id": landlord_id,
        "property_id": payload.property_id,
        "property_name": prop_name,
        "category": payload.category,
        "vendor": payload.vendor,
        "description": payload.description,
        "amount": payload.amount,
        "date": payload.date,
        "receipt": payload.receipt,
        "payment_method": payload.payment_method,
        "recorded_by": user["_id"],
        "created_at": utcnow_iso(),
    }
    await db.expenses.insert_one(doc)
    return doc_out(doc)


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(require_roles("landlord"))):
    from server import db
    await db.expenses.delete_one({"_id": expense_id, "landlord_id": user["_id"]})
    return {"ok": True}


# ====== INCOME (other income beyond rent) ======
@router.get("/income")
async def list_income(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    docs = await db.income.find({"landlord_id": landlord_id}).sort("date", -1).to_list(2000)
    return [doc_out(d) for d in docs]


@router.post("/income")
async def create_income(payload: IncomeIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    doc = {
        "_id": new_id(),
        "landlord_id": user["_id"],
        "property_id": payload.property_id,
        "source": payload.source,
        "description": payload.description,
        "amount": payload.amount,
        "date": payload.date,
        "created_at": utcnow_iso(),
    }
    await db.income.insert_one(doc)
    return doc_out(doc)


# ====== ACCOUNTING SUMMARY ======
@router.get("/accounting/summary")
async def accounting_summary(year: int = None, user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    now = datetime.now(timezone.utc)
    year = year or now.year
    payments = await db.payments.find({"landlord_id": landlord_id}).to_list(20000)
    expenses = await db.expenses.find({"landlord_id": landlord_id}).to_list(20000)
    income_other = await db.income.find({"landlord_id": landlord_id}).to_list(20000)

    by_month = {f"{m:02d}": {"month": f"{m:02d}", "income": 0.0, "expense": 0.0} for m in range(1, 13)}
    expense_by_cat = {}
    income_by_source = {"Rent Payments": 0.0}

    for p in payments:
        try:
            dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.year == year:
            k = f"{dt.month:02d}"
            by_month[k]["income"] += float(p.get("amount") or 0)
            income_by_source["Rent Payments"] += float(p.get("amount") or 0)

    for inc in income_other:
        try:
            dt = datetime.fromisoformat(inc["date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.year == year:
            k = f"{dt.month:02d}"
            by_month[k]["income"] += float(inc.get("amount") or 0)
            src = inc.get("source") or "Other"
            income_by_source[src] = income_by_source.get(src, 0) + float(inc.get("amount") or 0)

    for e in expenses:
        try:
            dt = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.year == year:
            k = f"{dt.month:02d}"
            by_month[k]["expense"] += float(e.get("amount") or 0)
            cat = e.get("category") or "Other"
            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + float(e.get("amount") or 0)

    total_income = sum(income_by_source.values())
    total_expense = sum(expense_by_cat.values())
    return {
        "year": year,
        "monthly": list(by_month.values()),
        "expense_by_category": [{"category": k, "amount": v} for k, v in expense_by_cat.items()],
        "income_by_source": [{"source": k, "amount": v} for k, v in income_by_source.items()],
        "total_income": total_income,
        "total_expense": total_expense,
        "net_income": total_income - total_expense,
    }


# ====== REPORTS ======
@router.get("/reports/occupancy")
async def report_occupancy(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    properties = await db.properties.find({"landlord_id": landlord_id}).to_list(500)
    out = []
    for p in properties:
        total = await db.units.count_documents({"property_id": p["_id"]})
        occ = await db.units.count_documents({"property_id": p["_id"], "status": "occupied"})
        out.append({
            "property_id": p["_id"], "property_name": p["name"],
            "total_units": total, "occupied": occ, "vacant": total - occ,
            "rate": (occ / total * 100) if total else 0,
        })
    return out


@router.get("/reports/expiring")
async def report_expiring(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    tenants = await db.tenants.find({"landlord_id": landlord_id}).to_list(5000)
    rows = []
    for t in tenants:
        status = expiry_status(t.get("lease_expiry"))
        rows.append({
            "tenant_id": t["_id"],
            "tenant_name": t.get("full_name"),
            "property_name": t.get("property_name"),
            "unit_name": t.get("unit_name"),
            "lease_expiry": t.get("lease_expiry"),
            "days": days_between(t.get("lease_expiry")),
            "status": status,
            "amount_paid": t.get("amount_paid"),
        })
    rows.sort(key=lambda r: r["days"])
    return rows


# ====== CARETAKERS (landlord only) ======
@router.get("/caretakers")
async def list_caretakers(user: dict = Depends(require_roles("landlord"))):
    from server import db
    docs = await db.users.find({"role": "caretaker", "landlord_id": user["_id"]}).to_list(500)
    return [doc_out(d) for d in docs]


@router.post("/caretakers")
async def create_caretaker(payload: CaretakerCreateIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already exists")
    plain_password = payload.password or _gen_password()
    doc = {
        "_id": new_id(),
        "email": email,
        "password_hash": hash_password(plain_password),
        "name": payload.name,
        "phone": payload.phone,
        "role": "caretaker",
        "landlord_id": user["_id"],
        "assigned_properties": payload.assigned_properties,
        "all_properties": payload.all_properties,
        "permissions": payload.permissions.model_dump(),
        "suspended": False,
        "created_at": utcnow_iso(),
    }
    await db.users.insert_one(doc)
    out = doc_out(doc)
    out["generated_password"] = plain_password
    return out


@router.patch("/caretakers/{caretaker_id}")
async def update_caretaker(caretaker_id: str, payload: CaretakerUpdateIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    updates = {}
    d = payload.model_dump()
    for k, v in d.items():
        if v is None:
            continue
        if k == "permissions" and v is not None:
            updates[k] = v
        else:
            updates[k] = v
    if updates:
        updates["updated_at"] = utcnow_iso()
        await db.users.update_one({"_id": caretaker_id, "landlord_id": user["_id"], "role": "caretaker"}, {"$set": updates})
    fresh = await db.users.find_one({"_id": caretaker_id})
    return doc_out(fresh)


@router.delete("/caretakers/{caretaker_id}")
async def delete_caretaker(caretaker_id: str, user: dict = Depends(require_roles("landlord"))):
    from server import db
    await db.users.delete_one({"_id": caretaker_id, "landlord_id": user["_id"], "role": "caretaker"})
    return {"ok": True}


# ====== ANNOUNCEMENTS (landlord -> own tenants) ======
@router.post("/announcements")
async def send_announcement(payload: AnnouncementIn, user: dict = Depends(require_roles("landlord"))):
    from server import db
    doc = {
        "_id": new_id(),
        "landlord_id": user["_id"],
        "title": payload.title,
        "message": payload.message,
        "audience": payload.audience,
        "created_at": utcnow_iso(),
    }
    await db.announcements.insert_one(doc)
    role = "tenant" if payload.audience == "tenants" else ("caretaker" if payload.audience == "caretakers" else None)
    query = {"landlord_id": user["_id"]}
    if role:
        query["role"] = role
    targets = await db.users.find(query, {"_id": 1}).to_list(2000)
    for t in targets:
        await push_notification(db, t["_id"], payload.title, payload.message, "announcement")
    return doc_out(doc)


@router.get("/announcements")
async def list_announcements(user: dict = LANDLORD_OR_CARETAKER):
    from server import db
    landlord_id = get_landlord_scope(user)
    docs = await db.announcements.find({"landlord_id": landlord_id}).sort("created_at", -1).to_list(200)
    return [doc_out(d) for d in docs]
