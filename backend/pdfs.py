"""WeasyPrint PDF rendering. Pure Jinja2 + inline CSS templates kept in-file for portability."""
import os
from datetime import datetime
from io import BytesIO
from typing import Optional
from jinja2 import Environment, BaseLoader
from weasyprint import HTML

_env = Environment(loader=BaseLoader())


_BASE_CSS = """
@page { size: A4; margin: 20mm 18mm; @bottom-center { content: "RentoraX · " counter(page) " of " counter(pages); font-size: 9pt; color: #78716C; }}
body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1C1917; font-size: 11pt; line-height: 1.5; }
h1 { font-size: 22pt; margin: 0; letter-spacing: -0.02em; }
h2 { font-size: 14pt; margin: 0 0 8px; }
h3 { font-size: 12pt; margin: 18px 0 6px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #166534; padding-bottom: 14px; margin-bottom: 18px; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand-logo { width: 40px; height: 40px; background: #166534; color: #fff; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18pt; }
.brand-name { font-size: 18pt; font-weight: 700; letter-spacing: -0.02em; }
.brand-tag { font-size: 8pt; color: #78716C; text-transform: uppercase; letter-spacing: 0.15em; }
.meta { text-align: right; font-size: 9pt; color: #78716C; }
.label { text-transform: uppercase; letter-spacing: 0.15em; font-size: 8pt; color: #78716C; margin-bottom: 2px; }
.row { display: flex; gap: 16px; margin-bottom: 10px; }
.col { flex: 1; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E7E5E4; font-size: 10pt; }
th { background: #F5F5F4; font-weight: 600; }
.totals { margin-top: 16px; }
.totals .grand { font-size: 18pt; font-weight: 700; color: #166534; }
.box { background: #F5F5F4; border-left: 4px solid #166534; padding: 12px 16px; margin: 12px 0; }
.box.warn { border-left-color: #C2410C; background: #FFF7ED; }
.box.danger { border-left-color: #BE123C; background: #FEF2F2; }
.footer-note { margin-top: 24px; padding-top: 14px; border-top: 1px solid #E7E5E4; font-size: 9pt; color: #78716C; }
.muted { color: #78716C; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #166534; color: #fff; font-size: 8pt; font-weight: 600; letter-spacing: 0.05em; }
.right { text-align: right; }
.center { text-align: center; }
.sig { margin-top: 36px; display: flex; justify-content: space-between; }
.sig-line { width: 220px; border-top: 1px solid #1C1917; padding-top: 6px; font-size: 9pt; color: #78716C; }
"""


def _render(template_str: str, **context) -> bytes:
    tpl = _env.from_string(template_str)
    context.setdefault("now", datetime.now().strftime("%B %d, %Y · %I:%M %p"))
    context.setdefault("base_css", _BASE_CSS)
    html = tpl.render(**context)
    buf = BytesIO()
    HTML(string=html).write_pdf(buf)
    return buf.getvalue()


def _header_html(settings: dict, document_label: str, document_number: str = "") -> str:
    biz_name = (settings or {}).get("business_name") or "RentoraX"
    biz_address = (settings or {}).get("business_address") or ""
    biz_phone = (settings or {}).get("business_phone") or ""
    biz_email = (settings or {}).get("business_email") or ""
    logo_url = (settings or {}).get("logo_url")
    logo_html = f'<img src="{logo_url}" style="width:48px;height:48px;border-radius:8px;object-fit:cover">' if logo_url else '<div class="brand-logo">R</div>'
    return f"""
<div class="header">
  <div>
    <div class="brand">{logo_html}
      <div><div class="brand-name">{biz_name}</div><div class="brand-tag">{document_label}</div></div>
    </div>
    <div class="muted" style="font-size:9pt;margin-top:6px">
      {biz_address}{('<br>'+biz_phone) if biz_phone else ''}{('<br>'+biz_email) if biz_email else ''}
    </div>
  </div>
  <div class="meta">
    {'<div><strong>'+document_number+'</strong></div>' if document_number else ''}
    <div>{{{{ now }}}}</div>
  </div>
</div>
"""


def fmt_naira(amount) -> str:
    try:
        n = float(amount or 0)
    except Exception:
        n = 0.0
    return "NGN " + format(n, ",.2f")


