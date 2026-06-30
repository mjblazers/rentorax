"""Shared routes: notifications for any role, global search."""
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, get_landlord_scope

router = APIRouter(prefix="/api", tags=["shared"])
from db_utils import doc_out


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    from server import db
    docs = await db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(200)
    return [doc_out(d) for d in docs]


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    from server import db
    await db.notifications.update_one({"_id": nid, "user_id": user["_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    from server import db
    await db.notifications.update_many({"user_id": user["_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.get("/search")
async def global_search(q: str = "", user: dict = Depends(get_current_user)):
    from server import db
    if not q or len(q) < 2:
        return {"tenants": [], "properties": [], "payments": [], "maintenance": []}
    role = user.get("role")
    if role == "super_admin":
        scope = {}
        prop_scope = {}
    elif role in ("landlord", "caretaker"):
        scope = {"landlord_id": get_landlord_scope(user)}
        prop_scope = dict(scope)
        if role == "caretaker" and not user.get("all_properties"):
            prop_scope["property_id"] = {"$in": user.get("assigned_properties") or []}
    else:
        raise HTTPException(403, "Forbidden")
    regex = {"$regex": q, "$options": "i"}
    t_query = {**prop_scope, "$or": [{"full_name": regex}, {"phone": regex}, {"nin": regex}, {"guarantor_name": regex}, {"occupation": regex}]}
    # For properties collection the document id is the property_id (no property_id field), so filter by _id
    p_query_base = {**scope}
    if role == "caretaker" and not user.get("all_properties"):
        p_query_base["_id"] = {"$in": user.get("assigned_properties") or []}
    p_query = {**p_query_base, "$or": [{"name": regex}, {"address": regex}, {"state": regex}]}
    pay_query = {**prop_scope, "$or": [{"tenant_name": regex}, {"receipt_number": regex}, {"transaction_ref": regex}]}
    m_query = {**prop_scope, "$or": [{"ticket_number": regex}, {"description": regex}, {"category": regex}]}
    tenants = [doc_out(d) for d in await db.tenants.find(t_query).limit(15).to_list(15)]
    properties = [doc_out(d) for d in await db.properties.find(p_query).limit(15).to_list(15)]
    payments = [doc_out(d) for d in await db.payments.find(pay_query).limit(15).to_list(15)]
    maintenance = [doc_out(d) for d in await db.maintenance_tickets.find(m_query).limit(15).to_list(15)]
    return {"tenants": tenants, "properties": properties, "payments": payments, "maintenance": maintenance}
