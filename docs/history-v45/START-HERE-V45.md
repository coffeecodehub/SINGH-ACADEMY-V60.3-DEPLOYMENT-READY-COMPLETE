# Singh Academy V45 — setup and operating guide

**Delivery:** updated source, 26 September 2026. **Start in a separate staging copy. This is not a production-readiness certificate.**

V45 replaces the shared login session and expands Client Admin into a business workspace. The public website and V44 course/content editors are retained. It does not contain your database, real credentials, installed dependencies, compiled output or a working Stripe/PayPal integration.

## 1. Before starting

Back up your existing source, `.env`, MongoDB database and uploaded GridFS files. Extract the new ZIP into a separate folder. Its root is `singh-academy-v45`, containing `backend` and `frontend`. Open that root in VS Code. Use **Command Prompt (CMD)** for the Windows commands below, not PowerShell.

Use **Node.js 22 or newer**, as specified by the package manifests. MongoDB must support the project's aggregation queries. Use **MongoDB Atlas or a replica set for financial and sensitive account changes**; these operations intentionally return 503 on standalone MongoDB instead of writing half of a transaction. A localhost-only development replica-set option is described below.

Do not drop collections, delete existing users, reseed courses to repair login, disable TLS verification, or use `npm install --force` to conceal errors.

## 2. Backend: first CMD terminal

From the extracted root:

```bat
node -v
npm -v
cd backend
npm run setup
notepad .env
```

`npm run setup` works without installed npm dependencies. It creates `.env` when missing and generates random AUTH_SECRET, MFA_ENCRYPTION_KEY and admin passwords only for missing/placeholder values. Existing configured database URIs and non-placeholder credentials are preserved. Changed existing configuration is backed up as `.env.before-v45-*`. Do not share that backup; it also contains secrets.

In `.env`, enter your **staging MongoDB URI** and review the admin email addresses. The generated passwords are stored in that local file, not printed by the script. Do not paste credentials into public chat or commit the file.

```dotenv
PORT=5000
MONGODB_URI=YOUR_ACTUAL_STAGING_MONGODB_URI
AUTH_SECRET=GENERATED_BY_SETUP
MFA_ENCRYPTION_KEY=GENERATED_BY_SETUP

FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3001
PUBLIC_API_URL=http://localhost:5000/api
NODE_ENV=development
REQUIRE_ADMIN_MFA=true
REQUIRE_EMAIL_VERIFICATION=true
TRUST_PROXY_HOPS=0
```

**The block shows key names; do not replace the real generated secret values with the example text.** Keep the two generated admin passwords, or supply two different strong passwords, 12 characters minimum and no more than 72 UTF-8 bytes. Set CLIENT_ADMIN_EMAIL and SUPER_ADMIN_EMAIL to the correct owners. Passwords already stored in MongoDB are not changed by normal admin seeding.

Then run:

```bat
npm install
npm run migrate:v45
npm run seed:admins
npm test
npm run dev
```

Keep this backend terminal open. Migration adds missing security defaults, normalizes documented old admin-role aliases, and creates required indexes. It does **not** reset financial records, invent historical payment dates, migrate unverified receipts into revenue, or recreate course content. A duplicate-index error requires reviewing duplicate data; the script does not silently delete it. Take a backup before migration.

The old shared JWT cookie is not accepted in V45. Existing users must sign in again. There is no student-to-admin promotion through signup.

## 3. Frontend: second CMD terminal

Open a new CMD terminal in the extracted `singh-academy-v45` root:

```bat
cd frontend
npm install
if not exist .env.local copy .env.example .env.local
npm run dev
```

Frontend `.env.local` must contain:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Never put database passwords, AUTH_SECRET, MFA_ENCRYPTION_KEY or provider secret keys in the frontend. Restart either process after changing its environment. Keep the frontend origin in backend FRONTEND_URLS when the frontend port changes.

Open:

```text
Website:       http://localhost:3000
Student login: http://localhost:3000/login
Client Admin:  http://localhost:3000/admin/login
Super Admin:   http://localhost:3000/super-admin/login
API health:    http://localhost:5000/api/health
```

An API health response alone does not prove that billing, uploads, email or every page works. Run the acceptance checklist before delivery to the client.

## 4. First admin login: two-step verification

Use the correct portal and the credentials belonging to that role. The **Client Admin account is not valid on student login or Super Admin login**. Super Admin is a website-builder role, not the owner of business data.