# ============ TEMPLATES ============
def render_receipt(payment: dict, tenant: dict, settings: dict) -> bytes:
    header = _header_html(settings, "Rent Receipt", payment.get("receipt_number") or "")
    tpl = f"""<!doctype html><html><head><meta charset="utf-8"><style>{{{{ base_css }}}}</style></head>
<body>
{header}
<div class="row">
  <div class="col"><div class="label">Tenant</div><div><strong>{{{{ tenant.full_name }}}}</strong></div><div class="muted">{{{{ tenant.phone or "" }}}}</div></div>
  <div class="col"><div class="label">Property · Unit</div><div>{{{{ payment.property_name }}}}</div><div class="muted">{{{{ payment.unit_name }}}}</div></div>
</div>
<div class="row">
  <div class="col"><div class="label">Payment Date</div><div>{{{{ payment.payment_date }}}}</div></div>
  <div class="col"><div class="label">Method</div><div>{{{{ payment.payment_method }}}}</div></div>
  <div class="col"><div class="label">Reference</div><div class="muted">{{{{ payment.transaction_ref or "—" }}}}</div></div>
</div>
{{% if payment.renewal_date %}}
<div class="box"><strong>Next renewal:</strong> {{{{ payment.renewal_date }}}}</div>
{{% endif %}}
<div class="totals">
  <table>
    <tr><th>Description</th><th class="right">Amount</th></tr>
    <tr><td>Rent payment for {{{{ payment.property_name }}}} — {{{{ payment.unit_name }}}}</td><td class="right">{{{{ fmt_naira(payment.amount) }}}}</td></tr>
    {{% if payment.outstanding_balance and payment.outstanding_balance > 0 %}}
    <tr><td class="muted">Outstanding balance</td><td class="right muted">{{{{ fmt_naira(payment.outstanding_balance) }}}}</td></tr>
    {{% endif %}}
  </table>
  <div class="row"><div class="col"></div><div class="col right"><div class="label">Total received</div><div class="grand">{{{{ fmt_naira(payment.amount) }}}}</div></div></div>
</div>
<div class="sig">
  <div class="sig-line">Tenant signature</div>
  <div class="sig-line">Landlord / Caretaker</div>
</div>
<div class="footer-note">{{{{ settings.receipt_footer or "Thank you for your payment. This is a system-generated receipt from RentoraX." }}}}</div>
</body></html>"""
    return _render(tpl, payment=payment, tenant=tenant, settings=settings or {}, fmt_naira=fmt_naira)


def render_tenant_profile(tenant: dict, settings: dict, payments: list) -> bytes:
    header = _header_html(settings, "Tenant Profile", tenant.get("_id", "")[:8].upper())
    tpl = f"""<!doctype html><html><head><meta charset="utf-8"><style>{{{{ base_css }}}}</style></head>
<body>
{header}
<h1>{{{{ tenant.full_name }}}}</h1>
<p class="muted">{{{{ tenant.property_name }}}} · {{{{ tenant.unit_name }}}} · <span class="tag">{{{{ tenant.status|default('active')|upper }}}}</span></p>

<h3>Personal</h3>
<table>
  <tr><th style="width:35%">Phone</th><td>{{{{ tenant.phone or "—" }}}}</td></tr>
  <tr><th>Email</th><td>{{{{ tenant.email or "—" }}}}</td></tr>
  <tr><th>Gender</th><td>{{{{ tenant.gender or "—" }}}}</td></tr>
  <tr><th>Date of birth</th><td>{{{{ tenant.date_of_birth or "—" }}}}</td></tr>
  <tr><th>NIN</th><td>{{{{ tenant.nin or "—" }}}}</td></tr>
  <tr><th>Home address</th><td>{{{{ tenant.home_address or "—" }}}}</td></tr>
</table>

<h3>Work</h3>
<table>
  <tr><th style="width:35%">Occupation</th><td>{{{{ tenant.occupation or "—" }}}}</td></tr>
  <tr><th>Workplace</th><td>{{{{ tenant.workplace or "—" }}}}</td></tr>
  <tr><th>Workplace address</th><td>{{{{ tenant.workplace_address or "—" }}}}</td></tr>
</table>

<h3>Guarantor & Emergency Contact</h3>
<table>
  <tr><th style="width:35%">Guarantor name</th><td>{{{{ tenant.guarantor_name or "—" }}}}</td></tr>
  <tr><th>Guarantor phone</th><td>{{{{ tenant.guarantor_phone or "—" }}}}</td></tr>
  <tr><th>Guarantor address</th><td>{{{{ tenant.guarantor_address or "—" }}}}</td></tr>
  <tr><th>Emergency contact</th><td>{{{{ tenant.emergency_contact_name or "—" }}}} ({{{{ tenant.relationship or "—" }}}}) · {{{{ tenant.emergency_contact_phone or "—" }}}}</td></tr>
</table>

<h3>Lease</h3>
<table>
  <tr><th style="width:35%">Lease start</th><td>{{{{ tenant.lease_start or "—" }}}}</td></tr>
  <tr><th>Lease expiry</th><td>{{{{ tenant.lease_expiry or "—" }}}}</td></tr>
  <tr><th>Frequency</th><td>{{{{ tenant.payment_frequency or "—" }}}}</td></tr>
  <tr><th>Amount on file</th><td>{{{{ fmt_naira(tenant.amount_paid) }}}}</td></tr>
</table>

<h3>Payment history ({{{{ payments|length }}}})</h3>
<table>
  <tr><th>Date</th><th>Method</th><th>Receipt</th><th class="right">Amount</th></tr>
  {{% for p in payments %}}
  <tr><td>{{{{ p.payment_date }}}}</td><td>{{{{ p.payment_method }}}}</td><td>{{{{ p.receipt_number }}}}</td><td class="right">{{{{ fmt_naira(p.amount) }}}}</td></tr>
  {{% endfor %}}
  {{% if payments|length == 0 %}}
  <tr><td colspan="4" class="center muted">No payments recorded.</td></tr>
  {{% endif %}}
</table>

<div class="footer-note">Generated from RentoraX on {{{{ now }}}}.</div>
</body></html>"""
    return _render(tpl, tenant=tenant, settings=settings or {}, payments=payments or [], fmt_naira=fmt_naira)


