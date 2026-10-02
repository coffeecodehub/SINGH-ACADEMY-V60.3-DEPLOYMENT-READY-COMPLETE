# Singh Academy V51 - setup and upgrade

V51 is an additive update on the V50/V48-based project. It keeps the approved public layout and content baseline except for the specifically requested logo, Contact page, and landing-image focus changes.

## Before starting
1. Back up the current source, `backend/.env`, MongoDB database, and GridFS collections/files.
2. Extract V51 to a new folder.
3. Copy your existing `backend/.env` into V51. Preserve `AUTH_SECRET`, `MFA_ENCRYPTION_KEY`, MongoDB URI, Stripe/PayPal credentials and webhook secrets.
4. Do not copy `node_modules` or `.next` from an older project.

Use Node.js 22 or newer.

## First setup / upgrade
From the V51 root:

```powershell
npm run setup
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v51
npm run check:ui
npm run verify
```

`migrate:v51` is additive. It does not delete or reset course progress, previous attempts, payments, subscriptions or certificates.

If `npm run verify` reports an install, audit, typecheck or build failure, stop and resolve it before deployment. Do not hide a dependency issue with `npm audit fix --force`.

## Run locally
Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev:frontend
```

Open:
- Website: `http://localhost:3000`
- Student login: `http://localhost:3000/login`
- Client Admin: `http://localhost:3000/admin/login`
- Super Admin: `http://localhost:3000/super-admin/login`
- API health: `http://localhost:5000/api/health`

## Development-only convenience
For local testing only, you may use:

```dotenv
NODE_ENV=development
REQUIRE_ADMIN_MFA=false
REQUIRE_EMAIL_VERIFICATION=false
```

Production should use the secure production configuration and pass preflight/acceptance checks.

## What changed in V51
- Student course resume position is stored per current attempt; returning students reopen the lesson they were working on instead of always lesson 1.
- Previous/next module controls are available in the course player, including after full completion for review.
- Try Again continues to reset only that student's selected course progress, while preserving previous answers and showing the Admin feedback note.
- Team ordering is Founder -> Core Team -> Faculty -> Board of Advisors, then display order/name within the category.
- Contact page was professionally reorganized without changing the site's overall visual language.
- Course editor removes prerequisites, skills, tools and credit-hours fields from the UI.
- Quiz editor now exposes MCQ (one answer) and MSQ (multiple answers).
- Admin sections have Back navigation; major content/curriculum mutations require confirmation and show success feedback.
- Landing certificate photo focus was adjusted and the middle practice card now uses an existing real Academy photo.
- The requested SA shield logo is now the default logo across the website.
- Newly issued certificates use the requested cream/brown framed SA watermark design and exact shield logo.

See `WORKFLOW-V51.md` and `QA-V51.md` for behavior and verification limits.
