# RentoraX — Product Requirements Document

**App:** RentoraX
**Stack:** FastAPI · MongoDB · React (Tailwind + shadcn/ui) · JWT auth
**Audience:** Nigerian landlords (especially the diaspora) managing rental properties remotely.

## Original Problem Statement
Build a modern, enterprise-grade, production-ready Property Management & Rent Collection System
for landlords in Nigeria — multi-tenant SaaS, 4 roles (Super Admin, Landlord, Caretaker, Tenant),
property/unit/tenant/payment/maintenance/accounting modules, rent expiry color-coding,
role-based access, reports, notifications, premium UI inspired by Buildium/AppFolio.

## User Personas
1. **Super Admin** — runs the RentoraX platform; manages landlord accounts and subscriptions.
2. **Landlord (Diaspora)** — owns Nigerian properties; needs remote control over tenants, rent, maintenance and books.
3. **Caretaker / Property Manager** — boots on the ground; limited permissions per property.
4. **Tenant** — optional portal access; views lease, pays, raises maintenance.

## Core Requirements (static)
- 4 role dashboards with role-based RBAC.
- Properties (7 types) with auto-generated units, renaming, occupancy badges.
- Tenants with full record (NIN, guarantor, lease dates, payment frequency).
- Payments with auto-numbered receipts (PDF/print).
- Rent expiry tracker with 5-tier color (safe/warning/urgent/critical/expired).
- Maintenance kanban (6 statuses, 13 categories, 4 priorities).
- Accounting (income, expenses, P&L) with charts.
- Caretaker creation with per-action permission matrix and per-property scope.
- Tenant portal: dashboard, payment history, maintenance, announcements.
- Activity logs and notifications.
- Dark/Light mode.
- Reports: occupancy, expiring leases (CSV export).

## What's been implemented (2026-06-30 · MVP v1)
- ✅ FastAPI backend with JWT cookies, RBAC dependency, scoped queries per role.
- ✅ Routers: auth, admin (landlord CRUD, stats, announcements, activity logs), landlord (props, units, tenants, payments, maintenance, expenses, income, accounting, caretakers, reports, announcements), tenant portal, shared (notifications, global search).
- ✅ MongoDB indexes + super admin seed (admin@rentorax.com / Admin@2026).
- ✅ Frontend: Tailwind theme (Organic & Earthy palette — forest greens + terracotta + warm sand), dark mode, Outfit + IBM Plex Sans fonts.
- ✅ Landing page + login + protected routing per role.
- ✅ Super Admin: dashboard with platform stats, landlords list/CRUD, announcements broadcast, activity logs.
- ✅ Landlord: dashboard (cashflow chart + rent alerts), properties (auto-gen units), property detail (unit management), tenants (full form + portal toggle), tenant detail, payments (with printable receipt), maintenance kanban with drag-drop, accounting (income/expense + charts), caretakers (permissions + per-property scope), reports (occupancy, expiring) with CSV export, announcements.
- ✅ Caretaker: limited dashboard + reused properties/tenants/maintenance pages (filtered by scope).
- ✅ Tenant portal: dashboard, payment history with printable receipts, submit maintenance, announcements, profile + password change.
- ✅ Global search across tenants/properties/payments/maintenance (API ready).
- ✅ Activity audit trail across key actions.

## What's deferred (next iterations / P1)
- 📌 Email / SMS / WhatsApp notifications (channels are wired in-app only)
- 📌 Cloudinary or Emergent Object Storage for property/tenant/receipt uploads (currently URL strings)
- 📌 Subscription billing flow for Super Admin (Stripe/Paystack)
- 📌 PDF/Excel export (CSV only for MVP)
- 📌 Maintenance assignment to technicians + photos upload
- 📌 Multi-currency / multi-language
- 📌 Tenant document uploads (ID, agreements)
- 📌 Password reset flow (forgot-password email)

## Prioritized backlog
- **P0:** Polish UI rough edges based on testing agent findings; verify all CRUD flows.
- **P1:** Object storage for photos/documents, PDF receipts, Paystack subscriptions.
- **P2:** WhatsApp/Email notifications, mobile app via React Native, multi-currency, advanced reporting.

## Credentials
- Super Admin: `admin@rentorax.com` / `Admin@2026`
- Landlord/Caretaker/Tenant: created through the admin/landlord UI; password is shown once on creation.
