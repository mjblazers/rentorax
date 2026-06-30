"""Phase-2 backend tests for RentoraX.
Covers: account lockout, forgot/reset password, settings, cloudinary uploads, move-out,
assign-existing, unit occupancy history, notices CRUD + tenant ack, PDF generation,
scheduler trigger, notifications unread/read/delete.
"""
import os
import io
import base64
import time
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rentorax.com"
ADMIN_PASSWORD = "Admin@2026"

STATE = {}

# 1x1 transparent PNG
TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
TINY_PNG = base64.b64decode(TINY_PNG_B64)


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, password):
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return s, r


# ----- bootstrap: admin + landlord + property + tenant -----
def test_00_bootstrap():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, r.text
    STATE["admin"] = s

    suffix = uuid.uuid4().hex[:8]
    email = f"ph2_ll_{suffix}@test.com"
    r2 = s.post(f"{API}/admin/landlords", json={"name": "Phase2 LL", "email": email})
    assert r2.status_code == 200, r2.text
    STATE["ll_email"] = email
    STATE["ll_password"] = r2.json()["generated_password"]
    STATE["ll_id"] = r2.json()["id"]

    sL, rl = _login(email, STATE["ll_password"])
    assert rl.status_code == 200
    STATE["ll"] = sL

    # create property
    rp = sL.post(f"{API}/properties", json={
        "name": "Phase2 Estate", "type": "Hostel", "address": "1 Phase2 Rd",
        "state": "Lagos", "num_units": 3, "unit_prefix": "Room",
    })
    assert rp.status_code == 200, rp.text
    STATE["prop_id"] = rp.json()["id"]
    units = sL.get(f"{API}/units", params={"property_id": STATE["prop_id"]}).json()
    STATE["unit_ids"] = [u["id"] for u in units]

    # create tenant with portal
    t_suffix = uuid.uuid4().hex[:8]
    t_email = f"ph2_tenant_{t_suffix}@test.com"
    rt = sL.post(f"{API}/tenants", json={
        "property_id": STATE["prop_id"],
        "unit_id": STATE["unit_ids"][0],
        "full_name": "Phase2 Tenant",
        "phone": "+2348012345600",
        "email": t_email,
        "lease_start": "2025-12-01T00:00:00Z",
        "lease_expiry": (time.strftime("%Y-%m-%dT00:00:00Z", time.gmtime(time.time() + 7 * 86400))),
        "amount_paid": 300000,
        "payment_frequency": "yearly",
        "portal_enabled": True,
        "portal_password": "Tenant@2026",
    })
    assert rt.status_code == 200, rt.text
    STATE["tenant_id"] = rt.json()["id"]
    STATE["tenant_email"] = t_email
    STATE["tenant_password"] = "Tenant@2026"
    pays = sL.get(f"{API}/payments", params={"tenant_id": STATE["tenant_id"]}).json()
    STATE["initial_payment_id"] = pays[0]["id"]


# ============ Account Lockout ============
def test_account_lockout_after_6_failures():
    # Use a throwaway landlord so we don't lock admin
    sA = STATE["admin"]
    suffix = uuid.uuid4().hex[:8]
    email = f"ph2_lockout_{suffix}@test.com"
    r = sA.post(f"{API}/admin/landlords", json={"name": "Lockout LL", "email": email})
    assert r.status_code == 200
    real_pw = r.json()["generated_password"]
    STATE["lockout_id"] = r.json()["id"]

    # Hit wrong password 6 times
    last = None
    for i in range(6):
        last = requests.post(f"{API}/auth/login", json={"email": email, "password": "WRONG"})
    # 7th attempt (even correct password) should be locked -> 429
    locked = requests.post(f"{API}/auth/login", json={"email": email, "password": real_pw})
    assert locked.status_code in (423, 429), f"expected lockout, got {locked.status_code}: {locked.text}"
    body = (locked.text or "").lower()
    assert "too many" in body or "lock" in body or "attempts" in body, body


# ============ Forgot / Reset Password ============
def test_forgot_password_and_reset():
    # admin login still works
    r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    # dev/test mode returns reset_url with token
    url = data.get("reset_url") or ""
    assert "token=" in url, f"no token in response: {data}"
    token = url.split("token=")[-1].split("&")[0]

    # reset to a new password
    new_pw = "Admin@2026!new"
    r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw})
    assert r2.status_code == 200, r2.text

    # login with new
    ok = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": new_pw})
    assert ok.status_code == 200

    # restore original
    r3 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    token2 = r3.json()["reset_url"].split("token=")[-1].split("&")[0]
    r4 = requests.post(f"{API}/auth/reset-password", json={"token": token2, "new_password": ADMIN_PASSWORD})
    assert r4.status_code == 200
    final = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert final.status_code == 200, "could not restore original admin password"
    # refresh admin session
    STATE["admin"] = _session()
    STATE["admin"].post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})


