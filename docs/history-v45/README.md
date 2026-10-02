# Singh Academy — V45 secure business workspace

Start with **[START-HERE-V45.md](START-HERE-V45.md)**. This source update builds on V44; it is not a compiled deployment.

## Project

- `frontend/`: Next.js website, student portal, Client Admin business workspace and builder Super Admin CMS.
- `backend/`: Express/Mongoose API, portal-bound sessions/MFA, operational ledger, transactional billing actions and existing LMS/CMS.
- `dev/mongo-compose.yml`: optional localhost-only development replica set.
- `qa/`: actual V45 logs and explicitly labelled static layout fixture; `history-v44/` is historical.
- `docs/history/`: preserved prior release notes, not current setup instructions.

**Read:** [Business/security review](V45-SECURITY-BUSINESS-ANALYSIS.md) and [required staging acceptance checklist](V45-ACCEPTANCE-CHECKLIST.md).

**Actual checks:** 249 dependency-free unit/handler tests passed; source parsing/local imports passed. Full dependency installation, Next build, real MongoDB/browser/SMTP workflows were not verified here because npm DNS resolution failed. Do not interpret a static layout fixture or mocked test as a deployed application.

**Business boundary:** audited offline receipts/refunds, customer management, memberships, invoices/dues and reports. Live Stripe/PayPal charging/webhooks, provider refunds, full accounting, background reminders, persisted assessment grading and certificates are not complete.

Keep existing data and secrets backed up. Required admin MFA onboarding is enabled in new setup defaults. Sensitive business changes require Atlas/a replica set. Do not commit .env, share recovery codes or enable live sales before staging acceptance.
