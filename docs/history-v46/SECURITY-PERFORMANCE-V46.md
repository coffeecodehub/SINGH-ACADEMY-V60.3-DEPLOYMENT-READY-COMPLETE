# V46 security, performance and implementation review

## Status and scope

This report describes source changes and checks actually performed on the supplied V45 project. It is not an independent audit, completed deployment or guarantee that every route is secure or fast. All online billing automation remains outside the agreed release. Existing website identity/assets and both administrative workspaces are retained.

## Material changes and source locations

| Area | Implementation |
|---|---|
| Configuration | `backend/src/utils/deployment.js`, `scripts/setup.mjs`, `scripts/prepare-production.mjs`: strong/stable key handling, exact origins, production MFA/mail/scanner gates, raw Compose secret values |
| HTTP | `app.js`, `httpSafety.js`, `server.js`: bounded request/query handling, request IDs, errors without sensitive payload logs, private cache controls, readiness and shutdown |
| Authentication | V45 portal-bound opaque server sessions, student-only signup/reset, encrypted TOTP and revocation retained; the public landing page no longer signs students out |
| Frontend CSP | `frontend/middleware.ts` uses a fresh script nonce and strict-dynamic; document HTML remains dynamic/private. Existing inline styles are still allowed |
| Uploads | `services/uploads.js`, `uploadScan.js`, `utils/fileSignature.js`: private temp files, MIME/magic validation, ClamAV INSTREAM, disconnect/timeout handling, per-process concurrency limits and image re-encoding |
| Media | GridFS entitlement checks and byte ranges retained; private responses not shared-cached. Automatic destructive cleanup disabled to avoid shared-reference races |
| Requests/billing | `PurchaseRequest`, payment routes, business routes and UI: student-owned request/history, deduplicated request and client invoice handoff; no fake successful charge |
| Contacts/reviews | Durable contact queue, client message states, real pending review submission; frontend no longer represents a pending submission as a published review |
| Query/UX work | Batched enrolled-course queries; paginated CMS collection APIs, filtered/debounced frontend lists; lazy-loaded administrative editors |
| Assets | `AcademyImage.tsx`, generated image manifest and `public/optimized`: responsive hashed variants, dimensions, lazy loading and selected priority images |
| Operations | Docker/Caddy/scanner topology, preflight/migration/mail/media commands, isolated integration harness, Playwright suite and CI gate |

## Roles and data boundaries

Student, Client Admin and Super Admin are distinct accounts with separate session cookies and role-specific login endpoints. A portal header chooses which session to inspect, not a privilege to grant. Application-level builder access is denied business data, not merely hidden in a sidebar. Both administrator accounts must enroll MFA for production use.

Session cookies retain the `v45` suffix intentionally for compatibility. Old pre-V45 shared JWT sessions are not accepted. All frontend JavaScript on the same origin still shares one trust boundary: an independent XSS and authorization review remains important. Separate cookies do not make this a sandbox between mutually untrusted websites or protect against a malicious database/server owner.

Financial creates/changes use MongoDB transactions and idempotency protections. This does **not** make inherited multi-document CMS editing/deletion transactional. Concurrent editorial operations and database rollback need staging validation. MFA recovery, manual receipts/refunds, exports and customer blocking must be operated by authorized people.

## Dependency review

Manifests now pin Next.js 15.5.24, Multer 2.4.0 and Nodemailer 10.0.10; Express is 5.2.1. These choices were informed by official project release/advisory material rather than claiming the old packages were automatically safe. React/React DOM remain 19.1.5; remaining dependency ranges must be resolved and audited on a working network. This is **not a claim that all dependencies are the newest or vulnerability-free**.

Relevant primary references reviewed for this release:

- Next.js Windows-server remote-code-execution advisory GHSA-p293-qw3h-jr36 identifies 15.5.24 as a patched version: https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
- Next.js AVIF optimizer advisory GHSA-2xp9-vwfh-vxw4: https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
- Multer orphaned writes on aborted uploads, fixed 2.4.0: https://github.com/expressjs/multer/security/advisories/GHSA-3pph-fpjx-jg34
- Nodemailer maintained security advisories: https://github.com/nodemailer/nodemailer/security/advisories
- Nodemailer pinned release manifest: https://raw.githubusercontent.com/nodemailer/nodemailer/v10.0.10/package.json
- OWASP upload guidance: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- Next.js nonce/CSP behavior: https://nextjs.org/docs/app/guides/content-security-policy

