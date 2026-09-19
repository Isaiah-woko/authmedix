# AuthMedix

**An adaptive, zero-trust clinical access platform designed to make access to patient information a continuous, context-dependent security decision.**

In most hospital systems, being a doctor at a hospital means you can open any chart in that hospital. AuthMedix inverts that default: **nobody has standing access to any patient, ever.** Not a doctor at the same hospital, not an administrator, not even the patient's own care team until explicitly assigned. Every view of a record is an explicit, scoped, time-bound grant, and every access attempt, allowed _or denied_, is written to a tamper-evident audit ledger before the server responds.

---

## The problem

- Clinical systems grant **standing, role-wide access**: insider over-access is normal and invisible.
- Audit logs are an afterthought: written only on success, stored plainly, trivially altered.
- Emergency ("break-glass") access either doesn't exist, or exists with no justification and no review.

AuthMedix treats access as a **decision made per request, per patient, per worker**, and makes the answer to "is this access authorized right now?" unmistakable on every screen.

## Core principles

1. **Zero standing access.** Role and hospital affiliation grant eligibility to _request_ access; never access itself.
2. **Every access is explicit, scoped, and time-bound.** One primitive, the Access Passport, covers routine, referral, and emergency access.
3. **Audit always, before responding.** Every patient-data call passes through a single `checkAccess()` gate that writes an audit row (allow or deny) _first_.
4. **Continuous trust.** Sessions are re-validated on every request (status, expiry, invalidation). Suspend a worker and their access dies on their next call, not at TTL expiry.
5. **The UI is never the security boundary.** Every gate is enforced server-side; the interface only mirrors it, clearly, calmly, at a glance.

## The Access Passport

| Type          | Duration                                                    | Created by                                                                    | Renewable                               | Flagged for review |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| `STANDARD`    | 8h (or 24h extended episode), fixed presets, never freeform | Admin only: care-team assignment at intake, request approval, or direct grant | Yes                                     | No                 |
| `REFERRAL`    | 48h, fixed                                                  | Admin only: cross-hospital, push-model by Health ID                           | Yes                                     | No                 |
| `BREAK_GLASS` | 2h, fixed                                                   | Self-invoked by clinical roles, **no approval step**                          | **No; must be deliberately re-invoked** | Always             |

A passport is valid only if `status === ACTIVE` **and** `expiresAt > now`; both conditions, checked live on every request. Revocation takes effect immediately; suspending a staff account auto-revokes all their active passports in the same transaction.

**Three paths to access:** care-team assignment at patient intake (the normal path, most workers never request anything) → formal request → admin approval (the fallback) → break-glass (the emergency exception, with a mandatory 3-step activation: confirm emergency → fixed category → written justification, always required).

## Security model

- **Two-step login:** Health ID + email + password, then a one-time email code (hashed at rest, ~5-minute expiry). Unknown-user logins run a dummy bcrypt compare so response timing never reveals which accounts exist.
- **Shared lockout:** 5 failures across password _and_ OTP locks the account until an admin unlocks it. Every failure is audit-logged.
- **Role-based session TTLs:** Nurse 6h · Doctor/Pharmacist/Lab 8h · Admin 4h. No silent refresh, by design.
- **Credential hygiene:** admin-issued temp passwords and worker-chosen passwords share one strength rule (10+ chars, upper/lower/number/symbol); first login hits a blocking, server-enforced password-change gate.
- **Step-up 2FA** on sensitive admin actions: approving requests, granting passports, creating staff.
- **Rate limiting:** Upstash Redis sliding windows (serverless-safe): 10 req/15 min per IP+Health ID on auth endpoints; 5 req/15 min per IP+Admin on sensitive actions.
- **Minimum-necessary field filtering:** responses contain only what the caller's role may see. Break-glass deliberately bypasses the role filter and returns a fixed **Emergency Summary** (allergies + all record types) for every role.
- **Tamper-evidence:** SHA-256 hash-chained audit ledger (`prevHash → entryHash`), content hashes on clinical records, OTP codes never stored or logged in plaintext.

### Role → field visibility (validated with clinical practitioners)

| Role       | Notes  | Labs              | Prescriptions | Uploads | Allergies |
| ---------- | ------ | ----------------- | ------------- | ------- | --------- |
| Doctor     | Full   | Full              | Full          | Full    | Full      |
| Nurse      | Full   | Full              | View          | View    | Full      |
| Pharmacist | View   | View              | Full          | View    | Full      |
| Lab        | Hidden | Full (own orders) | Hidden        | Hidden  | Hidden    |
| Admin      | Hidden | Hidden            | Hidden        | Hidden  | Hidden    |

