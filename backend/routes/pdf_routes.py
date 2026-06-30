"""PDF generation endpoints: receipts, tenant profile, notices, reports."""
from fastapi import APIRouter, Depends, HTTPException, Response
from auth import get_current_user, require_roles, get_landlord_scope
from db_utils import days_between, expiry_status
from pdfs import render_receipt, render_tenant_profile, render_notice, render_report, fmt_naira

router = APIRouter(prefix="/api/pdf", tags=["pdf"])


async def _settings(db, landlord_id: str) -> dict:
    s = await db.settings.find_one({"landlord_id": landlord_id})
    return s or {}


@router.get("/receipt/{payment_id}")
async def receipt_pdf(payment_id: str, user: dict = Depends(get_current_user)):
    from server import db
    role = user.get("role")
    if role in ("landlord", "caretaker"):
        scope = {"landlord_id": get_landlord_scope(user)}
    elif role == "tenant":
        scope = {"tenant_id": user.get("tenant_id")}
    else:
        raise HTTPException(403, "Forbidden")
    payment = await db.payments.find_one({"_id": payment_id, **scope})
    if not payment:
        raise HTTPException(404, "Not found")
    tenant = await db.tenants.find_one({"_id": payment["tenant_id"]}) or {}
    settings = await _settings(db, payment["landlord_id"])
    pdf = render_receipt(payment, tenant, settings)
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="receipt-{payment.get("receipt_number")}.pdf"'
    })


@router.get("/tenant/{tenant_id}")
async def tenant_pdf(tenant_id: str, user: dict = Depends(require_roles("landlord", "caretaker"))):
    from server import db
    landlord_id = get_landlord_scope(user)
    tenant = await db.tenants.find_one({"_id": tenant_id, "landlord_id": landlord_id})
    if not tenant:
        raise HTTPException(404, "Not found")
    payments = await db.payments.find({"tenant_id": tenant_id}).sort("payment_date", -1).to_list(500)
    settings = await _settings(db, landlord_id)
    pdf = render_tenant_profile(tenant, settings, payments)
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="tenant-{tenant.get("full_name", "profile").replace(" ", "_")}.pdf"'
    })


@router.get("/notice/{notice_id}")
async def notice_pdf(notice_id: str, user: dict = Depends(get_current_user)):
    from server import db
    role = user.get("role")
    q = {"_id": notice_id}
    if role in ("landlord", "caretaker"):
        q["landlord_id"] = get_landlord_scope(user)
    elif role == "tenant":
        q["tenant_id"] = user.get("tenant_id")
    elif role != "super_admin":
        raise HTTPException(403, "Forbidden")
    notice = await db.notices.find_one(q)
    if not notice:
        raise HTTPException(404, "Not found")
    tenant = await db.tenants.find_one({"_id": notice["tenant_id"]}) or {}
    settings = await _settings(db, notice["landlord_id"])
    pdf = render_notice(notice, tenant, settings)
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'inline; filename="notice-{notice.get("notice_number")}.pdf"'
    })


