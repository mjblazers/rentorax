"""End-to-end backend tests for RentoraX.
Covers: auth (super admin/landlord/tenant), landlord CRUD by admin (suspend/activate/reset/delete),
properties+units auto-generation, tenants (portal user creation, initial payment), payments,
maintenance ticket numbering, accounting summary, caretaker RBAC, reports, search, auth boundaries.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rentorax.com"
ADMIN_PASSWORD = "Admin@2026"

# Shared state across the ordered test flow
STATE = {}


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, password):
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return s, r


# ---------- Health & Auth basics ----------

def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_admin_login_and_me():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user" in data and data["user"]["role"] == "super_admin"
    # cookies set
    assert "access_token" in s.cookies
    # /me
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN_EMAIL
    STATE["admin_session"] = s


def test_admin_invalid_login():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


# ---------- Super Admin: landlord lifecycle ----------

def test_admin_create_landlord_and_listing():
    s = STATE["admin_session"]
    suffix = uuid.uuid4().hex[:8]
    email = f"landlord_{suffix}@test.com"
    r = s.post(f"{API}/admin/landlords", json={
        "name": "Test Landlord",
        "email": email,
        "phone": "+2348012345678",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == email
    assert data["role"] == "landlord"
    assert "generated_password" in data and len(data["generated_password"]) >= 8
    STATE["landlord_id"] = data["id"]
    STATE["landlord_email"] = email
    STATE["landlord_password"] = data["generated_password"]

    # list
    r2 = s.get(f"{API}/admin/landlords")
    assert r2.status_code == 200
    arr = r2.json()
    found = next((x for x in arr if x["id"] == data["id"]), None)
    assert found is not None
    assert "property_count" in found and "tenant_count" in found
    assert found["property_count"] == 0


def test_landlord_can_login_with_generated_password():
    s, r = _login(STATE["landlord_email"], STATE["landlord_password"])
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "landlord"
    STATE["landlord_session"] = s


def test_admin_suspend_then_activate():
    s = STATE["admin_session"]
    lid = STATE["landlord_id"]
    r = s.post(f"{API}/admin/landlords/{lid}/suspend")
    assert r.status_code == 200
    # login should fail
    r2 = requests.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": STATE["landlord_password"]})
    assert r2.status_code == 403
    # activate
    r3 = s.post(f"{API}/admin/landlords/{lid}/activate")
    assert r3.status_code == 200
    r4 = requests.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": STATE["landlord_password"]})
    assert r4.status_code == 200


def test_admin_reset_password():
    s = STATE["admin_session"]
    r = s.post(f"{API}/admin/landlords/{STATE['landlord_id']}/reset-password")
    assert r.status_code == 200
    new_pw = r.json().get("new_password")
    assert new_pw and len(new_pw) >= 8
    # old password should fail, new should work
    old_fail = requests.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": STATE["landlord_password"]})
    assert old_fail.status_code == 401
    ok = requests.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": new_pw})
    assert ok.status_code == 200
    STATE["landlord_password"] = new_pw
    STATE["landlord_session"] = ok.cookies and ok  # re-login session below
    # rebuild a session
    s2 = _session()
    rl = s2.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": new_pw})
    assert rl.status_code == 200
    STATE["landlord_session"] = s2


# ---------- Landlord: property + units ----------

def test_landlord_create_property_with_5_units():
    s = STATE["landlord_session"]
    r = s.post(f"{API}/properties", json={
        "name": "Diaspora Heights",
        "type": "Hostel",
        "address": "1 Test Rd",
        "state": "Lagos",
        "num_units": 5,
        "unit_prefix": "Room",
    })
    assert r.status_code == 200, r.text
    prop = r.json()
    STATE["property_id"] = prop["id"]

    # list properties
    lst = s.get(f"{API}/properties")
    assert lst.status_code == 200
    found = next((x for x in lst.json() if x["id"] == prop["id"]), None)
    assert found is not None
    assert found["total_units"] == 5

    # list units
    units = s.get(f"{API}/units", params={"property_id": prop["id"]})
    assert units.status_code == 200
    udata = units.json()
    assert len(udata) == 5
    names = sorted([u["name"] for u in udata])
    assert names == [f"Room {i}" for i in range(1, 6)]
    assert all(u["status"] == "vacant" for u in udata)
    STATE["unit_ids"] = [u["id"] for u in udata]
    STATE["first_unit_id"] = udata[0]["id"]
    # store unit name for first unit
    STATE["first_unit_name"] = udata[0]["name"]


# ---------- Landlord: tenant + portal user + initial payment ----------

def test_landlord_create_tenant_with_portal():
    s = STATE["landlord_session"]
    suffix = uuid.uuid4().hex[:8]
    tenant_email = f"tenant_{suffix}@test.com"
    tenant_pw = "Tenant@2026"
    payload = {
        "property_id": STATE["property_id"],
        "unit_id": STATE["first_unit_id"],
        "full_name": "Test Tenant",
        "phone": "+2348099887766",
        "email": tenant_email,
        "lease_start": "2026-01-01T00:00:00Z",
        "lease_expiry": "2026-12-31T00:00:00Z",
        "amount_paid": 500000,
        "payment_frequency": "yearly",
        "portal_enabled": True,
        "portal_password": tenant_pw,
    }
    r = s.post(f"{API}/tenants", json=payload)
    assert r.status_code == 200, r.text
    t = r.json()
    STATE["tenant_id"] = t["id"]
    STATE["tenant_email"] = tenant_email
    STATE["tenant_password"] = tenant_pw

    # unit becomes occupied
    units = s.get(f"{API}/units", params={"property_id": STATE["property_id"]})
    occupied = [u for u in units.json() if u["id"] == STATE["first_unit_id"]][0]
    assert occupied["status"] == "occupied"

    # initial payment recorded
    payments = s.get(f"{API}/payments", params={"tenant_id": STATE["tenant_id"]})
    assert payments.status_code == 200
    plist = payments.json()
    assert len(plist) >= 1
    assert any(p.get("amount") == 500000 for p in plist)
    # tenant can login
    sess = _session()
    r2 = sess.post(f"{API}/auth/login", json={"email": tenant_email, "password": tenant_pw})
    assert r2.status_code == 200
    assert r2.json()["user"]["role"] == "tenant"
    STATE["tenant_session"] = sess


def test_tenant_portal_dashboard_and_maintenance():
    s = STATE["tenant_session"]
    d = s.get(f"{API}/tenant/dashboard")
    assert d.status_code == 200, d.text
    dj = d.json()
    assert "tenant" in dj and "lease_status" in dj["tenant"]
    assert "days_to_expiry" in dj["tenant"]
    # payments listing
    pays = s.get(f"{API}/tenant/payments")
    assert pays.status_code == 200
    assert len(pays.json()) >= 1
    # create maintenance ticket
    mt = s.post(f"{API}/tenant/maintenance", json={
        "category": "Plumbing", "priority": "High", "description": "Leaky tap",
    })
    assert mt.status_code == 200, mt.text
    tkt = mt.json()
    assert tkt.get("ticket_number", "").startswith("TCK-")
    STATE["tenant_ticket_number"] = tkt["ticket_number"]
    # landlord sees the ticket
    sL = STATE["landlord_session"]
    lst = sL.get(f"{API}/maintenance")
    assert lst.status_code == 200
    assert any(x["ticket_number"] == tkt["ticket_number"] for x in lst.json())


# ---------- Payments + receipts ----------

def test_landlord_record_payment_renewal_and_receipt():
    s = STATE["landlord_session"]
    r = s.post(f"{API}/payments", json={
        "tenant_id": STATE["tenant_id"],
        "amount": 250000,
        "payment_date": "2026-06-01T00:00:00Z",
        "payment_method": "Bank Transfer",
        "renewal_date": "2027-06-30T00:00:00Z",
    })
    assert r.status_code == 200, r.text
    p = r.json()
    assert p.get("receipt_number", "").startswith("RCP-")
    assert len(p["receipt_number"]) == 12  # "RCP-" + 8 chars
    # tenant lease_expiry updated
    t = s.get(f"{API}/tenants/{STATE['tenant_id']}")
    assert t.status_code == 200
    assert t.json()["lease_expiry"] == "2027-06-30T00:00:00Z"


# ---------- Maintenance numbering + PATCH ----------

def test_landlord_maintenance_create_and_update():
    s = STATE["landlord_session"]
    r = s.post(f"{API}/maintenance", json={
        "property_id": STATE["property_id"],
        "category": "Electrical",
        "priority": "Medium",
        "description": "Power outage in Room 2",
        "tenant_id": STATE["tenant_id"],
    })
    assert r.status_code == 200, r.text
    t = r.json()
    assert t.get("ticket_number", "").startswith("TCK-")
    tid = t["id"]
    # patch status
    p = s.patch(f"{API}/maintenance/{tid}", json={"status": "In Progress"})
    assert p.status_code == 200
    assert p.json()["status"] == "In Progress"


# ---------- Accounting summary ----------

def test_accounting_summary():
    s = STATE["landlord_session"]
    # add expense
    e = s.post(f"{API}/expenses", json={
        "category": "Maintenance", "amount": 50000, "date": "2026-06-15T00:00:00Z",
        "property_id": STATE["property_id"],
    })
    assert e.status_code == 200
    # add income
    i = s.post(f"{API}/income", json={
        "source": "Service Charge", "amount": 10000, "date": "2026-06-15T00:00:00Z",
        "property_id": STATE["property_id"],
    })
    assert i.status_code == 200
    summ = s.get(f"{API}/accounting/summary", params={"year": 2026})
    assert summ.status_code == 200, summ.text
    sj = summ.json()
    assert "total_income" in sj and "total_expense" in sj and "net_income" in sj
    assert sj["total_expense"] >= 50000
    assert sj["total_income"] >= 510000  # 500000 initial + 250000 payment if same year - but year=2026 -> all of these are 2026
    assert isinstance(sj["monthly"], list) and len(sj["monthly"]) == 12
    assert isinstance(sj["expense_by_category"], list)
    assert sj["net_income"] == sj["total_income"] - sj["total_expense"]


# ---------- Reports & Search ----------

def test_reports_occupancy_and_expiring():
    s = STATE["landlord_session"]
    occ = s.get(f"{API}/reports/occupancy")
    assert occ.status_code == 200
    arr = occ.json()
    item = next((p for p in arr if p["property_id"] == STATE["property_id"]), None)
    assert item is not None and item["total_units"] == 5 and item["occupied"] == 1

    exp = s.get(f"{API}/reports/expiring")
    assert exp.status_code == 200
    rows = exp.json()
    # sorted ascending by days
    days = [r["days"] for r in rows]
    assert days == sorted(days)
    if rows:
        assert "status" in rows[0]


def test_global_search():
    s = STATE["landlord_session"]
    r = s.get(f"{API}/search", params={"q": "Test"})
    assert r.status_code == 200
    js = r.json()
    assert "tenants" in js
    assert any("Test Tenant" in (x.get("full_name") or "") for x in js["tenants"])


# ---------- Caretaker RBAC ----------

def test_caretaker_creation_and_rbac():
    sL = STATE["landlord_session"]
    suffix = uuid.uuid4().hex[:8]
    email = f"caretaker_{suffix}@test.com"
    r = sL.post(f"{API}/caretakers", json={
        "name": "Care Taker",
        "email": email,
        "assigned_properties": [STATE["property_id"]],
        "all_properties": False,
        "permissions": {
            "view_tenants": True,
            "record_payment": True,
            "create_maintenance": True,
        },
    })
    assert r.status_code == 200, r.text
    pwd = r.json()["generated_password"]
    # login caretaker
    sC = _session()
    rl = sC.post(f"{API}/auth/login", json={"email": email, "password": pwd})
    assert rl.status_code == 200
    # caretaker can list tenants
    t = sC.get(f"{API}/tenants")
    assert t.status_code == 200
    # caretaker can list properties (only assigned)
    p = sC.get(f"{API}/properties")
    assert p.status_code == 200
    assert all(pp["id"] == STATE["property_id"] for pp in p.json())

    # caretaker WITHOUT record_payment -> 403
    suffix2 = uuid.uuid4().hex[:8]
    email2 = f"caretaker2_{suffix2}@test.com"
    r2 = sL.post(f"{API}/caretakers", json={
        "name": "Care Taker 2",
        "email": email2,
        "assigned_properties": [STATE["property_id"]],
        "permissions": {"view_tenants": True, "record_payment": False},
    })
    pwd2 = r2.json()["generated_password"]
    sC2 = _session()
    sC2.post(f"{API}/auth/login", json={"email": email2, "password": pwd2})
    bad = sC2.post(f"{API}/payments", json={
        "tenant_id": STATE["tenant_id"], "amount": 1000,
        "payment_date": "2026-07-01T00:00:00Z", "payment_method": "Cash",
    })
    assert bad.status_code == 403

    # caretaker cannot DELETE property
    dlt = sC.delete(f"{API}/properties/{STATE['property_id']}")
    assert dlt.status_code in (403, 405)


# ---------- Auth boundaries ----------

def test_tenant_cannot_access_admin():
    s = STATE["tenant_session"]
    r = s.get(f"{API}/admin/stats")
    assert r.status_code == 403

    # landlord also cannot access admin
    r2 = STATE["landlord_session"].get(f"{API}/admin/stats")
    assert r2.status_code == 403


def test_other_landlord_cannot_delete_tenant():
    # Create a second landlord, login, try to delete tenant of first landlord
    sA = STATE["admin_session"]
    suffix = uuid.uuid4().hex[:8]
    email = f"ll2_{suffix}@test.com"
    r = sA.post(f"{API}/admin/landlords", json={"name": "Other LL", "email": email})
    pw = r.json()["generated_password"]
    s2 = _session()
    s2.post(f"{API}/auth/login", json={"email": email, "password": pw})
    d = s2.delete(f"{API}/tenants/{STATE['tenant_id']}")
    # tenant belongs to other landlord -> 404 (filtered by landlord_id)
    assert d.status_code in (403, 404)


# ---------- Admin delete cascades ----------

def test_admin_delete_landlord_cascades():
    s = STATE["admin_session"]
    lid = STATE["landlord_id"]
    r = s.delete(f"{API}/admin/landlords/{lid}")
    assert r.status_code == 200
    # landlord user gone -> login fails
    rl = requests.post(f"{API}/auth/login", json={"email": STATE["landlord_email"], "password": STATE["landlord_password"]})
    assert rl.status_code == 401
    # listing no longer contains him
    lst = s.get(f"{API}/admin/landlords").json()
    assert not any(x["id"] == lid for x in lst)
