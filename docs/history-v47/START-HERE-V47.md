# Singh Academy V47 — local upgrade and run guide

## 1. Preserve your existing setup

Extract into a **separate** folder named `singh-academy-v47`. Back up V46 source, `.env`, database and GridFS files/chunks first. Copy your existing `backend/.env` into the new `backend` folder before setup. Keep `AUTH_SECRET` and especially `MFA_ENCRYPTION_KEY` unchanged. Do not copy old `node_modules` or `.next` output.

Use Node.js 22 or newer, a working npm network connection and an Atlas/replica-set MongoDB database. Payments and course-completion writes use transactions; a standalone MongoDB server is deliberately refused for those workflows.

Open `singh-academy-v47` in VS Code. Commands below work from that root in PowerShell. Run one at a time and stop on an error.

```powershell
node -v
npm -v
npm run setup
notepad backend\.env
```

Setup generates only missing/placeholder secrets and preserves existing configuration, including deliberately configured development flags. It does not reset existing database passwords. Review `.env` locally; never paste it into chat or commit it.

For local development only, the requested settings can remain:

```dotenv
NODE_ENV=development
REQUIRE_ADMIN_MFA=false
REQUIRE_EMAIL_VERIFICATION=false
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3001
PUBLIC_API_URL=http://localhost:5000/api
PORT=5000
```

`REQUIRE_ADMIN_MFA=false` skips **mandatory enrollment for admins not already enrolled**. An account with an authenticator already enabled still needs its code. This flag does not erase enrolled MFA secrets. Production preflight still requires MFA, email verification, HTTPS, SMTP and upload scanning.

The frontend local environment should contain:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Do not put payment secrets or MongoDB credentials in frontend variables. When changing a local port, update corresponding frontend/API origin settings and restart both processes.

## 2. Install and migrate

```powershell
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v47
npm run verify
```

The migration adds missing defaults/indexes for checkout orders, webhook processing, completion records and related business fields. It preserves content/history and does not reset courses, passwords or issue certificates. The duplicate Subscription schema index declaration is removed in source; no database collection/index deletion is required for that warning.

Normal upgrade with your existing admins needs no reseed. Only for missing admin accounts:

```powershell
npm --prefix backend run seed:admins
```

Normal seeding preserves existing passwords/roles. `seed:data` and `seed:courses` are optional demo content, not required setup or migration steps.

### Dependency audit from V46

Backend Sharp is explicitly pinned to 0.35.4. Frontend overrides also select Sharp 0.35.4. Stripe SDK is pinned to 22.6.2. Existing unrelated dependency versions are otherwise preserved. Do **not** run `npm audit fix --force`, suppress the audit or assume a version pin proves every dependency is secure.

`npm run install:all` creates both real package lockfiles. Review/save them, then `npm run verify` runs tests, installed image processing, sample PDF creation, TypeScript checking, Next production build, local source checks and high-severity production dependency audits for both projects. It deliberately stops if a step fails.

If your npm reports that an install script needs approval, review the specific package/version and your npm policy; do not approve every pending script blindly. The included `test:images` verifies that installed Sharp can actually encode/resize an image.

## 3. Run two terminals

Terminal 1, from project root:

```powershell
npm run dev:backend
```

Terminal 2, from project root:

```powershell
npm run dev:frontend
```

```text
Website:              http://localhost:3000
Signed-in Home:        http://localhost:3000/home
Team:                 http://localhost:3000/team
Student login:        http://localhost:3000/login
Client Business Admin:http://localhost:3000/admin/login
Super Admin:          http://localhost:3000/super-admin/login
Student certificates: http://localhost:3000/certificates
API health:           http://localhost:5000/api/health
```

If `EADDRINUSE` appears, stop the previous copy of that backend. In PowerShell use `Get-NetTCPConnection -LocalPort 5000 -State Listen`, then `Get-Process -Id ACTUAL_PID` to identify the owner before stopping that specific process. Do not kill every Node process or delete a database as a port fix. The V47 listening message now prints only after a successful bind.

## 4. Enable the two payment methods

Online payments start disabled rather than simulating a successful transaction. Follow **PAYMENTS-V47.md**, set your own test/sandbox credentials and registered webhook details in `backend/.env`, and then enable:

```dotenv
ONLINE_PAYMENTS_ENABLED=true
```

Both configured methods appear on Checkout. An unconfigured method is shown disabled with “Not connected yet”. A configured flag only means required configuration is present; perform real sandbox purchases before claiming the account is connected successfully.

Use a separate staging database/test students for sandbox. Never collect real customer money on `NODE_ENV=development`, disabled verification, or an untested configuration.

## 5. Previously completed students

New completions are recorded as the final required lesson is marked complete. For older completed Progress records, first inspect the dry run:

```powershell
npm --prefix backend run certificates:backfill
```

After reviewing the result and backing up:

```powershell
npm --prefix backend run certificates:backfill -- --apply
```

Apply creates pending certificate records and business notifications only; it never issues a certificate automatically. Client Admin reviews the Certificates section. This is separate from payment migration and not a course reseed.

## 6. Before deployment

Read **DEPLOYMENT-V47.md** and complete **ACCEPTANCE-V47.md**. This delivery did not connect your merchant accounts, change your server, test your live database, or execute a V47 production build. Preserve the security gate and report exact errors without sharing secrets.