@router.get("/report/{kind}")
async def report_pdf(kind: str, user: dict = Depends(require_roles("landlord", "caretaker"))):
    from server import db
    landlord_id = get_landlord_scope(user)
    settings = await _settings(db, landlord_id)

    if kind == "occupancy":
        properties = await db.properties.find({"landlord_id": landlord_id}).to_list(500)
        rows = []
        total = occ = 0
        for p in properties:
            t = await db.units.count_documents({"property_id": p["_id"]})
            o = await db.units.count_documents({"property_id": p["_id"], "status": "occupied"})
            rows.append({"Property": p["name"], "Units": t, "Occupied": o, "Vacant": t - o,
                         "Rate": f"{(o/t*100):.1f}%" if t else "—"})
            total += t
            occ += o
        summary = {"Properties": len(properties), "Units": total, "Occupied": occ,
                   "Vacant": total - occ, "Rate": f"{(occ/total*100):.1f}%" if total else "—"}
        pdf = render_report("Occupancy Report", ["Property", "Units", "Occupied", "Vacant", "Rate"], rows, summary, settings)
    elif kind == "expiring":
        tenants = await db.tenants.find({"landlord_id": landlord_id, "archived": {"$ne": True}}).to_list(5000)
        rows = []
        for t in tenants:
            d = days_between(t.get("lease_expiry"))
            rows.append({
                "Tenant": t.get("full_name"), "Property": t.get("property_name"),
                "Unit": t.get("unit_name"), "Expiry": t.get("lease_expiry"),
                "Days": d, "Status": expiry_status(t.get("lease_expiry")),
            })
        rows.sort(key=lambda r: r["Days"])
        pdf = render_report("Expiring Leases Report", ["Tenant", "Property", "Unit", "Expiry", "Days", "Status"], rows, {"Total tenants": len(rows)}, settings)
    elif kind == "income":
        payments = await db.payments.find({"landlord_id": landlord_id}).sort("payment_date", -1).to_list(20000)
        rows = [{"Date": p.get("payment_date"), "Tenant": p.get("tenant_name"),
                 "Property": p.get("property_name"), "Unit": p.get("unit_name"),
                 "Method": p.get("payment_method"), "Receipt": p.get("receipt_number"),
                 "Amount": fmt_naira(p.get("amount"))} for p in payments]
        total = sum(float(p.get("amount") or 0) for p in payments)
        pdf = render_report("Income Report", ["Date", "Tenant", "Property", "Unit", "Method", "Receipt", "Amount"], rows, {"Records": len(rows), "Total": fmt_naira(total)}, settings)
    elif kind == "expenses":
        expenses = await db.expenses.find({"landlord_id": landlord_id}).sort("date", -1).to_list(20000)
        rows = [{"Date": e.get("date"), "Category": e.get("category"), "Vendor": e.get("vendor"),
                 "Property": e.get("property_name"), "Method": e.get("payment_method"),
                 "Amount": fmt_naira(e.get("amount"))} for e in expenses]
        total = sum(float(e.get("amount") or 0) for e in expenses)
        pdf = render_report("Expense Report", ["Date", "Category", "Vendor", "Property", "Method", "Amount"], rows, {"Records": len(rows), "Total": fmt_naira(total)}, settings)
    elif kind == "pnl":
        payments = await db.payments.find({"landlord_id": landlord_id}).to_list(20000)
        expenses = await db.expenses.find({"landlord_id": landlord_id}).to_list(20000)
        income = sum(float(p.get("amount") or 0) for p in payments)
        spend = sum(float(e.get("amount") or 0) for e in expenses)
        rows = [
            {"Line": "Total Rental Income", "Amount": fmt_naira(income)},
            {"Line": "Total Operating Expenses", "Amount": fmt_naira(spend)},
            {"Line": "Net Profit / (Loss)", "Amount": fmt_naira(income - spend)},
        ]
        pdf = render_report("Profit & Loss Statement", ["Line", "Amount"], rows, {}, settings)
    elif kind == "maintenance":
        tickets = await db.maintenance_tickets.find({"landlord_id": landlord_id}).sort("created_at", -1).to_list(20000)
        rows = [{"Ticket": t.get("ticket_number"), "Property": t.get("property_name"),
                 "Unit": t.get("unit_name"), "Category": t.get("category"),
                 "Priority": t.get("priority"), "Status": t.get("status"),
                 "Estimated": fmt_naira(t.get("estimated_cost")), "Actual": fmt_naira(t.get("actual_cost"))} for t in tickets]
        pdf = render_report("Maintenance Report", ["Ticket", "Property", "Unit", "Category", "Priority", "Status", "Estimated", "Actual"], rows, {"Total tickets": len(rows)}, settings)
    elif kind == "outstanding":
        tenants = await db.tenants.find({"landlord_id": landlord_id, "archived": {"$ne": True}}).to_list(5000)
        rows = []
        for t in tenants:
            d = days_between(t.get("lease_expiry"))
            if d < 0:
                rows.append({"Tenant": t.get("full_name"), "Property": t.get("property_name"),
                             "Unit": t.get("unit_name"), "Expired since": f"{abs(d)}d", "Last expiry": t.get("lease_expiry"),
                             "Amount on file": fmt_naira(t.get("amount_paid"))})
        pdf = render_report("Outstanding Rent Report", ["Tenant", "Property", "Unit", "Expired since", "Last expiry", "Amount on file"], rows, {"Tenants overdue": len(rows)}, settings)
    else:
        raise HTTPException(400, f"Unknown report: {kind}")

    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="rentorax-{kind}-report.pdf"'
    })