With REQUIRE_ADMIN_MFA=true, a first password login opens only **Security**, not the rest of the workspace. Enter the generated setup key manually in an authenticator that supports standard time-based one-time codes, enter its six-digit code, and enable verification. The UI provides **eight one-time recovery codes once**. Store them privately outside the project directory. The setup page includes a restart option for an expired setup.

Keep the server clock accurate. Keep MFA_ENCRYPTION_KEY safe and stable: it encrypts stored authenticator secrets. Do not replace that key casually after users enroll. This release has no transparent MFA-key rotation workflow.

New admin sessions have an eight-hour maximum lifetime and thirty-minute idle timeout; student sessions have a seven-day maximum and twenty-four-hour idle timeout. A password reset, session revocation or customer block invalidates the relevant old sessions. Separate cookies allow different roles to coexist in one browser without reusing one another's session.

## 5. Student signup, verification and password reset

Signup creates an unverified **student only**, even if a request attempts to submit an admin role. Verification is now actually consumed by `/verify-email`; the old redirect-only page has been replaced. Password reset for students uses a short-lived OTP and one-time reset token. Admin recovery does not use the public student reset route.

For **development without SMTP**, the backend prints the verification link or reset message under `[LOCAL DEVELOPMENT EMAIL ONLY]`. Open that verification link locally. No real email is sent in this mode. Do not expose development logs publicly.

For real email, configure your actual SMTP provider:

```dotenv
SMTP_HOST=YOUR_ACTUAL_SMTP_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_ACTUAL_SMTP_USERNAME
SMTP_PASS=YOUR_ACTUAL_SMTP_PASSWORD
EMAIL_FROM=Singh Academy <YOUR_VERIFIED_SENDER_ADDRESS>
```

Use the TLS/port settings supplied by your email service. In production there is no console-email fallback. Login can resend a verification message without revealing whether an address exists. Verify real delivery and sender authentication before client handover.

**Legacy verification caveat:** V44 created some users with emailVerified=true. V45 cannot infer that those people proved mailbox ownership. To explicitly require all existing students to reverify, after coordinating with the client:

```bat
npm run migrate:v45 -- --require-reverify
```

This invalidates affected student sessions and requires students to request verification from login. It does not automatically email the whole database. Normal migration preserves the old flag rather than unexpectedly locking everyone out.

## 6. Business workflow

**Customer → invoice → actual receipt → paid access → renewal or refund.**

Open Customers to search student profiles, view signup/last-login timestamps and purchase history, edit contact details/internal notes, block an account or revoke its sessions. Financial history is retained, not erased when a customer is blocked.

Create an invoice for a published course or active Academy Plan. Select a student, review the price/currency and choose **access start** separately from **payment due date**. Course invoices specify access days; membership invoices snapshot plan duration. Issuing an invoice does not create revenue or paid access.

After money has actually arrived by bank transfer, cash, cheque or another supported offline method, open that invoice and record the receipt with its real date and reference. Partial payment reduces the balance but does not grant new paid access. Full payment creates the applicable access term. Duplicate request keys/references are rejected or return the already-created record. Sensitive changes require your current password and a reason.

Memberships shows start, expiry, days remaining, original invoice due date and a separately issued renewal invoice's next due date. An expiry date is **not** an automatically assumed payment due date. “Non-renewing” is an operational flag, not a provider cancellation. Use a renewal invoice for another paid term. Audited date adjustments are available for corrections/complimentary extensions; they do not add revenue, create a renewal invoice, or charge the customer. Provider-linked memberships must be managed at their provider until live integration is implemented.

Record a refund only after the money has actually been returned offline. V45 writes a refund entry and an equal invoice credit; original gross receipts remain intact. Net collections decrease on the refund date. **This credit policy does not automatically create fresh debt for a refunded amount.** A separate explicit choice revokes access associated with the refunded invoice. There is no automatic bank/card refund.

Invoices can be voided only when no retained collection remains; dates can be corrected on open invoices. Reminder email requires a verified student address, an outstanding balance, SMTP and a twenty-four-hour per-invoice interval. Submission to a mail server is not proof of delivery. There is no background reminder scheduler.

Complimentary course grants/extensions are recorded separately from payments. Revoking a direct course enrollment does not necessarily remove access supplied by a separate active Academy membership. Global customer blocking denies the account itself.