## Tech stack

| Layer               | Technology                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js (App Router, TypeScript), single Vercel deployment                                                        |
| UI                  | React, Tailwind CSS: semantic design system (one meaning per color), IBM Plex Mono for IDs/codes/timestamps       |
| Auth                | NextAuth (Auth.js) v5: custom two-step credentials flow, HttpOnly session cookie                                  |
| Database            | PostgreSQL (Supabase) via Prisma with the `pg` driver adapter                                                     |
| Rate limiting       | Upstash Redis (`@upstash/ratelimit`, sliding window)                                                              |
| Email / OTP         | Nodemailer over SMTP: branded HTML, codes never logged                                                            |
| Validation          | Zod on every route body                                                                                           |
| Crypto              | bcrypt (12 rounds), Node `crypto` SHA-256/HMAC                                                                    |
| Documentation input | Self-hosted Tesseract.js OCR (images never leave the browser) + Web Speech API dictation, both review-before-save |

## Architecture

```
Browser (React / Next.js App Router)
        │
        ▼
Edge middleware: continuous session check on every request
        │
        ▼
API routes ──► checkAccess()  ◄── the single gate for all patient data
        │            │
        │            └──► Audit ledger (write ALWAYS, before responding)
        ▼
Prisma ──► PostgreSQL        Upstash Redis (rate limits)
```

Three rules hold it together: no route touches patient data without `checkAccess()`; `checkAccess()` always audits first; the frontend only mirrors server-side truth.

## What's in the box

**15 core screens:** two-step login + OTP + blocking password set · empty-by-default clinical dashboard · identity-only patient search · four-state patient record view (with passport / never had one / expired / revoked, each visually distinct) · request access · typed/dictated/OCR documentation · 3-step break-glass with live 2h countdown · admin request queue with step-up 2FA · grant/referral/revoke · staff management with display-once temp passwords · patient registration with care-team assignment · flagged review queue with high-priority tagging · filterable audit log viewer.

**Beyond the brief:** a SOC-style Security Overview (insight cards, allowed-vs-denied chart, activity feed), first-run `/setup` bootstrap, voluntary password change, admin patient directory, and a rehearsed demo runbook.

## Getting started

**Prerequisites:** Node 20+, pnpm, a PostgreSQL database, an Upstash Redis database, an SMTP account.

```bash
git clone <your-repo-url> && cd authmedix
pnpm install
cp .env.example .env        # fill in the values below
pnpm prisma migrate dev     # create the schema
pnpm prisma db seed         # load demo hospitals, staff, patients, scenarios
pnpm dev                    # http://localhost:3000
```

| Variable                                                                             | Purpose                         |
| ------------------------------------------------------------------------------------ | ------------------------------- |
| `DATABASE_URL`                                                                       | PostgreSQL connection string    |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL`                                                   | Session signing + canonical URL |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | OTP email delivery              |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`                                | Sliding-window rate limits      |

## Demo data

The seed script loads two hospitals, six staff, five patients, and every access state the product handles: active care-team passports, a pending request in the admin queue, an expired passport, a revoked passport, an unreviewed flagged break-glass, and a cross-hospital referral.

| Role                       | Health ID       | Password      |
| -------------------------- | --------------- | ------------- |
| Admin                      | `LUTH-ADM-0001` | `LUTHadmin1!` |
| Doctor                     | `LUTH-DOC-0001` | `LUTHdoc123!` |
| Nurse                      | `LUTH-NUR-0001` | `LUTHnurse1!` |
| Pharmacist                 | `LUTH-PHA-0001` | `LUTHpharm1!` |
| Lab                        | `LUTH-LAB-0001` | `LUTHlab123!` |
| Doctor (referral hospital) | `RSH-DOC-0001`  | `RSHdoc1234!` |

> Demo OTP emails route to a single inbox via Gmail `+` aliases (e.g. `you+doc@gmail.com`). Point the seed at your own mailbox before sharing this repo publicly.

## Deployment

One Vercel project. The build runs migrations before compiling (`prisma migrate deploy && next build`); the Prisma client uses a capped connection pool sized for serverless. Reset-and-reseed is a single command, so the demo is always stage-fresh.

---

_Authorized vs. not, at a glance, on every screen, every time. That's the whole product._
