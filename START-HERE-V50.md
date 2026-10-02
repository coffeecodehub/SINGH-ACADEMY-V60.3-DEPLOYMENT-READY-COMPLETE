# Singh Academy V50 — setup and upgrade

## 1. Keep the existing installation safe

Extract the ZIP into a separate **singh-academy-v50** folder. Back up the existing source, environment files, MongoDB database, and GridFS files/chunks. Copy your existing **backend/.env** into the new backend folder before setup. Preserve **AUTH_SECRET**, **MFA_ENCRYPTION_KEY**, database URI, merchant credentials and webhook secrets. Do not copy node_modules, .next or compiler caches.

Use Node.js 22 or newer as specified by these package manifests. Use MongoDB Atlas or a replica set: payment settlement, answer submission, course restart and screenshot attachment writes use transactions. A standalone database is not an equivalent substitute.

Open the extracted root in VS Code. These commands work in Windows PowerShell; run them **one at a time**:

```powershell
node -v
npm -v
npm run setup
notepad backend\.env
```

Setup creates missing configuration and preserves existing non-placeholder values. It does not reset accounts stored in MongoDB. Do not share your environment file or its backups.

For local development, the previously selected settings may remain:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3001
PUBLIC_API_URL=http://localhost:5000/api
REQUIRE_ADMIN_MFA=false
REQUIRE_EMAIL_VERIFICATION=false
STUDENT_NOTIFICATIONS_ENABLED=true
```

Disabling the requirement does not disable an authenticator already enrolled on an account. Production still requires MFA, verified email, HTTPS, SMTP and upload scanning. Do not set a public deployment to development simply to bypass those checks.

The frontend file **frontend/.env.local** should contain the correct API address:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Keep database, authentication and payment secrets out of frontend variables.

## 2. Install, migrate and check

From the root:

```powershell
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v50
npm run verify
```

Migration checks required indexes, including StudentNotification and PaymentAttachment, and retains existing accounts, courses, invoices, payments, term dates, submitted answers, course progress and issued certificate PDFs. It does not generate retrospective congratulations, fake receipts or certificates. Some additive steps may finish before an index error; inspect duplicates and safely rerun after reconciliation. Do not drop collections to silence an error.

Normal upgrades do **not** need seeds. Only for genuinely missing admin accounts:

```powershell
npm --prefix backend run seed:admins
```

For a deliberately fresh demonstration database, the existing optional seed:data and seed:courses commands remain. They are not a login repair, migration or mandatory startup step.

A successful dependency installation produces genuine backend/package-lock.json and frontend/package-lock.json. Review and keep them. The installer uses npm ci once a lock exists. Verification deliberately refuses missing locks, then runs backend tests, image processing, sample certificate generation, full frontend typecheck/build, source checks and high-severity production audits. Never use npm audit fix --force or suppress the audit just to make the gate appear green.

If npm asks for install-script approval, review the specific named package/version under your local npm policy. Image functionality must pass:

```powershell
npm --prefix backend run test:images
```

## 3. Start both processes

First terminal, from root:

```powershell
npm run dev:backend
```

Second terminal, from root:

```powershell
npm run dev:frontend
```

```text
Website:       http://localhost:3000
Student login: http://localhost:3000/login
Client Admin:  http://localhost:3000/admin/login
Super Admin:   http://localhost:3000/super-admin/login
My Billing:    http://localhost:3000/billing
Certificates:  http://localhost:3000/certificates
API health:   http://localhost:5000/api/health
```

Only one backend may own its configured port. On EADDRINUSE, close the previous backend terminal after identifying it. Do not kill every Node process or change the database. If the frontend moves to another port, include that origin in backend FRONTEND_URLS and restart the processes.

## 4. Student notifications

The backend starts the notification worker after its HTTP listener opens. With STUDENT_NOTIFICATIONS_ENABLED=true (default), it checks immediately and approximately every 15 minutes. Keep that backend running; this is not an external scheduling service.

Run one explicit cycle from the root when testing:

```powershell
npm --prefix backend run notifications:run
```

A new verified membership purchase immediately queues an in-app congratulations message. The worker queues a reminder when the active term has seven days or less remaining and no subsequent active term already covers its expiry. It does not charge the student or create debt.

Real email needs the existing SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and EMAIL_FROM settings and a **verified student email address**. Unverified addresses are deferred even when development login verification is optional. They still receive their own in-app notification. Sandbox purchases do not send real notification emails. Without SMTP, development messages are console previews, not delivered emails.

Test SMTP configuration without claiming inbox delivery:

```powershell
npm --prefix backend run mail:verify
```

If the worker was offline, it catches up only for still-active terms within the reminder window. SMTP acceptance is not proof of inbox delivery. See WORKFLOW-V50.md for retries, duplicate protection and operational limits.

## 5. Test the requested changes before handover

Use a separate staging account/database. Edit a team member, upload a photo, crop/rotate/adjust it, apply and save the member. Reload and re-edit the retained uncropped source. Verify both public Team presentations without changing their card layout.

Check Client Admin Overview, Subscriptions and editable Academy Plans. Submit learner answers, reload them, complete the course, enter a deliberately wrong certificate password and confirm the error stays beside the controls. Then approve and download a newly issued PDF. Historical PDFs should remain unchanged.

In student My Billing, verify the three sections, actual plan/paid/due dates, blue elapsed-term ring, own notification inbox, PDF receipt and private screenshot attachments. A screenshot must not grant access or change payment status. Test a second student and Super Admin against those private files.

## 6. What this package actually passed here

Backend unit/stub tests and source checks passed. Isolated HTML layout and real native-canvas checks passed. These do not replace the running application. Full dependency installation failed on registry DNS (EAI_AGAIN); full Next build, installed typecheck and audit remain unverified. Real integration tests stopped at the missing dedicated TEST_MONGODB_URI prerequisite.

Follow ACCEPTANCE-V50.md and retain the actual results before production deployment. The QA report documents these limitations rather than assuming a passing result.