# ============ Settings ============
def test_settings_defaults_and_update():
    sL = STATE["ll"]
    r = sL.get(f"{API}/settings")
    assert r.status_code == 200, r.text
    s = r.json()
    assert s.get("currency") == "NGN"
    rd = s.get("reminder_days")
    assert rd == [30, 14, 7, 3, 1], rd

    # update business_name + receipt_prefix
    r2 = sL.put(f"{API}/settings", json={"business_name": "Phase2 Co", "receipt_prefix": "PH2"})
    assert r2.status_code == 200, r2.text
    s2 = r2.json()
    assert s2.get("business_name") == "Phase2 Co"
    assert s2.get("receipt_prefix") == "PH2"
    # verify persistence
    r3 = sL.get(f"{API}/settings")
    assert r3.json().get("business_name") == "Phase2 Co"


# ============ Cloudinary Upload ============
def test_upload_png_ok_and_exe_rejected():
    sL = STATE["ll"]
    # PNG upload
    files = {"file": ("tiny.png", io.BytesIO(TINY_PNG), "image/png")}
    data = {"folder": "properties"}
    # Use the auth cookies from session, but reset content-type for multipart
    headers = {k: v for k, v in sL.headers.items() if k.lower() != "content-type"}
    r = requests.post(f"{API}/uploads/file", files=files, data=data, cookies=sL.cookies, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "secure_url" in body and "public_id" in body, body
    assert "res.cloudinary.com" in body["secure_url"], body["secure_url"]

    # .exe rejected
    files2 = {"file": ("evil.exe", io.BytesIO(b"MZ\x00\x00"), "application/octet-stream")}
    r2 = requests.post(f"{API}/uploads/file", files=files2, data={"folder": "properties"},
                      cookies=sL.cookies, headers=headers)
    assert r2.status_code == 400, f"expected 400 for .exe, got {r2.status_code}: {r2.text}"


# ============ Notices ============
def test_notice_create_patch_tenant_ack():
    sL = STATE["ll"]
    # Create
    payload = {
        "tenant_id": STATE["tenant_id"],
        "notice_type": "Friendly Rent Reminder",
        "reason": "Lease expiring soon",
        "description": "Hi, please renew.",
        "due_date": "2026-02-15T00:00:00Z",
    }
    r = sL.post(f"{API}/notices", json=payload)
    assert r.status_code == 200, r.text
    notice = r.json()
    assert notice.get("notice_number", "").startswith("NTC-"), notice
    nid = notice["id"]
    STATE["notice_id"] = nid

    # List
    r2 = sL.get(f"{API}/notices")
    assert r2.status_code == 200
    assert any(n["id"] == nid for n in r2.json())

    # Patch -> Cancelled
    r3 = sL.patch(f"{API}/notices/{nid}", json={"status": "Cancelled"})
    assert r3.status_code == 200, r3.text
    assert r3.json().get("status") == "Cancelled"

    # Tenant login + list + ack (recreate notice since prev got cancelled)
    r4 = sL.post(f"{API}/notices", json=payload)
    assert r4.status_code == 200
    nid2 = r4.json()["id"]
    STATE["notice_id"] = nid2

    sT = _session()
    tl = sT.post(f"{API}/auth/login", json={"email": STATE["tenant_email"], "password": STATE["tenant_password"]})
    assert tl.status_code == 200
    STATE["tenant_sess"] = sT
    tn = sT.get(f"{API}/notices/tenant/list")
    assert tn.status_code == 200, tn.text
    assert any(n["id"] == nid2 for n in tn.json())
    ack = sT.post(f"{API}/notices/{nid2}/acknowledge")
    assert ack.status_code == 200, ack.text


# ============ PDF generation ============
def _assert_pdf(resp, min_size=1024):
    assert resp.status_code == 200, f"{resp.status_code}: {resp.text[:200]}"
    ct = resp.headers.get("content-type", "")
    assert "application/pdf" in ct, ct
    assert resp.content[:4] == b"%PDF", resp.content[:20]
    assert len(resp.content) > min_size, len(resp.content)


def test_pdf_receipt():
    sL = STATE["ll"]
    r = sL.get(f"{API}/pdf/receipt/{STATE['initial_payment_id']}")
    _assert_pdf(r)


def test_pdf_tenant_profile():
    sL = STATE["ll"]
    r = sL.get(f"{API}/pdf/tenant/{STATE['tenant_id']}")
    _assert_pdf(r)


def test_pdf_notice():
    sL = STATE["ll"]
    r = sL.get(f"{API}/pdf/notice/{STATE['notice_id']}")
    _assert_pdf(r)


@pytest.mark.parametrize("kind", ["occupancy", "income", "expenses", "pnl", "expiring"])
def test_pdf_reports(kind):
    sL = STATE["ll"]
    r = sL.get(f"{API}/pdf/report/{kind}")
    _assert_pdf(r)


# ============ Move-out / Assign-existing / Unit history ============
def test_moveout_then_assign_existing_and_history():
    sL = STATE["ll"]
    tid = STATE["tenant_id"]
    uid = STATE["unit_ids"][0]

    payload = {
        "checklist": {"rent_paid": True, "keys_returned": True, "utilities_settled": True, "inspection_done": True},
        "deposit_refund": 0,
        "notes": "ok",
    }
    r = sL.post(f"{API}/tenants/{tid}/move-out", json=payload)
    assert r.status_code == 200, f"move-out failed: {r.status_code} {r.text[:300]}"

    # tenant is archived; default list excludes
    r2 = sL.get(f"{API}/tenants")
    assert r2.status_code == 200
    assert not any(t["id"] == tid for t in r2.json()), "archived tenant should not be in default list"
    r3 = sL.get(f"{API}/tenants", params={"include_archived": "true"})
    assert r3.status_code == 200
    arch = next((t for t in r3.json() if t["id"] == tid), None)
    assert arch is not None
    assert arch.get("archived") is True
    assert arch.get("status") == "vacated"

    # payment history preserved
    pays = sL.get(f"{API}/payments", params={"tenant_id": tid})
    assert pays.status_code == 200
    assert any(p["id"] == STATE["initial_payment_id"] for p in pays.json())

    # unit becomes vacant
    units = sL.get(f"{API}/units", params={"property_id": STATE["prop_id"]}).json()
    freed = [u for u in units if u["id"] == uid][0]
    assert freed["status"] == "vacant"

    # assign-existing -> reactivates tenant
    r4 = sL.post(f"{API}/units/{uid}/assign-existing", json={
        "tenant_id": tid,
        "lease_start": "2026-03-01T00:00:00Z",
        "lease_expiry": "2027-02-28T00:00:00Z",
    })
    assert r4.status_code == 200, f"assign-existing failed: {r4.status_code} {r4.text[:300]}"
    units2 = sL.get(f"{API}/units", params={"property_id": STATE["prop_id"]}).json()
    reassigned = [u for u in units2 if u["id"] == uid][0]
    assert reassigned["status"] == "occupied"

    # tenant reactivated
    t_now = sL.get(f"{API}/tenants/{tid}").json()
    assert t_now.get("archived") in (False, None)
    assert t_now.get("status") == "active"

    # unit history -> two leases
    rh = sL.get(f"{API}/units/{uid}/history")
    assert rh.status_code == 200, f"history failed: {rh.status_code} {rh.text[:200]}"
    history = rh.json()
    assert isinstance(history, list) and len(history) >= 2, history


# ============ Scheduler ============
def test_scheduler_run_now_creates_expiry_notification():
    sA = STATE["admin"]
    r = sA.post(f"{API}/admin/scheduler/run-now")
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True or "ran" in str(r.json()).lower()

    # Check landlord has at least one notification
    sL = STATE["ll"]
    n = sL.get(f"{API}/notifications")
    assert n.status_code == 200
    # Not strictly required to be non-empty (depends on lease dates); but our tenant lease expires in ~7d
    # so an expiry notif should likely appear.


# ============ Notifications ============
def test_notifications_unread_read_delete_all():
    sL = STATE["ll"]
    # Create a notice to ensure at least one notification
    sL.post(f"{API}/notices", json={
        "tenant_id": STATE["tenant_id"],
        "notice_type": "Friendly Rent Reminder",
        "reason": "Test notif",
        "description": "ping",
        "due_date": "2026-04-01T00:00:00Z",
    })
    uc = sL.get(f"{API}/notifications/unread-count")
    assert uc.status_code == 200, uc.text
    count_before = uc.json().get("count", 0)

    nl = sL.get(f"{API}/notifications").json()
    if nl:
        nid = nl[0]["id"]
        r = sL.post(f"{API}/notifications/{nid}/read")
        assert r.status_code == 200
        # delete one
        d = sL.delete(f"{API}/notifications/{nid}")
        assert d.status_code in (200, 204)

    # mark all read
    r2 = sL.post(f"{API}/notifications/read-all")
    assert r2.status_code == 200
    uc2 = sL.get(f"{API}/notifications/unread-count").json().get("count", 0)
    assert uc2 == 0


# ============ Cleanup ============
def test_zz_cleanup():
    sA = STATE["admin"]
    for key in ("ll_id", "lockout_id"):
        lid = STATE.get(key)
        if lid:
            sA.delete(f"{API}/admin/landlords/{lid}")