def render_notice(notice: dict, tenant: dict, settings: dict) -> bytes:
    header = _header_html(settings, notice.get("notice_type") or "Notice", notice.get("notice_number") or "")
    severity = "danger" if "demand" in (notice.get("notice_type", "").lower()) or "quit" in (notice.get("notice_type", "").lower()) else ("warn" if "late" in (notice.get("notice_type", "").lower()) else "")
    box_class = f"box {severity}".strip()
    tpl = f"""<!doctype html><html><head><meta charset="utf-8"><style>{{{{ base_css }}}}</style></head>
<body>
{header}
<h1>{{{{ notice.notice_type }}}}</h1>
<div class="muted">Issued on {{{{ notice.issue_date }}}}{{% if notice.due_date %}} · Due {{{{ notice.due_date }}}}{{% endif %}}</div>

<div class="{box_class}" style="margin-top:18px">
  <div class="label">To</div>
  <div><strong>{{{{ tenant.full_name }}}}</strong>, {{{{ tenant.property_name }}}}, {{{{ tenant.unit_name }}}}</div>
</div>

<h3>Reason</h3>
<p>{{{{ notice.reason or "—" }}}}</p>

<h3>Details</h3>
<p style="white-space:pre-line">{{{{ notice.description or "" }}}}</p>

<div class="sig">
  <div class="sig-line">Tenant acknowledgement</div>
  <div class="sig-line">Issued by</div>
</div>

<div class="footer-note">{{{{ settings.business_name or "RentoraX" }}}} · This notice is a formal communication. Please contact the landlord with any questions.</div>
</body></html>"""
    return _render(tpl, notice=notice, tenant=tenant, settings=settings or {})


def render_report(title: str, columns: list, rows: list, summary: dict, settings: dict) -> bytes:
    header = _header_html(settings, title)
    tpl = f"""<!doctype html><html><head><meta charset="utf-8"><style>{{{{ base_css }}}}</style></head>
<body>
{header}
<h1>{{{{ title }}}}</h1>

{{% if summary %}}
<div class="row" style="margin-top:14px">
{{% for k, v in summary.items() %}}
  <div class="col"><div class="label">{{{{ k }}}}</div><div style="font-size:14pt;font-weight:600">{{{{ v }}}}</div></div>
{{% endfor %}}
</div>
{{% endif %}}

<table style="margin-top:18px">
<tr>{{% for c in columns %}}<th>{{{{ c }}}}</th>{{% endfor %}}</tr>
{{% for r in rows %}}
<tr>{{% for c in columns %}}<td>{{{{ r.get(c, "—") }}}}</td>{{% endfor %}}</tr>
{{% endfor %}}
{{% if not rows %}}
<tr><td class="center muted" colspan="{{{{ columns|length }}}}">No data for this period.</td></tr>
{{% endif %}}
</table>

<div class="footer-note">Generated by {{{{ settings.business_name or "RentoraX" }}}} · {{{{ now }}}}</div>
</body></html>"""
    return _render(tpl, title=title, columns=columns, rows=rows, summary=summary or {}, settings=settings or {})
