# V45 — real staging acceptance checklist

**Unchecked items below are requirements, not passed results.** Use a separate staging replica set, reviewed dependencies, non-production payment examples and test accounts. Never use real money for a test refund/charge.

## Install, backup and compatibility

- [ ] Back up source, .env/MFA key, database and GridFS; prove backup restoration in staging.
- [ ] Install dependencies; review versions/audit and commit reviewed lockfiles. Run backend tests, frontend typecheck and Next build without hiding errors.
- [ ] Migrate a copy of legacy data without changing course content or resetting existing passwords. Investigate duplicate-index errors without deleting arbitrary records.
- [ ] Confirm missing historical dates/verification markers are not invented; plan explicit student email re-verification for V44 accounts.
- [ ] Confirm /api/health and real business queries work against the selected MongoDB version/permissions.

## Identity and access boundaries

- [ ] Student credentials succeed only at student login; Client Admin only at client login; Super Admin only at builder login. Changing submitted role/portal must not alter this.
- [ ] Use one browser with all three accounts, separate tabs. Refresh each portal, navigate between pages, sign out one portal and confirm other sessions are not incorrectly reused/cleared.
- [ ] Call /api/business/overview and every financial mutation with student and builder cookies; expect 403 when authenticated to a disallowed role, or 401 without the selected portal's valid session. Changing X-SA-Portal alone must not grant access.
- [ ] Confirm the legacy sa_session JWT is ignored; no testing enrollment endpoint is mounted; destructive demo reset command cannot delete purchases.
- [ ] Confirm required MFA locks business/CMS APIs before onboarding and also constrains old non-MFA sessions when policy is enabled.
- [ ] Enroll MFA, verify code, save recovery codes, login again, reject replayed code, consume one recovery code only once, confirm setup expiry/restart and owner recovery path.
- [ ] Confirm HttpOnly, production Secure, SameSite/path, idle/absolute expiry and server-side revocation. Password change/reset, block and revoke-sessions must invalidate prior tokens.
- [ ] Confirm disallowed Origin/Referer, cross-site fetch and missing anti-CSRF marker are rejected for state changes. Test real same-site app/API deployment, CORS preflight and configured trusted proxy behavior.
- [ ] Exercise account/IP throttles from multiple browser sessions; do not test against unrelated external sites.

## Signup and recovery

- [ ] Registration always creates an unverified student, regardless of attempted admin fields.
- [ ] Verification consumes the real token; expired/reused tokens fail. React development strict mode does not consume the same verification twice through the component.
- [ ] SMTP delivery, resend and reset are tested with owned mailboxes. Development console preview is never represented as sent email.
- [ ] OTP max-attempt and expiry limits work; reset token is one-use and not exposed in the final reset-page URL; old sessions cease to work.
- [ ] Public student recovery cannot reset an administrator password. Admin seeding preserves existing users unless the explicit reset flag is used.

## Financial integrity and transactions

- [ ] Create a course invoice and a membership invoice; confirm no cash/access just from issue.
- [ ] Record partial payment, reject overpayment/future date/bad currency/invalid amount; no new paid access for partial settlement.
- [ ] Finish payment and verify exactly one paid entitlement, correct snapshot price, correct start/expiry and audit/notification.
- [ ] Retry identical idempotency key/payload, then changed payload; no duplicate record. Submit concurrent same-reference and final-settlement requests from two sessions.
- [ ] Force a transaction failure after receipt insertion but before fulfillment/audit; verify all financial/access writes roll back on real MongoDB.
- [ ] Confirm standalone MongoDB rejects sensitive writes with no partial changes; read-only reporting does not pretend transaction support.
- [ ] Record completed offline refunds, reject beyond remaining refundable amount/provider record/future or pre-receipt dates. Verify equal credit, original gross receipt preservation, net collections on refund date and optional linked access revocation.
- [ ] Confirm refunds do not automatically reopen debt under this credit policy. Void only after every retained receipt is returned, with financial history retained.
- [ ] Cancel/restore/non-renewing/date-adjust membership access without silently charging/refunding. Test month-end, leap day, expired/future/unknown dates and end-exclusive boundaries.
- [ ] Issue actual renewal invoice; confirm next due comes from that invoice, not old expiry. Reject a second open linked renewal invoice. Review overlapping independent terms explicitly.
- [ ] Test direct course access versus membership-derived access, expired and perpetual enrollments, complimentary grants and extensions. No complimentary grant creates revenue.

## Reporting, customers and CMS regression

- [ ] Check gross/refunds/net against known per-currency fixtures. Unverified paid-labelled and pending/failed records are excluded. Different currencies remain separate.
- [ ] Verify UTC date boundaries, zero days, current outstanding/overdue distinction and filtered CSV totals; formula-like customer names/references cannot become spreadsheet formulas.
- [ ] Check customer signup/last-login counts, internal notes, bounded histories, pagination, search and >5,000 export refusal. Protected password/reset/MFA fields must never appear.
- [ ] Block/unblock a student, revoke all sessions and verify purchases survive. Verify course progress describes completion only, not assessment scores.
- [ ] Test reminder with verified/unverified student, paid/overdue invoice, actual SMTP failure, duplicate interval and shared notification read behavior.
- [ ] Create/edit/publish/unpublish course/module/lessons; check existing media, team, events, plans and review moderation. Course with invoice/purchase history cannot be deleted.
- [ ] Verify builder CMS and footer/social work while customer/business pages remain forbidden. Removed sidebar sections stay removed.
- [ ] Upload/replace/remove image/PDF/video, test paid media as guest/student/admin, stream seek/range requests and duplicated lesson media cleanup.
- [ ] Inspect desktop/tablet/mobile, keyboard navigation, focus trapping, native dialogs, loading/error/empty states, long names/large amounts and contained horizontal table scrolling in the actual app.

## Production gate

- [ ] Independent code/security and privacy review; reviewed dependency lockfiles; HTTPS, same-site topology, correct reverse proxy, MFA/email policy and secret handling.
- [ ] Backup/restore, monitoring, audit retention, upload scanning/quotas and operational response owners agreed.
- [ ] Client signs off that offline recording is not gateway charging/refunding, collections are not profit, reminder sending is not a scheduler and learner assessment/certificate flows remain incomplete.
- [ ] Do not turn on live online sales until verified provider checkout/webhooks, duplicate event handling, settlement reconciliation and provider refund flows are separately implemented/tested.
