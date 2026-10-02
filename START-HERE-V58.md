# Singh Academy V58 — Start Here

V58 is an upgrade over V57. It does **not** redesign the public site and it does not change the approved certificate master design or payment-provider credentials.

## 1. Preserve your environment

Keep the existing backend `.env` from V57. `REQUIRE_EMAIL_VERIFICATION` is no longer used and can be removed.

Do **not** replace or commit your MongoDB, Stripe, PayPal, SMTP or authentication secrets.

## 2. Install dependencies

From the project root:

```powershell
npm run install:all
```

This creates/updates `backend/package-lock.json` and `frontend/package-lock.json` when run on a working network.

## 3. Run the V58 migration once

```powershell
npm run migrate:v58
```

The migration:

- releases existing student accounts from the old email-verification gate;
- clears obsolete verification tokens;
- publishes any old pending learner reviews;
- synchronizes active Academy memberships into course enrollment records so My Courses remains enrollment-driven.

It does not intentionally delete users, courses, payments, subscriptions, progress or certificates.

## 4. Run release checks

```powershell
npm --prefix backend run preflight
npm run check:ui
node --test backend/test/v58-regressions.test.js
npm run verify
```

`npm run verify` requires dependencies and package-lock files to be installed first.

## 5. Local run

Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev:frontend
```

## 6. Acceptance checks

### Student auth

- Register with name, valid-format email, 8+ character password and matching confirmation.
- Registration should create the account, sign the student in immediately and go to the site without a verification screen.
- Existing student login should work without email-verification status.
- Forgot-password OTP flow remains available and is separate from account verification.

### My Courses

- A student with no active enrollments should see an empty My Courses state.
- Purchase/enroll in one individual course: only that active course should appear.
- Expire/cancel that enrollment: it should stop appearing.
- With an active Academy membership, published courses are synchronized as membership enrollments and appear while the membership is active.
- Access expiry rules remain enforced.

### Reviews

- Submit a learner review on `/reviews`.
- The new/updated review should appear immediately on the page without a manual browser refresh.
- Client Admin → Reviews: review is visible but there are no edit/delete controls.
- Super Admin → Reviews: review can be edited, hidden/visible, or deleted.
- There is no learner-review approval queue.

### Certificate

Certificate code/assets were intentionally preserved from V57. Confirm one completed course still renders/downloads using the approved single master template.

### Payments

V58 does not replace provider credentials or checkout architecture. Keep the existing Stripe/PayPal environment settings and run the existing payment checker when those providers are configured:

```powershell
npm run payments:check -- --remote --strict-webhooks
```

## 7. Deployment

1. Deploy the V58 backend/frontend code.
2. Keep existing production secrets.
3. Run `npm run migrate:v58` once against the intended production database.
4. Restart/redeploy backend and frontend.
5. Test student login, one individual enrollment, one active membership, My Courses, review submission, Client Admin Reviews, Super Admin Reviews and one certificate.

Do not run a destructive database reset/seed against production.
