# RentoraX — Product Requirements Document

**App:** RentoraX · **Stack:** FastAPI + MongoDB + React (Tailwind/shadcn) · **Audience:** Nigerian (diaspora) landlords.

## Original Problem Statement
Build RentoraX — a Property Management & Rent Collection SaaS for Nigerian landlords. 4 roles (Super Admin, Landlord, Caretaker, Tenant). Tenancy lifecycle, notices, move-out, accounting, maintenance, reports, notifications, premium UI. Phase 2 requires production-readiness: Cloudinary uploads, PDFs, emails, password reset, scheduler, advanced search/reports/activity, settings, security, no-delete-policy with archive + occupancy history.

## User Personas
1. Super Admin · platform operator
2. Landlord (diaspora) · remote owner
3. Caretaker · boots-on-ground
4. Tenant · optional portal user

## What's Implemented

### v1.0 (2026-06-30)
4 role dashboards · JWT cookies · properties with auto-generated units · tenants with full record · payments with receipts · rent expiry color codes · maintenance kanban · accounting with charts · caretaker RBAC matrix · reports (CSV) · activity logs · dark/light mode.

### v2.0 — Production Readiness (2026-06-30)
- **Tenancy Lifecycle**: tenant.status = active/expiring_soon/expired/notice_issued/move_out_scheduled/vacated/archived. Delete = archive (never destructive). Migrations backfill existing data.
- **Move-Out Workflow**: POST /api/tenants/{id}/move-out with checklist (rent paid, utilities, inspection, keys, damage, deposit). Snapshots written to `move_outs` collection. Unit auto-vacates. Portal user suspended.
- **Assign Existing Tenant**: POST /api/units/{unit_id}/assign-existing reactivates an archived tenant for a vacant unit. Full history preserved.
- **Occupancy History**: GET /api/units/{unit_id}/history merges past tenancies (move_outs) + current tenant, sorted by lease_start desc. Surfaced in PropertyDetail timeline UI.
- **Notice Management**: 8 types · 5 statuses. Tenants can view + acknowledge. Emails sent on issue. PDF download per notice with severity-based styling.
- **Cloudinary Uploads**: drag-drop FileUpload component with progress, preview, file-type + size (8MB) validation. Used in property photos. Storage scoped per landlord under `rentorax/{landlord_id}/{folder}`.
- **PDF Generation (WeasyPrint)**: receipts, tenant profile, notices, occupancy/expiring/income/expense/P&L/maintenance/outstanding reports. Branded headers (logo + business info from settings).
- **Resend Email**: welcome (landlord/caretaker/tenant), payment receipt, maintenance update, notice issued, rent reminder, password reset. Responsive HTML.
- **Password Reset**: forgot-password → secure token → email link → reset-password. 60-min TTL · one-time use · invalidates siblings.
- **APScheduler Daily 8 AM Job**: walks all active tenants, updates status (active/expiring_soon/expired), pushes in-app notifications to landlord + tenant, emails reminders on configured days (defaults 30/14/7/3/1/0). Manual trigger via POST /api/admin/scheduler/run-now.
- **Notification Center**: bell with unread badge, mark-all-read, delete, type colours, popover history.
- **Settings Page**: landlord configures business name/address/phone/email/logo/currency/timezone/receipt prefix/receipt footer/reminder days/notification prefs. Backs all PDF + email templates.
- **Security Hardening**: account lockout (6 fails → 15-min lock), security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), bcrypt, JWT cookies (httpOnly, secure, samesite=none).
- **Dashboard Upgrades**: today's revenue, monthly income, outstanding count, open tickets, plus existing properties/units/occupancy/yearly-net widgets.
- **Reports**: occupancy + expiring leases now have **PDF and CSV** export. Income / Expenses / P&L / Maintenance / Outstanding available as PDF endpoints.
- **Activity Timeline**: extended with IP capture on login. Used by Super Admin's activity logs view.

## Test Status
- Backend regression (test_rentorax_flow.py): **19/19** PASS
- Backend Phase-2 (test_phase2.py): **18/18** PASS (after history-merge fix)
- Frontend Playwright: all Phase-2 testids verified

## Deferred to Phase 3
- SMS / WhatsApp dispatch (hooks ready, channels not wired)
- Refresh-token rotation
- Multi-currency conversion at payment time
- Multi-language UI (i18n)
- Subscription billing (Paystack/Stripe) for landlords
- Mobile (React Native) port

## Credentials & Endpoints
- Super Admin: `admin@rentorax.com` / `Admin@2026`
- Manual scheduler trigger: `POST /api/admin/scheduler/run-now`
- Forgot password: `POST /api/auth/forgot-password {email}`
- Uploads: `POST /api/uploads/file` (multipart, `folder` form field)
- PDFs: `GET /api/pdf/{receipt|tenant|notice|report}/{id|kind}`
- Settings: `GET/PUT /api/settings`
- Notices: `GET/POST/PATCH /api/notices`, tenant `GET /api/notices/tenant/list`, `POST /api/notices/{id}/acknowledge`
- Move-out: `POST /api/tenants/{id}/move-out`
- Assign existing: `POST /api/units/{unit_id}/assign-existing`
- History: `GET /api/units/{unit_id}/history`
