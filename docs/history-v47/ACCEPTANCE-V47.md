# V47 staging acceptance — results to be recorded, NOT tests already passed

Use backed-up staging data and your own authorized sandbox accounts. Record operator, date, expected result, actual result and evidence for each gate. Never put credentials or complete customer data in public screenshots/logs.

## Build and dependencies
- [ ] Node 22+; both real lockfiles generated/reviewed; no blind `--force` upgrade.
- [ ] `npm run verify` fully passes, including installed Sharp 0.35.4 encoding, TypeScript, Next production build and backend/frontend production dependency audits.
- [ ] Review any remaining moderate/dev dependency advisories; the high-severity gate does not mean every advisory is absent.
- [ ] `migrate:v47` succeeds on a replica set; old records preserved and duplicate Subscription schema warning gone.
- [ ] No secrets, test identities or debug logs exposed in build/browser responses.

## Approved public appearance
- [ ] Compare `/`, `/home`, `/team`, course list/details, Academy plans and both login pages with the client-approved baseline at 320,390,768,1024,1440px.
- [ ] Team original photos remain in the old 4:3 frames, not full original pixel height.
- [ ] Home second photo shows the right-side receiving interaction at desktop and phone widths; no new photo substituted.
- [ ] USD uses `$` in public course/plan cards, checkout and course authoring; stored prices are unchanged.
- [ ] No unexpected overflow, logo/font/color/layout redesign, broken optimized image fallbacks or private media leakage.

## Authentication and privileges
- [ ] Student, Client Admin and Super Admin can coexist in the same browser with independent sessions; wrong portal/role cannot gain access.
- [ ] Production MFA/email verification required; false development flags do not erase already-enabled authenticator requirements.
- [ ] Expired/revoked sessions and blocked users are denied; fake portal headers cannot change roles.
- [ ] Super Admin cannot access customer finance or certificate approval/PDF routes; Student cannot use admin CMS.
- [ ] Password confirmation required for issuing/revoking certificates and sensitive existing business actions.

## Two payment providers — test each separately
- [ ] Correct credentials, merchant/environment/webhook ID/secret configured privately; disabled/incomplete method clearly unavailable.
- [ ] Purchase a course and fixed-term membership via actual Stripe test Checkout and actual PayPal sandbox approval/capture.
- [ ] Correct local server-authoritative price/currency/duration; client price tampering ignored/rejected.
- [ ] Exactly one paid invoice, verified receipt and correct access created. No manual admin approval step required.
- [ ] Provider amount/currency/customer/order/environment mismatch and pending/declined/cancelled payments grant no access.
- [ ] Duplicate success reloads and concurrent webhook/return confirmations are idempotent on real MongoDB.
- [ ] Complete payment then close the browser before returning; webhook still fulfills access (including PayPal APPROVED capture).
- [ ] Invalid/missing provider signatures rejected; account tokens and session IDs in URL alone cannot grant access.
- [ ] Other student cannot query/capture another local order.
- [ ] Test/sandbox transactions never appear as live collections; production ignores test entitlements.
- [ ] A new membership term starts/extends correctly at month-end; no unexpected automatic recurring charge.
- [ ] Independent duplicate course payments preserve existing access and create an operational review flag.
- [ ] Provider full/partial refund webhook mirrors accurate amount/credit history; full refund cancels only its linked access, partial refund preserves access.
- [ ] Provider dispute/reversal generates a review item; operator understands it is not automatic dispute settlement.
- [ ] Network interruption, webhook retry, capture-in-progress and delayed responses show recoverable status without asking the student to pay twice.

## Completion and certificates
- [ ] Partial/empty/changed required curriculum cannot issue a certificate; optional behavior understood.
- [ ] Final required lesson yields one pending completion and one Client Admin notification; repeated request does not duplicate it.
- [ ] Student course card says Waiting for certificate and survives reload.
- [ ] Client Admin reviews, confirms password/reason, issues and downloads the PDF; Student gets same stored PDF.
- [ ] PDF correct name/course/dates/serial/logo, readable and not clipped; display transliteration approved for unsupported scripts.
- [ ] Required curriculum changed before issue is rechecked; issue date/completion date not backdated.
- [ ] Foreign students and Super Admin cannot download PDF; random verification reveals only allowed certificate fields.
- [ ] Repeated issue returns same PDF/serial; revocation blocks download and verification says revoked.
- [ ] Older completed data dry run reviewed; --apply backfill creates pending only, not automatically issued certificates.
- [ ] Certificate creation is not described as passed assessment/accreditation proof.

## Existing operations and deployment
- [ ] Course/module/lesson/media/team/event/plan/review edits persist without changing original design.
- [ ] Business manual history, pending requests, invoice/refund views and CSV export remain correct; CSV distinguishes sandbox records.
- [ ] Real HTTP transaction suite and Playwright suite complete; tests use disposable `_test` database only.
- [ ] Real SMTP verification/reset arrives at owned mailbox; upload signature/scanner failures safely refuse content.
- [ ] HTTPS same-origin proxy, webhook body preservation, private service ports, health/readiness and request logging verified.
- [ ] Dependency/container/security review and capacity measurements completed on deployment-like conditions.
- [ ] Database+GridFS+certificate PDF backup restored in isolation; payment events reconciled before reopening writes after downtime.
- [ ] Owner-authorized controlled live transaction/refund verified before public sales; no test merchant keys in production.

A successful build/unit suite is necessary but not sufficient for these checks. Failed gates stay failed until corrected; do not disable the safety check to obtain a green status.
