# Singh Academy V46 — local setup

**Pehle backup.** Extract the ZIP into a new folder. The root is `singh-academy-v46`, with `backend` and `frontend` inside it. Keep your old source, database and GridFS uploads intact. Never drop the database to repair an installation or index conflict.

These commands work in Windows CMD or PowerShell unless a section explicitly labels otherwise. Run commands one at a time; stop at the first error.

## 1. Preserve your configuration

Copy your existing V45 `backend/.env` into the new `backend` folder **before setup**. Keep the existing strong `AUTH_SECRET` and especially `MFA_ENCRYPTION_KEY`; the latter decrypts existing authenticator settings. Do not publish secrets or commit environment files.

Use Node.js 22 or newer with working npm registry access. V46 source/unit checks here used Node 22.16.0. For business writes use MongoDB Atlas or a replica set, preferably a staging copy for first tests. No production URI or database is supplied.

From the root:

```bat
node -v
npm -v
npm run setup
notepad backend\.env
```

The dependency-free setup creates missing environment files and random secrets only for missing/placeholder settings. Existing configured values are preserved. Backups named `.env.before-v45-*` may be created by the inherited setup routine; they also contain secrets. The filename is retained for compatibility, not a sign that you received old application code.

Set your real staging `MONGODB_URI`. Review both administrator email addresses and the generated passwords privately. Normal admin seeding does not reset existing passwords or change existing roles.

Local key settings:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3001
PUBLIC_API_URL=http://localhost:5000/api
REQUIRE_ADMIN_MFA=true
REQUIRE_EMAIL_VERIFICATION=true
TRUST_PROXY_HOPS=0
MAX_UPLOAD_MB=250
MAX_CONCURRENT_UPLOADS=2
MONGO_MAX_POOL=20
UPLOAD_SCAN_REQUIRED=false
```

Keep real generated secret values, not placeholder text. `frontend/.env.local` uses `NEXT_PUBLIC_API_URL=http://localhost:5000/api`. The supplied Docker deployment builds the frontend with `/api` instead. Never put server secrets in a `NEXT_PUBLIC_*` variable.

Development may omit SMTP: verification/reset messages then appear in the backend console under `[LOCAL DEVELOPMENT EMAIL ONLY]`; no real email is sent. Production requires real SMTP and the upload scanner.

## 2. Install and prepare the database

Still in the root:

```bat
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v46
npm --prefix backend run seed:admins
npm --prefix backend test
```

`install:all` uses existing lockfiles with `npm ci`, or runs `npm install` when they do not yet exist. **Review and retain the two generated `package-lock.json` files.** No lockfiles are fabricated in this delivery: registry DNS resolution was unavailable here.

`migrate:v46` adds missing security defaults and indexes for the existing and new models, and normalizes only documented old admin-role aliases. It preserves business/course data and existing V45 portal sessions. It does not repair unknown financial history, invent dates, recreate courses or change passwords. Some additive steps may complete before an error; inspect the error and safely rerun after resolution.

A unique-index conflict needs human review of duplicates. For example, the review model permits only one pending review per student. Reconcile legitimate duplicate pending records in staging before retrying. **Do not delete collections or use `syncIndexes` blindly.**

Demo content is optional, not part of a normal upgrade. Only when you deliberately need initial/demo website/course content:

```bat
npm --prefix backend run seed:data
npm --prefix backend run seed:courses
```

These seeds preserve existing records. They do not create fake customer payments. Do not expect reseeding to overwrite a previously edited course.

## 3. Run two processes

First terminal, root:

```bat
npm run dev:backend
```

Second terminal, root:

```bat
npm run dev:frontend
```

Keep both open. Press Ctrl+C to stop a process. A development server is not your production deployment.

```text
Website           http://localhost:3000
Student login     http://localhost:3000/login
Student billing   http://localhost:3000/billing
Client Admin      http://localhost:3000/admin/login
Super Admin       http://localhost:3000/super-admin/login
API health        http://localhost:5000/api/health
API readiness     http://localhost:5000/api/health/ready
```

If the frontend uses port 3001, open that port and keep it in `FRONTEND_URLS`. Update `FRONTEND_URL` too when testing emailed links. Restart affected processes after environment edits. Do not mix `localhost` and `127.0.0.1` origins casually.

## 4. First administrator login

Use the correct portal with the corresponding account. A client account does not log into the student or builder portal. Required MFA initially restricts the session to the Security page. Add the displayed setup key to an authenticator, enter its current six-digit code and save the one-use recovery codes privately. Each account has its own setup.

A setup key shared in a screenshot is exposed: restart pending setup and replace it. Do not regenerate the server encryption key to fix login. Production startup refuses disabled MFA or disabled email verification.

Owner-only recovery commands from `backend` exist for actual recovery, not routine startup. Normal seed is safe; `npm run seed:admins -- --reset-password` deliberately resets the configured accounts and revokes their sessions while preserving MFA. Review both accounts first. Lost-authenticator recovery is documented in the technical deployment guide; do not hand the command to ordinary students.

## 5. Local verification before release

Stop development processes if they occupy the browser-test ports. From root:

```bat
npm run verify
```

This requires reviewed lockfiles and installed packages. It runs unit checks, full frontend typecheck, production build, source checks and production dependency audit. It stops on failure. Do not use `npm audit fix --force` to hide incompatibilities.

Real Mongo/HTTP and application-browser testing require the isolated test database described in `DEPLOYMENT-V46.md`. They were authored but not executed here. Finish `ACCEPTANCE-V46.md` before client handover.

## 6. Common errors

**AUTH_SECRET / MFA key validation:** run setup after copying your existing `.env`; preserve a valid existing MFA key. Use real random values and never paste them into chat.

**EAI_AGAIN:** DNS/network cannot reach the npm registry. Correct the network/DNS/proxy first and rerun `npm run install:all`. Reinstalling nodemon does not repair a secret or DNS problem. Do not disable TLS verification.

**503 on financial operations:** MongoDB must support transactions. Your earlier log already showed transaction support, but use the correct URI in the new folder.

**503 on upload in production:** scanner unavailable/not updated, file exceeds scan policy, or upload concurrency exceeded. Check private scanner logs; do not disable scanning to make production uploads succeed.

**N/A/empty figures:** an empty or unverified financial history is not revenue. Record actual receipts through invoices; do not inject dummy sales to fill charts.

**Install/build error:** send the error with secrets, tokens, email addresses and connection credentials removed. A passed syntax check is not evidence that a dependency error can be ignored.
