# Singh Academy V50 — implementation and QA report

**Date:** 29 September 2026. **Base:** original V48 ZIP. **Delivery:** source implementation with local tests and explicit remaining gates; not an already deployed, security-certified or fully integration-tested application.

## 1. Actual completed checks

| Check | Actual outcome | What this establishes / does not establish |
|---|---|---|
| Backend tests | **643 passed; 0 failed; 0 skipped** | Pure utilities, injected model/route/service stubs and local protocol tests. Not real MongoDB, SMTP or provider transactions. |
| Frontend source parsing | **85 TS/TSX files** | Syntax, not a successful installed dependency typecheck. |
| Backend syntax | **130 JavaScript files** | Syntax, not live model/driver compatibility. |
| Relative frontend imports | **214 resolved; 0 source/import errors** | Local source-file paths, not npm package resolution. |
| Protected public preservation | **257 files; 0 differences** | 252 original public assets + five protected V48 public layout/style files are byte-identical. Not every dynamic route or screenshot. |
| Isolated layout fixtures | **40 checks: eight layouts × 320/390/768/1024/1440 px** | Actual delivered component markup/CSS using mocked hooks and synthetic records, inspected in Chromium; no document-level horizontal overflow. Not a running React/Next application. Wide data tables scroll within their containers. |
| Native canvas execution | **68 checks** | The delivered drawCrop function runs in Chromium: rotation, flips, ratio/pan/zoom bounds, brightness and JPEG output. Not a full photo-upload/React-interaction test. |
| Contextual error geometry | Password description linked; error adjacent to input | Static certificate-modal fixture, not real login/password HTTP exercise. |
| Native PDF generation | One-page sample certificate, long-title certificate and payment receipt rendered/inspected | Valid local artifact structure, original logo/watermark/gradient and readable layout. Not a real student's issued credential. |

Final logs: qa/v50/backend-tests.log, source-check.log, public-preservation.log, browser-fixtures.json, browser-check.log and certificate-generation.log. Early failed/intermediate test logs are retained for transparency but are not the final test result. Historical QA folders describe older versions.

## 2. Attempts that did not pass

Dependency installation was attempted with a bounded, zero-retry npm request and failed with **EAI_AGAIN** resolving registry.npmjs.org for bcryptjs. The actual npm log is qa/v50/dependency-install.log. No dependency lockfile or successful audit result was fabricated.

Full frontend typecheck was attempted: it failed because installed React/Next/dependency declarations were absent, causing cascading JSX/type diagnostics. Its complete output is qa/v50/frontend-typecheck.log. A source parse is not substituted for a passing typecheck. The production build failed at **next: not found**, logged in frontend-build.log.

npm run verify was attempted and deliberately stopped at **missing backend/package-lock.json**. The fail-fast gate has not been weakened. The real database/HTTP integration suite was attempted and stopped before execution because **TEST_MONGODB_URI for a dedicated test replica set was not configured**. It did not touch the user's database. Logs: verify-attempt.log and integration-attempt.log.

No successful running Next/React browser flows, live MongoDB transaction/locking/concurrency, real mail delivery, actual ClamAV scan, Stripe/PayPal sandbox purchase, production Docker startup, load benchmark or backup restore is claimed.

## 3. Security and correctness changes

Client Admin gets an explicitly limited subscription-read API and plan editing; the retired business router remains unmounted. Super Admin cannot use a different portal header to read private student billing, notifications or submissions. Public team responses omit the uncropped editing source and edit metadata.

Student notification rows are owner-scoped. Confirmation queues inside verified membership fulfillment; expiry rows use a stable dedupe key and updated expiry window. Atomic leases coordinate email attempts. Missing verified addresses, blocked users, cancelled terms, sandbox data and superseded renewals are handled explicitly. External email is at-least-once on uncertain failures; it is not a delivery guarantee.

Receipt screenshots are owner/payment-bound, quota-limited and use the existing signature/scanner/normalization pipeline. The registration step rechecks ownership and status transactionally. Private media checks precede generic CMS image permission. Upload failures attempt to clean up their orphan file; interrupted cleanup is not atomic with GridFS. Screenshot actions cannot change payment or access records.

The certificate decision continues to require manual review and current password. Only error placement was changed in the frontend. The new PDF generator uses local validated content and embedded assets, no external image fetch, executable form or fake personal signature. Existing issued PDFs remain historical.

No new npm dependency or dependency-version upgrade was introduced by V50. This does **not** establish that the inherited dependency graph is vulnerability-free: resolve it, review the generated locks and run the current audits locally.

## 4. Reproducing local checks

From the project root after installation:

```powershell
npm --prefix backend test
npm --prefix backend run test:images
npm --prefix backend run test:certificate
npm --prefix frontend run typecheck
npm --prefix frontend run build
node scripts/check-source.cjs
npm run check:ui
npm run verify
```

For isolated layout/canvas reproduction, install Python Playwright and use an available Chromium executable. The fixture renderer needs TypeScript from frontend/node_modules/typescript or TYPESCRIPT_PATH. Run from the root:

```sh
node qa/v50/render-fixtures.cjs
CHROMIUM_PATH=/path/to/chromium python qa/v50/browser-check.py
```

These fixture scripts intentionally mock hooks/data and must not be reported as end-to-end application tests. Dedicated database integration uses TEST_MONGODB_URI with the safety constraints in backend/integration/isolation.js; never point it at the production database.

## 5. Residual limits / deployment gate

Run ACCEPTANCE-V50.md on a production-like staging replica set. Confirm actual indexes, duplicate concurrent requests, permission denials, upload scanning, invoice balances, long names/titles, photo export and full-page accessibility. Test restart/Try Again without losing historical work. Check SMTP with a verified test student and controlled expiry dates, including restart/catch-up and duplicate-worker cases.

The backend must remain running for its 15-minute reminder cycle. Monitor failed/deferred outbox rows, logs, disk/GridFS storage and mail-provider delivery. No SMS/push integration, automatic recurring payment, net-profit accounting, real-time performance SLA or unlimited capacity is added. Upload orphan retention and some legacy multi-document CMS edits remain non-atomic. Broad same-origin script compromise and compromised server/database operators remain outside application role separation.

Measure performance on the actual deployed build and network. Parallel bounded queries, debounced lists and lazy image editing reduce avoidable work; no measured 0.05 ms image/page response, speed percentage or uptime claim is made.
