# Singh Academy V52 - setup and upgrade

V52 builds on V51.1 without redesigning the approved public website. It adds immediate student registration, welcome email + auto-login, Client Admin activity counters/form submissions, Core Team-last ordering, auto-save-on-Continue learning behavior, and the approved certificate signature/layout update.

## Before starting
1. Back up the current source, `backend/.env`, MongoDB database and GridFS/media.
2. Extract V52 into a new folder.
3. Copy the existing `backend/.env` into V52. Preserve `AUTH_SECRET`, `MFA_ENCRYPTION_KEY`, MongoDB URI and payment-provider credentials.
4. Do not copy old `node_modules` or `.next` folders.

Use Node.js 22 or newer.

## First setup / upgrade
From the V52 root:

```powershell
npm run setup
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v52
npm run check:ui
npm run verify
```

`migrate:v52` only creates required indexes. It does not reset students, course progress, attempts, payments, subscriptions, forms or certificates.

## Local run
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

## Registration behavior
Student registration is now intentionally simple: Name, Email, Password and Confirm Password. There is no email-verification step. A new student account is created as a student-only account, a student session is issued immediately, the browser opens the site as the signed-in user, and a welcome email is queued in the background.

Use:

```dotenv
REQUIRE_EMAIL_VERIFICATION=false
```

SMTP is still needed in production for welcome messages, password-reset emails and other configured Academy emails. A mail transport failure does not undo a successful registration.

## Important performance note
V52 removes artificial waits from registration and sends the welcome email without blocking the registration response. Actual 0.05 millisecond page/network loading cannot be guaranteed because browser, device, database and network latency are outside the application code. Use the production build, CDN/reverse proxy and staging performance checks before handover.
