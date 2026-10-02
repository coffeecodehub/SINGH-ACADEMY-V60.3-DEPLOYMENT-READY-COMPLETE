# V46 staging acceptance — complete before release

**None of the unchecked items below represents a test already passed.** Record environment, tester, date, result and evidence for each group. Use a staging replica set and owned test accounts only. The real unit/source results are in `qa/README.md`.

## Build and services
- [ ] Resolve dependencies; review both lockfiles; run `npm run verify` without bypasses.
- [ ] Run the isolated native HTTP/Mongo suite and Playwright application suite; inspect failure traces.
- [ ] Build and start the supplied production containers on staging with HTTPS. Check certificate handling, readiness, restart and shutdown.
- [ ] Check scanner readiness/signature freshness, SMTP transport and actual verification/reset email delivery.
- [ ] Confirm only intended gateway/management ports are exposed and database permissions/allowlists are constrained.

## Account separation and security
- [ ] Create/login a student and confirm verification; admin email/password rejected by student login.
- [ ] Open both administrator portals in the same browser; sessions remain independent, wrong role/portal rejected.
- [ ] Complete MFA separately for both accounts; old code replay rejected; recovery code used once only.
- [ ] Before MFA completion, requests to business/CMS endpoints are denied even when manually changing the URL/header.
- [ ] Builder account may edit allowed content but cannot list/export customers, invoices, collections or contact messages.
- [ ] Student cannot call administrative endpoints, request another student's billing history or bypass paid-media entitlement.
- [ ] Reject disallowed origins, missing anti-CSRF markers, invalid scalar queries and oversized requests. Inspect secure cookie/CSP headers.
- [ ] Logout, password reset/change, customer blocking and explicit session revoke invalidate relevant sessions.
- [ ] No passwords, reset links, setup secrets, session tokens or complete customer data appear in production logs/errors.

## Manual business workflow
- [ ] Verified student requests a published course or active plan; duplicate active requests are handled safely. No payment/access created.
- [ ] Client Admin converts a matching request into an invoice; quote, currency, due date and access term are reviewed; request linked once.
- [ ] Partial actual receipt reduces balance without new paid access; full settlement grants the correct course or membership.
- [ ] Concurrent duplicate receipt/idempotency keys do not double-count money or access; same key with a different payload fails.
- [ ] Force a transaction failure in staging and verify invoice, receipt, access and audit roll back together.
- [ ] Record a completed partial/full offline refund; refund limit respected, matching credit applied, optional linked access revocation explicit.
- [ ] Overpayment, excessive refund, unauthorized ownership changes and invalid dates/currencies are rejected.
- [ ] Subscription start/expiry, remaining days and actual invoice due date display correctly. Expiry alone does not create debt.
- [ ] Renewal invoice and audited complimentary extension remain distinct; no automatic customer charge occurs.
- [ ] Gross collections/refunds/net, unpaid/partial/overdue balances and product/customer histories reconcile with known records in one currency.
- [ ] Student My Billing contains only their own records and handles empty, loading and error states.
- [ ] CSV exports apply the selected filters, protect formula-like values and contain no secret fields; storage is private.

## CMS, communications and uploads
- [ ] Course → named modules → lessons: save, reload, order, duplicate, draft/publish, safely delete/unpublish; verify public/student visibility.
- [ ] Review concurrent/interrupted curriculum edits on staging; verify no orphan or lost child records before multi-editor production use.
- [ ] Team/events/plans/reviews list filtering and pagination works. Published updates appear on public pages without demo fallback records reappearing.
- [ ] Submit an actual student review: stays pending until approved; not presented to the student as already publicly published.
- [ ] Contact form reaches the client message queue, correctly displays errors, and status changes persist; status change does not pretend to send a reply.
- [ ] Upload valid image/video/document; scan finishes before storage/publication. Spoofed MIME, invalid signature, oversized/unsupported/aborted upload rejected.
- [ ] Use an approved scanner test sample in isolated staging; positive scan blocks storage, scanner offline fails closed. Do not test malware on production.
- [ ] Exercise long/large files and connection cancellation; inspect temporary files, concurrency slots, memory and disk use.
- [ ] Image preview/replace/remove works; protected PDF/video unauthorized access denied; range seeking and HEAD responses work.
- [ ] Review old GridFS scan metadata; define retention/orphan cleanup; backups include both media collections.

## UX, performance and recovery
- [ ] Run actual application on 320/390/768/1024/1440 layouts, desktop keyboard, mobile touch and representative browsers.
- [ ] Login/MFA/forms/dialogs have usable focus, labels, errors and loading/retry states; no inaccessible off-screen actions.
- [ ] Verify public home does not log out a signed-in student; old removed resources return 404; no internal administration link in public navigation.
- [ ] Check optimized images at real display sizes; no stretching/cropping regression or lost alt text; lazy images load on scroll.
- [ ] Inspect CSP console and strict-dynamic behavior with real Next scripts, external video frames and uploaded media.
- [ ] Measure LCP, INP and CLS plus API p50/p95 and error rates under agreed data/concurrency. Do not claim 0.05 ms universal loads or invented scores.
- [ ] Restore a backup to an isolated environment and verify accounts, MFA decryptability, invoices, access and media.
- [ ] Rehearse release rollback and record operational owners for monitoring, backups, patching, mail and scanning.

## Approval record

Environment/hostname: ____________________

Tester and approver: ____________________

Evidence location and unresolved issues: ____________________

Release decision: HOLD / APPROVE after recorded acceptance