Registry DNS was unavailable during delivery. No production lockfile resolution, `npm audit`, full dependency typecheck or build succeeded here. Review and commit actual lockfiles after installation; CI/Docker demand them. Additional advisories can appear after this review.

## Measured asset work — not a loading-time claim

The asset optimizer ran using Sharp. The manifest includes **74 local paths representing 46 unique source images**. The unique original images total **26,418,410 bytes**. Choosing approximately 480-pixel WebP variants for those images totals **553,058 bytes**, a **97.91% reduction in this particular size comparison**.

This compares original source files with smaller responsive display variants. It is not a same-resolution codec benchmark, the total size of a page, measured network savings for every user, or a 97.91% page-load improvement. Larger screens select larger variants. Originals remain available and unchanged; the generated variants and manifest are additional files. See `qa/v46-image-sizes.json` for the actual output.

The enrolled-course handler batches database reads rather than doing multiple queries for each individual course. CMS paging and dynamic editor loading reduce unnecessary work, but query latency and JavaScript bundle timings were not measured against a running production application. Public catalogs and some historical business reports still need realistic large-data load tests. No synthetic Lighthouse score is supplied.

## Performance acceptance targets

A universal **0.05 millisecond** page or image loading guarantee is not a practical delivery promise. Asset transfers, backend work, browser rendering, hardware, distance and network conditions must all be measured in the deployed system. Compression and caching cannot remove every one of those costs.

Use real mobile and desktop performance measurements. Proposed targets follow web.dev's good Core Web Vitals thresholds at the 75th percentile: **LCP ≤ 2.5 seconds, INP ≤ 200 ms and CLS ≤ 0.1**. These are **targets, not achieved results for this project**. Source: https://web.dev/articles/vitals

Measure page transfer sizes, request counts, TTFB, p50/p95 API latency and concurrency/error rates on an agreed test workload. `Server-Timing` reports application duration for JSON responses; the smoke script reports only its own network sample. Neither is equivalent to an end user's complete loading experience. Authenticated HTML/data stays private rather than being shared-cached to obtain misleadingly fast timings.

## Verification actually executed

**297 passed, 0 failed** dependency-free unit/stub/local-protocol tests. A local TCP mock exercises scanner framing/clean/found/error/abort behavior; it is not an actual ClamAV virus-detection test. Setup tests use temporary directories and randomized values, not the user's database or credentials.

Source checks parsed **67 frontend TS/TSX files**, checked **79 backend JS files**, and resolved **148 relative frontend imports** with no syntax/import error. Additional `.mjs` orchestration scripts pass `node --check`. These checks do not resolve actual npm API/type compatibility.

A static fixture using shipped CSS was rendered in Chromium at **320, 390, 768, 1024 and 1440 pixels**, with no document-level horizontal overflow. Tables are scroll containers on small screens. Screenshots clearly label the fixture; it is not the running application or a complete accessibility review.

The Next build was attempted and failed with `next: not found` after npm DNS failed with `EAI_AGAIN`. The release gate correctly stops at missing real lockfiles. Real HTTP/Mongo transaction tests and Playwright application tests were authored but not executed. SMTP delivery, Docker/Caddy, actual ClamAV, full application responsiveness, backup restore and production load tests remain required.

## Remaining risks and boundaries

Old uploaded media is not retroactively scanned. No automatic orphan collection/storage quota manager is supplied; removed references do not immediately delete GridFS files. External linked video/document hosts are outside this backend's protection. Scanning is not a guarantee that a complex document is harmless. Public contact honeypot/rate limits mitigate but do not eliminate spam or denial of service.

Legacy CMS multi-document deletions and audit finish hooks remain non-atomic; manual workflows need interruption/concurrency checks. Financial concurrency has dedicated test code but still needs real Mongo execution. Existing editorial statistics/testimonials and legacy financial verification need owner review, not invented validation. Session/security deployment configuration, dependency reviews, signature updates and off-host backups need ongoing maintenance.

No live checkout, automatic recurring billing/refunds, persisted graded assessment submissions, student assignment uploads, certificate issuance, expenses/profit/tax accounting, bank reconciliation or scheduled renewal-reminder service is included. Manual course invoice pricing/access terms must be confirmed by the administrator; a request quote is not a charged amount. Any new automation requires separate implementation and acceptance.
