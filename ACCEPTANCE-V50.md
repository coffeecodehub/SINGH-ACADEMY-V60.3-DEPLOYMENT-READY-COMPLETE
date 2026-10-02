# V50 staging acceptance — tests to perform, not previously passed results

Use a backed-up staging replica set, verified test email and sandbox merchant accounts. Record actual results, screenshots and failures. Do not complete this checklist merely because a source/unit test passed.

## Build, data and permissions

- Install successfully; retain reviewed lockfiles; pass npm run verify, both dependency audits and installed Sharp image checks. Run dedicated database/HTTP integration tests with TEST_MONGODB_URI, never production MONGODB_URI.
- Back up and run migrate:v50. Confirm users, role values, course progress, attempts, invoice/payment amounts, dates and existing certificate PDF hashes are unchanged. Verify the unique notification and attachment indexes exist.
- Sign in separately as Student, Client Admin and Super Admin. Verify student cannot access either admin workspace. Client can edit plans but cannot edit social/reviews/website; Super cannot read private subscriptions/answers/notifications/receipt screenshots. Confirm the retired /api/business routes are not mounted.

## Overview and subscription register

- Verify each count against known fixtures, including test/sandbox terms, active/scheduled/expired/cancelled access, drafts and empty states. Active term count must not be described as a unique student total.
- Test search, status/plan/entry-date filters, zero results, pagination and the truncated-account-search warning. Confirm linked paid date is not fabricated from creation or expiry. Test refresh errors without clearing valid displayed data.
- Save plan changes from both allowed roles. Existing invoices/terms must keep their original price/dates; subsequent checkout should show the current active plan price.

## Team editor

- Upload supported real images, including rotated EXIF photos, portrait/landscape, a GIF and large originals. Test crop ratios, zoom, touch/mouse drag, precise pan, rotation, flips, brightness/contrast/reset and keyboard focus.
- Apply then Save member; reload. Edit again from the retained uncropped source. Cancel/failed upload must not publish an unsaved crop. Verify 4:3 public cards and existing landing images/layout, plus empty/hidden Team behavior.
- Reject unsupported signatures, excessive size/pixels and malicious files. Test unavailable external CORS images with the upload fallback. Confirm no unauthenticated access to private editor source files.

## Learner and certificates

- Save draft answers and reload. Check dirty, saving, saved, upload-busy, disabled, hover, focus and error states. Complete required lessons only after evidence exists.
- Open a long certificate review. With incorrect password, missing note or an API rejection, confirm the error remains beside the password and action controls, scrolls locally into view and is screen-reader-associated. A wrong password must not log out an otherwise valid admin session.
- Approve a completed attempt; inspect the new logo/watermark/brown gradient and large title at normal, long and accented Latin names/titles. Verify private download and public verification/revocation still work. Confirm an old stored certificate is not regenerated.
- Test Try Again concurrently/repeatedly: only this student's course resets, prior attempts remain, another course and subscription expiry do not change.

## Purchase, notifications and renewals

- Complete actual Stripe and PayPal sandbox purchases and verify return/webhook duplicates do not double-settle or double-queue congratulations. Test pending/cancelled/failed/cross-user/incorrect-amount cases. Sandbox notification emails must not reach real recipients.
- On staging use a verified student and controlled live-like stored term fixtures to test the email worker without charging a customer. Run notifications:run; verify one private reminder row in the last seven days. Test a covering renewal, cancelled/blocked account, corrected expiry, already-expired term, unverified email and malformed dates.
- Run two worker instances and duplicate cycles; verify one notification row and exclusive delivery claims. Simulate SMTP rejection, timeout, abandoned lease, backoff and final failure. External send uncertainty may duplicate email; verify monitoring rather than claiming exactly-once delivery.
- Confirm a running worker checks at startup/15-minute intervals and catch-up wording reflects actual remaining days. Verify real inbox/spam delivery separately from SMTP acceptance. Never infer successful delivery from the console preview.

## My Billing and receipts

- Confirm only Plans/subscriptions, Invoices/dues and Payment receipts tabs. Underlying refund/credit history must still reconcile after the Refunds tab is hidden.
- Verify entry, paid, start, expiry, partial paid amount and outstanding balances. The next due date must come from an issued open renewal invoice, not be invented from expiry. Re-subscribe must retain existing ownership/provider checks; covering scheduled terms should be indicated.
- Test blue ring at not-started, midway, one-day, expired, cancelled and unknown-date states; refresh after a date boundary.
- Attach genuine test screenshots to own paid receipts; reload, preview, delete and download the system PDF. Verify per-payment/account limits, simultaneous quota attempts, malicious media, wrong payment owner and private direct-media access. Uploading/deleting a screenshot must never change money or course access.

## Release operations

- Inspect responsive/keyboard/screen-reader behavior at 320–1920 px in the actual running app. Test browser Back, expired session, network interruption and stale data.
- Verify actual Docker/HTTPS/proxy setup, SMTP, ClamAV, storage limits, logs and backup restoration. Monitor queries against realistic account/term history sizes. Keep a reviewed rollback plan and test provider-event recovery before public launch.
