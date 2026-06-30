"""Resend email helpers + simple HTML templates.

Failure is non-fatal: emails are logged and skipped if Resend is unavailable.
"""
import os
import logging
from typing import Optional
import resend

log = logging.getLogger(__name__)

_configured = False
DEFAULT_FROM = "RentoraX <onboarding@resend.dev>"


def _configure_once() -> bool:
    global _configured
    if _configured:
        return True
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        log.warning("RESEND_API_KEY not set")
        return False
    resend.api_key = key
    _configured = True
    return True


def _wrap(title: str, body_html: str, footer: str = "") -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  body{{margin:0;background:#FAFAF9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1C1917}}
  .wrap{{max-width:560px;margin:0 auto;padding:32px 24px}}
  .card{{background:#fff;border-radius:14px;border:1px solid #E7E5E4;overflow:hidden}}
  .header{{padding:28px;background:#166534;color:#fff}}
  .logo{{font-weight:600;font-size:20px;letter-spacing:-0.02em}}
  .content{{padding:28px;line-height:1.55;font-size:14px}}
  h2{{margin:0 0 8px;font-size:22px;color:#0C0A09}}
  .btn{{display:inline-block;background:#166534;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px}}
  .muted{{color:#78716C;font-size:12px}}
  .meta{{background:#F5F5F4;border-radius:8px;padding:14px;margin-top:14px;font-size:13px}}
  .footer{{text-align:center;color:#78716C;font-size:11px;padding:18px}}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="header"><div class="logo">RentoraX</div><div style="opacity:0.8;font-size:12px;margin-top:4px">Property management for the Nigerian diaspora</div></div>
  <div class="content">{body_html}</div>
</div>
<div class="footer">{footer or "You received this email from RentoraX. © " + str(__import__("datetime").datetime.now().year)}</div>
</div></body></html>"""


def send_email(to: str, subject: str, html: str) -> Optional[str]:
    """Send via Resend. Returns Resend message id or None on failure."""
    if not _configure_once() or not to:
        return None
    try:
        params = {
            "from": os.environ.get("EMAIL_FROM", DEFAULT_FROM),
            "to": [to],
            "subject": subject,
            "html": html,
        }
        reply = os.environ.get("EMAIL_REPLY_TO")
        if reply:
            params["reply_to"] = [reply]
        resp = resend.Emails.send(params)
        return resp.get("id") if isinstance(resp, dict) else None
    except Exception as e:
        log.exception("Resend send failed: %s", e)
        return None


# ---- Templates ----
def welcome_landlord(name: str, email: str, password: str, login_url: str) -> tuple[str, str]:
    subject = "Welcome to RentoraX"
    body = f"""
<h2>Welcome, {name} 👋</h2>
<p>Your RentoraX landlord account is ready. Use these credentials to sign in for the first time — you can change your password from your profile.</p>
<div class="meta"><div><strong>Email:</strong> {email}</div><div><strong>Temporary password:</strong> <code>{password}</code></div></div>
<a class="btn" href="{login_url}">Open dashboard</a>
<p class="muted">Tip: bookmark the dashboard and switch on dark mode from the top bar for evening sessions.</p>
"""
    return subject, _wrap(subject, body)


def welcome_tenant(name: str, email: str, password: str, login_url: str, landlord_name: str) -> tuple[str, str]:
    subject = "Your RentoraX tenant portal is ready"
    body = f"""
<h2>Hi {name},</h2>
<p>{landlord_name} has set up your tenant portal on RentoraX. You can now view your lease, payment history, submit maintenance and download receipts.</p>
<div class="meta"><div><strong>Email:</strong> {email}</div><div><strong>Password:</strong> <code>{password}</code></div></div>
<a class="btn" href="{login_url}">Open my portal</a>
"""
    return subject, _wrap(subject, body)


def welcome_caretaker(name: str, email: str, password: str, login_url: str, landlord_name: str) -> tuple[str, str]:
    subject = "You've been invited as a RentoraX caretaker"
    body = f"""
<h2>Welcome aboard, {name}</h2>
<p>{landlord_name} has added you as a property caretaker on RentoraX. You'll see the properties and permissions they've assigned to you.</p>
<div class="meta"><div><strong>Email:</strong> {email}</div><div><strong>Password:</strong> <code>{password}</code></div></div>
<a class="btn" href="{login_url}">Open caretaker dashboard</a>
"""
    return subject, _wrap(subject, body)


def password_reset(name: str, reset_url: str, minutes: int) -> tuple[str, str]:
    subject = "Reset your RentoraX password"
    body = f"""
<h2>Hi {name},</h2>
<p>Use the button below to choose a new password. The link expires in {minutes} minutes and can only be used once.</p>
<a class="btn" href="{reset_url}">Reset password</a>
<p class="muted">If you didn't request this, you can safely ignore this email — your existing password will stay active.</p>
"""
    return subject, _wrap(subject, body)


def rent_reminder(tenant_name: str, property_name: str, unit_name: str, days: int, expiry: str) -> tuple[str, str]:
    if days < 0:
        subject = f"Rent expired — {property_name}, {unit_name}"
        head = f"<h2>Your rent has expired</h2><p>{tenant_name}, your tenancy at <strong>{property_name}, {unit_name}</strong> expired on {expiry}.</p>"
    else:
        subject = f"Rent expires in {days} days"
        head = f"<h2>Friendly reminder</h2><p>{tenant_name}, your rent at <strong>{property_name}, {unit_name}</strong> expires on {expiry} — that's in {days} day(s).</p>"
    body = head + "<p>Please reach out to your landlord to arrange renewal.</p>"
    return subject, _wrap(subject, body)


def payment_receipt(tenant_name: str, amount: str, receipt_number: str, property_name: str, unit_name: str, view_url: str) -> tuple[str, str]:
    subject = f"Receipt {receipt_number} — {amount}"
    body = f"""
<h2>Payment received</h2>
<p>Hi {tenant_name}, your payment of <strong>{amount}</strong> for <strong>{property_name}, {unit_name}</strong> has been recorded.</p>
<div class="meta"><div><strong>Receipt:</strong> {receipt_number}</div></div>
<a class="btn" href="{view_url}">Download receipt PDF</a>
"""
    return subject, _wrap(subject, body)


def maintenance_update(tenant_name: str, ticket_number: str, status: str, view_url: str) -> tuple[str, str]:
    subject = f"Maintenance update — {ticket_number}"
    body = f"""
<h2>Status update</h2>
<p>Hi {tenant_name}, your maintenance ticket <strong>{ticket_number}</strong> is now <strong>{status}</strong>.</p>
<a class="btn" href="{view_url}">View ticket</a>
"""
    return subject, _wrap(subject, body)


def notice_issued(tenant_name: str, notice_type: str, notice_number: str, due_date: str, view_url: str) -> tuple[str, str]:
    subject = f"Notice issued — {notice_type}"
    body = f"""
<h2>Notice from your landlord</h2>
<p>Hi {tenant_name}, a <strong>{notice_type}</strong> ({notice_number}) has been issued for your tenancy.</p>
<div class="meta"><div><strong>Due date:</strong> {due_date or "—"}</div></div>
<a class="btn" href="{view_url}">View notice</a>
"""
    return subject, _wrap(subject, body)


def announcement(tenant_name: str, title: str, message: str) -> tuple[str, str]:
    subject = f"📣 {title}"
    body = f"""
<h2>{title}</h2>
<p>Hi {tenant_name},</p>
<p style="white-space:pre-line">{message}</p>
"""
    return subject, _wrap(subject, body)
