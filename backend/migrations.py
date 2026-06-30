"""Idempotent data migrations run at startup. Backfill new fields on existing docs without losing data."""
from db_utils import utcnow_iso


async def migrate(db):
    # Tenants: add status, archived defaults
    await db.tenants.update_many(
        {"status": {"$exists": False}, "archived": {"$ne": True}},
        {"$set": {"status": "active", "archived": False}},
    )
    await db.tenants.update_many(
        {"archived": {"$exists": False}},
        {"$set": {"archived": False}},
    )
    # Units: default status "vacant" if missing
    await db.units.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "vacant"}},
    )
    # Settings collection: ensure index by landlord_id
    await db.settings.create_index("landlord_id", unique=True)
    await db.notices.create_index("landlord_id")
    await db.notices.create_index("tenant_id")
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.login_attempts.create_index("email")
    # Notifications: add link / type defaults
    await db.notifications.update_many(
        {"type": {"$exists": False}}, {"$set": {"type": "info"}},
    )
