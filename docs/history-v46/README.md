# Singh Academy V46
## Business operations, separate administration and deployment tooling

**Delivery status: source-code release candidate. Not a completed production deployment or an independent security certification.** The source includes the entire V45 website and administration foundation, V46 changes, optimized assets, tests and deployment configuration. No live credentials, database export, installed dependencies or compiled application are included.

Start with **[START-HERE-V46.md](START-HERE-V46.md)**. For a server release, follow **[DEPLOYMENT-V46.md](DEPLOYMENT-V46.md)** and complete **[ACCEPTANCE-V46.md](ACCEPTANCE-V46.md)** first. Historical V44/V45 reports under `docs/history-*` and `qa/history-*` are not V46 test results.

### The agreed business scope

Client Admin manages customers, enrollment requests, subscriptions, access dates, invoices, payment due dates, actual offline receipts, completed refund records, course access, reports, contact messages and the existing CMS. Super Admin remains a separate builder/content role and is denied the business/customer API. Students have a separate login, learning access and their own billing history. No instructor account role is introduced.

**There is no automatic card charge, recurring billing, live payment gateway or provider refund in this release.** A request or invoice does not create payment or paid access. An administrator records an actual receipt; full settlement grants the invoiced access in the same transaction. There is no simulated successful checkout.

### V46 changes

| Area | Change |
|---|---|
| Public website | Preserved branding/content; public home no longer logs out the student; removed misleading legacy resource routes; real contact and review submission handling |
| Manual enrollment | Student request queue, client invoice handoff, student-owned billing history; inactive/unpublished products rejected |
| Business workspace | Existing reporting/manual billing retained; enrollment requests and website messages added; shared CMS with paginated records and lazy-loaded editors |
| Security | Environment preflight, production MFA/email gates, nonce-based script CSP, request IDs, origin protections, upload signatures/scanning and bounded processing |
| Images | Hashed WebP variants, responsive `srcset`, dimensions, lazy loading and priority hero/logo handling; original uploaded source assets retained |
| Data/query work | Batched my-course queries, bounded CMS results, search debounce/cancellation, DB pool limits and additive indexes |
| Deployment | Same-origin HTTPS Caddy configuration, separate non-root app containers, private service ports, internal upload scanner, graceful shutdown and health checks |
| Verification | Local unit/protocol tests and source checks; authored real HTTP/Mongo and Playwright suites; fail-fast release gate and CI workflow |

### Verification at delivery

- **297 dependency-free unit/stub/local-protocol tests passed.** This includes the earlier 249 tests and additional V46 checks; local scanner tests use a TCP mock, not the ClamAV engine.
- **67 frontend TS/TSX files parsed, 79 backend JavaScript files checked, 148 relative frontend imports resolved.** Parsing is not a full TypeScript dependency check.
- Static HTML using delivered CSS had no document-level horizontal overflow at 320, 390, 768, 1024 and 1440 pixels. This is **not** a running Next/React application test; data tables intentionally scroll horizontally on narrow screens.
- npm registry DNS failed with `EAI_AGAIN`. The actual Next build attempt failed because `next` was not installed. Real dependency installation, lockfile resolution/audit, full typecheck/build, real MongoDB/HTTP tests, Playwright application tests, SMTP, Docker and live scanner validation remain **unverified**.

See **[qa/README.md](qa/README.md)** for logs and limitations. Do not announce a production launch on the basis of unit tests alone.

### Layout

```text
backend/              Express / MongoDB / authorization / manual business workflows
frontend/             Next.js / public website / student / admin interfaces
scripts/              setup, production configuration, verification and smoke checks
deploy/               Caddy and scanner configuration
compose.production.yml  production container topology (review before use)
dev/                  localhost-only development and isolated-test databases
qa/                   actual results, clearly labelled static fixtures and historical logs
docs/CLIENT-OPERATIONS.md  client-only operational instructions
```

The included client guide discusses only client business operations. Technical deployment/security documents describe privileged roles and must be kept with the implementation team.

### Remaining functional boundaries

Automatic assessment grading/persisted student answers, student assignment-file submission, certificates, accounting profit/expenses/taxes, bank reconciliation, automatic reminders and online payment processing are not completed by this release. Legacy curriculum multi-document editing/deletion is not fully transactional; concurrent editing and cleanup still need staging review. This release does not represent every possible LMS feature as complete.
