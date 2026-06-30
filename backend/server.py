"""RentoraX backend entrypoint.
Loads env, configures CORS, mounts auth + role routers, seeds the super admin.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import hash_password, verify_password
from db_utils import new_id, utcnow_iso

# ---------------- DB ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------------- App ----------------
app = FastAPI(title="RentoraX API", version="1.0.0")

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
cors_extra = [o for o in os.environ.get("CORS_ORIGINS", "").split(",") if o and o != "*"]
allow_origins = list({frontend_url, "http://localhost:3000", *cors_extra})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ---------------- Routers ----------------
from routes.auth_routes import router as auth_router  # noqa: E402
from routes.admin_routes import router as admin_router  # noqa: E402
from routes.landlord_routes import router as landlord_router  # noqa: E402
from routes.tenant_routes import router as tenant_router  # noqa: E402
from routes.shared_routes import router as shared_router  # noqa: E402

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(landlord_router)
app.include_router(tenant_router)
app.include_router(shared_router)


@app.get("/api/")
async def root():
    return {"service": "RentoraX", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


# ---------------- Startup: seed admin + indexes ----------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("landlord_id")
    await db.properties.create_index("landlord_id")
    await db.units.create_index([("property_id", 1), ("name", 1)])
    await db.tenants.create_index("landlord_id")
    await db.tenants.create_index("user_id")
    await db.payments.create_index("landlord_id")
    await db.payments.create_index("tenant_id")
    await db.maintenance_tickets.create_index("landlord_id")
    await db.expenses.create_index("landlord_id")
    await db.notifications.create_index("user_id")
    await db.activity_logs.create_index("created_at")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rentorax.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    admin_name = os.environ.get("ADMIN_NAME", "RentoraX Admin")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "_id": new_id(),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": admin_name,
            "role": "super_admin",
            "suspended": False,
            "created_at": utcnow_iso(),
        })
        logging.info("Seeded super_admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"password_hash": hash_password(admin_password), "role": "super_admin", "updated_at": utcnow_iso()}},
        )
        logging.info("Updated super_admin password from env: %s", admin_email)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
