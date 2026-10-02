# Singh Academy V48 — setup and upgrade

## 1. Preserve the current installation

Extract V48 into a **separate** `singh-academy-v48` folder. Back up V47 source, backend/frontend environment files, the MongoDB database and GridFS files/chunks. Copy your existing `backend/.env` into this new folder before running setup. Keep `AUTH_SECRET` and **MFA_ENCRYPTION_KEY** unchanged. Preserve your existing merchant/webhook credentials and frontend API setting when already configured. Do not copy `node_modules` or `.next`.

Use Node.js 22 or newer as required by these package manifests, a working npm connection and MongoDB Atlas or a replica set. Answer saves, course restarts and certificate decisions use database transactions. Standalone MongoDB is refused for those transactional writes; there is no unsafe partial-write fallback.

Open the extracted project root in VS Code. The commands below work in PowerShell; run them one at a time.

```powershell
node -v
npm -v
npm run setup
notepad backend\.env
```

Setup preserves existing non-placeholder values and creates missing settings. It does not reset existing database passwords. Review configuration privately; do not paste secrets into chat or commit them.

For local testing, the existing development preference can remain:

```dotenv
NODE_ENV=development
REQUIRE_ADMIN_MFA=false
REQUIRE_EMAIL_VERIFICATION=false
PORT=5000
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3001
PUBLIC_API_URL=http://localhost:5000/api
```

Setting required MFA false does not disable an authenticator already enrolled on an account. Production still requires MFA/email verification, HTTPS, SMTP and upload scanning. Do not deploy as development to avoid these checks.

The frontend `frontend/.env.local` must use the correct local API origin:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 2. Install, migrate and verify

From the root:

```powershell
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v48
npm run verify
```

The additive migration checks existing and new indexes, adds missing completion attempt defaults and website-content revisions, and preserves accounts, courses, billing, payments and issued certificates. It does not drop collections, reset course progress, fabricate historic quiz answers or issue certificates. Back up before running it.

Do not reseed normal existing installations. Only when an admin account is missing:

```powershell
npm --prefix backend run seed:admins
```

Normal seeding keeps existing credentials. Demo course/data seeds are optional and are not required to activate these changes.

Installation must generate genuine `backend/package-lock.json` and `frontend/package-lock.json`. Review and save both after successful dependency resolution. Verification deliberately refuses missing locks and runs unit tests, installed image processing, native PDF sample generation, full frontend typecheck/build, source checks and production dependency audits. Never bypass a failed audit or run `npm audit fix --force` merely to get a green status.

If an npm install-script approval warning appears, review only the specific package/version that needs approval under your npm policy. Run `npm --prefix backend run test:images` after installation to verify the image processor actually works.

## 3. Start the application

Terminal 1, from root:

```powershell
npm run dev:backend
```

Terminal 2, from root:

```powershell
npm run dev:frontend
```

```text
Website:        http://localhost:3000
Student login:  http://localhost:3000/login
Client Admin:   http://localhost:3000/admin/login
Super Admin:    http://localhost:3000/super-admin/login
My Billing:    http://localhost:3000/billing
Certificates:  http://localhost:3000/certificates
API health:    http://localhost:5000/api/health
```

Only one backend should listen on its configured port. On `EADDRINUSE`, inspect `Get-NetTCPConnection -LocalPort 5000 -State Listen`, identify the process before stopping it, and close the old project copy. Do not terminate unrelated Node processes or delete data.

## 4. Verify the new workflow

Client Admin: Courses / Team / Events / Certificates / Completion notifications / Security. No customer, revenue, invoice-management or business reporting menu. Super Admin: website content controls, including Plans, Reviews, Social and Website Content. Each portal uses its own authenticated session and role restrictions.

Create a draft test course or use a staging copy. Add named modules and a required quiz/assignment. Publish the course and lesson. Use a student with valid access. Save answers, reload to confirm persistence, then complete required lessons. In Client Admin, open the completion notification and review the answers. First test Try Again: only that student's course progress resets. On the second completion, test approval, private PDF download and public verification.

My Billing uses existing real subscription records. An empty account remains empty; no sample money is injected. Re-subscribe uses the retained Stripe/PayPal checkout. Credentials/webhooks and actual sandbox purchases remain necessary; read PAYMENTS-V48.md.

## 5. Legacy completions

Previously issued certificates remain issued. Previously pending completions can be reviewed, but missing required assessment answers are not invented. Use Try Again to have the student submit the current assessments when necessary.

For old fully completed Progress records without a completion entry:

```powershell
npm --prefix backend run certificates:backfill
```

This is a dry run. After reviewing counts and backups, apply deliberately:

```powershell
npm --prefix backend run certificates:backfill -- --apply
```

Apply creates pending/legacy attempt records and completion notifications, never approved PDFs. Do not repeat it as a way to reset courses.

## 6. Real integration and release

Use the dedicated test replica set, not the production database/account. `TEST_MONGODB_URI` must explicitly name a database ending `_test`; the harness creates and later drops only its reserved random test database. See DEPLOYMENT-V48.md for the local test Compose commands.

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27018/sa_test?replicaSet=rs0&directConnection=true'
npm --prefix backend run test:integration
```

Run actual frontend/merchant/scanner/mail/backup acceptance afterwards. This package did not complete those checks on your infrastructure. See SECURITY-QA-V48.md for exact local results and failures.
