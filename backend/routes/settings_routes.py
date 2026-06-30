"""Landlord settings: business info, currency, reminders, receipt customization, notification prefs."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from auth import require_roles
from db_utils import new_id, utcnow_iso, doc_out

router = APIRouter(prefix="/api/settings", tags=["settings"])
LANDLORD_DEP = Depends(require_roles("landlord"))


class SettingsIn(BaseModel):
    business_name: Optional[str] = None
    logo_url: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    currency: Optional[str] = None       # default NGN
    timezone: Optional[str] = None       # e.g. Africa/Lagos
    receipt_prefix: Optional[str] = None # default RCP
    receipt_footer: Optional[str] = None
    reminder_days: Optional[list[int]] = None  # e.g. [30, 14, 7, 3, 1]
    notification_prefs: Optional[Dict[str, Any]] = None  # {email_rent_reminder, email_payment_receipt, ...}


@router.get("")
async def get_settings(user: dict = LANDLORD_DEP):
    from server import db
    doc = await db.settings.find_one({"landlord_id": user["_id"]})
    if not doc:
        doc = {
            "_id": new_id(), "landlord_id": user["_id"],
            "business_name": user.get("name") or "My Properties",
            "currency": "NGN", "timezone": "Africa/Lagos",
            "receipt_prefix": "RCP", "receipt_footer": "Thank you for your prompt payment.",
            "reminder_days": [30, 14, 7, 3, 1],
            "notification_prefs": {
                "email_rent_reminder": True,
                "email_payment_receipt": True,
                "email_maintenance_update": True,
                "email_notice": True,
            },
            "created_at": utcnow_iso(),
        }
        await db.settings.insert_one(doc)
    return doc_out(doc)


@router.put("")
async def update_settings(payload: SettingsIn, user: dict = LANDLORD_DEP):
    from server import db
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = utcnow_iso()
    await db.settings.update_one(
        {"landlord_id": user["_id"]},
        {"$set": updates, "$setOnInsert": {"_id": new_id(), "landlord_id": user["_id"], "created_at": utcnow_iso()}},
        upsert=True,
    )
    doc = await db.settings.find_one({"landlord_id": user["_id"]})
    return doc_out(doc)
