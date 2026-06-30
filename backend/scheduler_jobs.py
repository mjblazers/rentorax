"""APScheduler — daily 8am job that runs rent/lease/subscription checks,
generates notifications and sends email reminders.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from db_utils import days_between, push_notification, utcnow_iso, new_id
from mailer import rent_reminder, send_email

log = logging.getLogger(__name__)
scheduler: AsyncIOScheduler | None = None

REMIND_DAYS = {30, 14, 7, 3, 1, 0}  # send email on these days


async def daily_checks(db):
    """Walk all active tenants, send reminders, raise notifications, archive stale ones."""
    log.info("[scheduler] daily_checks running %s", utcnow_iso())
    tenants = await db.tenants.find({"archived": {"$ne": True}}).to_list(50000)
    today_iso = datetime.now(timezone.utc).date().isoformat()
    for t in tenants:
        days = days_between(t.get("lease_expiry"))
        # update status
        if days < 0:
            new_status = "expired"
        elif days < 14:
            new_status = "expiring_soon"
        else:
            new_status = "active"
        # don't override notice/move-out flow statuses
        if t.get("status") not in ("notice_issued", "move_out_scheduled", "vacated", "archived"):
            if t.get("status") != new_status:
                await db.tenants.update_one({"_id": t["_id"]}, {"$set": {"status": new_status}})
        # send reminders
        if days in REMIND_DAYS:
            landlord_id = t.get("landlord_id")
            tenant_email = t.get("email")
            # In-app notification for landlord
            await push_notification(
                db, landlord_id,
                f"Rent {'expired' if days < 0 else 'expiring'} — {t.get('full_name')}",
                f"{t.get('property_name')} · {t.get('unit_name')} — {('expired '+str(abs(days))+'d ago') if days < 0 else (str(days)+'d left')}",
                "warning" if days >= 0 else "danger",
                link=f"/landlord/tenants/{t['_id']}",
            )
            # In-app notification for tenant (if portal user exists)
            if t.get("user_id"):
                await push_notification(
                    db, t["user_id"],
                    f"Rent {'expired' if days < 0 else 'expiring soon'}",
                    f"{t.get('property_name')} · {t.get('unit_name')} — please contact your landlord.",
                    "danger" if days < 0 else "warning",
                )
            # Email tenant if email exists and a reminder hasn't been sent today
            last = (t.get("reminders") or {}).get(str(days))
            if tenant_email and last != today_iso:
                subject, html = rent_reminder(
                    tenant_name=t.get("full_name") or "tenant",
                    property_name=t.get("property_name") or "your property",
                    unit_name=t.get("unit_name") or "",
                    days=days,
                    expiry=t.get("lease_expiry") or "",
                )
                send_email(tenant_email, subject, html)
                await db.tenants.update_one(
                    {"_id": t["_id"]},
                    {"$set": {f"reminders.{days}": today_iso}},
                )
    log.info("[scheduler] daily_checks done")


def start_scheduler(app, db):
    """Start APScheduler on FastAPI startup."""
    global scheduler
    if scheduler is not None:
        return scheduler
    hour = int(os.environ.get("SCHEDULER_HOUR", "8"))
    minute = int(os.environ.get("SCHEDULER_MINUTE", "0"))
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        daily_checks, CronTrigger(hour=hour, minute=minute),
        args=[db], id="daily_checks", replace_existing=True,
    )
    scheduler.start()
    log.info("[scheduler] started — daily_checks cron %02d:%02d", hour, minute)
    return scheduler


async def run_now(db):
    """Helper for manual run via admin endpoint."""
    await daily_checks(db)


def stop_scheduler():
    global scheduler
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        scheduler = None
