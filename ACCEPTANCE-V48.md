# V48 acceptance gate — tests still required on staging

This is a checklist of required future checks, **not a claim that they have passed**. Unit/stub and static-layout results are recorded separately in SECURITY-QA-V48.md. Use a backed-up staging replica set and authorized test accounts.

## Installation and security

- Install dependencies, inspect actual lockfiles, approve only reviewed required install scripts, and pass `npm run verify` including image processing, PDF output, typecheck/build and both production dependency audits. Do not hide errors with `--force`.
- Run the additive V48 migration. Confirm existing accounts, stable authenticator keys, courses, memberships, payment histories and issued certificates are preserved. Test rollback by restoring a backup into isolation.
- Use Student, Client Admin and Super Admin in the same browser. Confirm portal/login separation, stale session rejection, logout, enrolled MFA, recovery and production configuration requirements.
- Directly call the old `/api/business` paths: no business endpoint is exposed. Client Admin must receive denial for Reviews/Plans/Social/Website Content settings. Super Admin must not read student assessments, private student files or approve certificates. Public/other-student requests must not read private work or billing.

## Public UI and CMS

- Compare V47 and V48 on desktop/tablet/mobile, with unchanged database settings, including landing, signed-in home, team images/crops, course cards/prices, navbar and footer. Review both loading and data-loaded states.
- Test Courses/Team/Events CRUD in both panels. Test Reviews, Academy Plans, Footer/Social and registered text/image overrides only as Super Admin. Verify image upload/replace/remove/restore and empty fields.
- Open Website Content in two sessions, save once, and confirm the stale revision cannot overwrite it. Check escaped text, URL validation and original fallback restoration. No arbitrary HTML, layout or navigation code should be executed.

## Learning and manual review

- In staging, configure each question type, assignment instructions, a reflection and a file question. Test required/optional lessons, sequential modules, an empty course and question-count/answer-length limits.
- Save a draft, reload and sign in from another browser. Answers must be persisted. Simultaneous saves with the same revision must not silently overwrite. A question edit must require reload/current-version submission.
- Upload a clean PDF/DOCX and supported image. Test sizes, invalid signatures, scanner failures, cancelled upload and another student's/another attempt's file IDs. Test owner/Admin access and Super Admin denial. Test with the real configured antivirus engine, not just the local protocol stub.
- Complete a required lesson with an unanswered required question: reject. Finish all required work: one pending record and one completion notification per attempt. The submitted attempt becomes read-only and Waiting for certificate appears.
- Admin review must show exact submitted responses, question/rubric snapshots and attachment links. Wrong password, missing acknowledgement, stale attempt and incomplete current evidence must block issuance.
- Try Again must preserve old answers/feedback and reset only that student/course's Progress. Repeated or concurrent requests must not reset a new attempt twice. Another course/student, payment or subscription must remain unchanged. A stale student tab must reload rather than submit to the old attempt.
- Complete attempt 2, review both attempts, issue and download the PDF. Check permanent serial/hash, student spelling, layout, private ownership and public minimal verification. Revocation must keep history and prevent future download; old downloaded copies remain outside system control.
- Test old issued/pending/backfilled records. Do not invent pre-V48 answers; use a retry when required evidence is absent. Review completed students whose subscription subsequently expired.

## Billing and direct payment

- My Billing must show only the signed-in student's records. Verify all recorded dates against the database. Missing dates/status must not show fake active periods or invented paid dates. Invoice ID tampering must reveal no other account record.
- Check active, scheduled, expired, cancelled, past-due, unknown and missing-date terms. Validate circle/day boundaries around UTC expiry, leap years and month ends. Check one-minute refresh and mobile layout.
- Re-subscribe to a current plan with both providers. Confirm current price, owner-bound prior term and the correct next access period after **verified** payment. A disabled/renamed plan must route to available plans. A browser success flag, pending/failed transaction, wrong currency or replay must not create access.
- Run real Stripe test and PayPal sandbox transactions, closing the browser before returning and replaying webhooks. Confirm one receipt/invoice/access fulfillment and renewal snapshot. HTTP tests use normalized payment evidence and are not actual merchant payments.

## Deployment operations

Pass real SMTP delivery, ClamAV, HTTPS/proxy origins/cookies, controlled upload capacity, database indexes/transactions, relevant browser interaction and backup restore. Review logs for secret/private-data exposure. Complete load/performance measurements on the actual host; no universal loading-time or perfect-security guarantee is made.
