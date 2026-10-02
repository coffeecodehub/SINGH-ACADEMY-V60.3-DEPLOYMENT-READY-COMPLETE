# Singh Academy V59 — Start Here

V59 is a stability patch over V58. No database reset is required.

## Upgrade

1. Extract V59 into a new folder.
2. Copy your existing `backend/.env` into the V59 `backend` folder. Do not overwrite secrets with `.env.example` placeholders.
3. Install dependencies:

```bash
npm run install:all
```

4. Run the V59 migration marker (no schema/data rewrite):

```bash
npm run migrate:v59
```

5. Run checks:

```bash
npm --prefix backend test
npm run check:ui
npm run verify
```

6. Run locally:

```bash
npm run dev:backend
```

Second terminal:

```bash
npm run dev:frontend
```

## What V59 fixes

- Backend regression suite failures caused by stale test-harness dependencies after V58 changes.
- Explicit generic-CMS review creation rejection.
- Leftover certificate Try Again review-acknowledgement gate that no longer matched the UI.
- Version/logging consistency.

## What V59 preserves

- Instant student signup/login, 8-character minimum student password, no account email-verification gate.
- Enrollment-driven My Courses.
- Immediate learner reviews.
- Client Admin read-only Reviews and Super Admin editable Reviews.
- Existing approved certificate PDF template/assets.
- Existing Stripe/PayPal one-time fixed-term checkout architecture.

For payment account activation, read `PAYMENTS-V59-CONNECT.md`.