## 7. Reporting and CMS

Reports show recognized gross collections, completed recorded refunds and net collections, with actual collection dates and a selected currency. **Net collections is not net profit or formal recognized accounting revenue.** Open and overdue invoice cards are current balances, not limited to the chart's date range. Different currencies are never added together. Missing/unverified historical values are shown as unknown/needs review, not invented.

Tables have search, filters, pagination and CSV export. Export limits are 5,000 rows; narrow the filters for larger datasets. Customer profiles show bounded recent history, with complete paginated sections available separately. Store downloaded CSV files securely because they contain personal/financial information.

Existing CMS remains: courses, named modules, lesson content/media, team, events, plans and review moderation. Footer/social settings remain Super Admin-only. Both panels use the shared CMS editors. No instructor account system was introduced. Removed Navigation/System/Resources sidebar items are not restored; legacy public routes are not claimed to have all been removed.

## 8. Local replica set — optional development alternative

Use this only on a local development computer with Docker available. It is an unauthenticated development database bound to localhost; **never expose it publicly**. Do not run it on port 27017 if another database already owns that port.

From the extracted project root, in Windows CMD:

```bat
docker compose -f dev/mongo-compose.yml up -d
docker compose -f dev/mongo-compose.yml exec mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
docker compose -f dev/mongo-compose.yml exec mongo mongosh --eval "rs.status().ok"
```

Wait until the replica set is ready. `rs.initiate` is a first-time action; do not reset an existing set. Configure backend:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/singh_academy_v45_staging?replicaSet=rs0&directConnection=true
```

The named Docker volume retains data. Do not use `down -v` casually. Existing Atlas is usually simpler for a staging copy; use the actual URI and credentials supplied for your database, not placeholder strings.

## 9. Owner-only admin recovery

Normal `seed:admins` preserves existing passwords and roles. To deliberately reset the passwords of the configured existing admin accounts to their corresponding `.env` values:

```bat
npm run seed:admins -- --reset-password
```

This invalidates their sessions but preserves MFA. It may affect both configured admin accounts; review both before running.

If an admin has lost the authenticator and every recovery code, a verified database owner can run:

```bat
npm run admin:recover -- --email YOUR_ADMIN_EMAIL --reset-mfa --confirm-owner-recovery
```

This is a privileged local CLI, not a public endpoint. Verify the person's identity first. It clears that admin's MFA, revokes sessions and audits the recovery; their password remains unchanged. With required MFA, they must enroll again before opening the workspace.

## 10. Verification and deployment gate

Run locally after a successful installation:

```bat
cd backend
npm test
cd ..\frontend
npm run typecheck
npm run build
cd ..
node scripts/check-source.cjs
```

The source checker requires the installed frontend TypeScript package and is only a syntax/local-import check. Then execute `V45-ACCEPTANCE-CHECKLIST.md` on a real staging replica set, separately as student, client admin and builder admin, including transaction rollback and duplicate concurrent requests.

**Actual checks in the delivered environment:** 249 backend unit/handler-stub tests passed; 58 frontend files parsed, 62 backend JavaScript files checked and 123 relative imports resolved; seven isolated setup-script checks passed. A static CSS fixture was checked at 360, 390, 768, 1024 and 1440 pixels without horizontal page overflow. That fixture is not the running application.

**Not verified here:** dependency installation, full TypeScript check, Next production build, real MongoDB aggregation/transactions, real SMTP delivery or application browser flows. npm registry DNS failed with EAI_AGAIN; build consequently stopped at `next: not found`. Logs are in `qa/`. Package versions were retained from V44, not independently certified as current/security-audited. Review successful install output, generated lockfiles and dependency audit before deployment.

For production use HTTPS, correct same-site app/API deployment, explicit origins, accurate proxy trust, secrets management, backups and access-limited logs. The selected SameSite=Lax cookie design expects same-site frontend/API; a completely different-site API is not supported merely by adding a CORS origin. Keep MFA and email verification enabled. The minimal CSP/header changes are not a substitute for a complete security review.

**Still not implemented:** live Stripe/PayPal checkout or verified webhooks, automatic recurring charges/provider refunds, accounting expenses/profit/tax invoices, background reminder jobs, bank reconciliation, production malware scanning/quota controls, persisted student assessments/automatic grading/certificates. Do not enable live online sales as though these flows are complete.
