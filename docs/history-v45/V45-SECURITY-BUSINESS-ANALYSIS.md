# Singh Academy V45 — business and security implementation review

**Review date:** 26 September 2026  
**Input:** SINGH-ACADEMY-V44-EDITABLE-ADMIN-CMS.zip  
**Output:** SINGH-ACADEMY-V45-SECURE-BUSINESS-ADMIN.zip  
**Status:** source implementation with unit/stub and source checks; real staging validation required. Not a deployment, penetration-test report or guarantee of production readiness.

## 1. Requested outcome and delivered boundary

Client Admin now has an operations workspace rather than only a set of CMS editors. It includes customer accounts, recorded collections, subscriptions/access terms, renewal invoices, payment due dates, refunds/credits, course entitlements, reports and activity. The shared course/team/event/plan/review editors remain available. Super Admin remains the builder-team content workspace and is denied business/customer endpoints at the API layer, not only hidden in navigation. There is no instructor role.

The new financial workflow is **audited offline collection management**, not a working online payment gateway. An administrator records money already collected or returned, with references, dates and a reason. No UI button transfers money. Stripe/PayPal checkout and webhook verification remain incomplete and the unsupported checkout does not create a fake pending payment before failing.

## 2. Actual authentication findings

V44 did contain role checks in its login handler. The more precise issue was that portals shared a JWT session cookie, and frontend session probing/redirect logic could treat an already authenticated admin as the identity on a student page. Hiding buttons or altering a redirect would not create independent sessions. V45 replaces that arrangement with portal-bound server-side sessions and fixed role-specific endpoints.

A second defect existed in the frontend verification page: it redirected to login instead of consuming the email-verification token. Signup also marked new users verified too early. V45 registers unverified students and provides a real one-time verification flow. The delivery handles mail failures without deleting the newly created account and uses non-enumerating responses for reset/resend.

The old public password-reset workflow is now explicitly student-only. Admins use authenticated password changes or a database-owner recovery command, not the student OTP endpoint. Normal admin seeds do not silently reset passwords or elevate existing student accounts.

### Portal contract

| Portal | Login endpoint | Accepted account role | Separate cookie | Operational boundary |
|---|---|---|---|---|
| Student | POST /api/auth/login | student | sa_student_v45 | Student workflows; no CMS/business permission |
| Client Admin | POST /api/auth/admin/login | client_admin | sa_client_admin_v45 | Business operations plus shared CMS |
| Super Admin | POST /api/auth/super-admin/login | super_admin | sa_super_admin_v45 | Shared CMS and footer/social; business denied |

The login body cannot choose an administrative role. `X-SA-Portal` selects which cookie the server should inspect, not which role to grant. The stored session's user, exact portal, role, version, lifetime, idle timeout and revocation state are independently checked. Legacy known role aliases can be normalized by migration; unknown roles are not treated as students.

### Implemented controls and relevant source

| Control | Implementation/source |
|---|---|
| Opaque sessions | Cryptographically random bearer token; only SHA-256 hash stored in AuthSession. `services/sessions.js`, `models/AuthSession.js` |
| Cookie controls | HttpOnly, Secure in production, SameSite=Lax, path /api; separate cookies; old shared JWT ignored. `utils/security.js` |
| Revocation | Logout, password reset/change, customer blocking, version changes and session management invalidate server-side sessions. `middleware/auth.js`, `routes/securityRoutes.js` |
| Mandatory admin onboarding | With MFA required, password-only sessions are limited to setup/security/logout endpoints. Existing sessions are also constrained when the configuration is tightened. |
| Two-step verification | Time-based codes, replay prevention, encrypted secrets and eight one-use recovery codes. `utils/totp.js`, security routes/controller |
| Brute-force controls | Mongo-backed fixed-window counters for account and IP; security/business write limits. `middleware/rateLimit.js`, `models/RateLimit.js` |
| Request forgery controls | Unsafe requests need a custom anti-CSRF header and an allowed Origin/Referer; explicit CORS, cross-site fetch rejection. `app.js`, `utils/security.js` |
| Signup/reset validation | Scalar email/password validation; always student; expiring hashed verification/reset tokens, OTP attempt limit, one-time consume. `controllers/authController.js` |
| Frontend identity separation | Portal-aware API/session provider, response-race guard and safe student-return paths. `frontend/lib/api.ts`, `components/auth/` |
| Sensitive data minimization | Private model selections and explicit public user serialization; internal notes are limited to client customer detail. |
| Audit | Separate business/student-auth/client-auth/super-auth/CMS scopes; sensitive business audit writes occur inside the financial transaction. |
| Media/CMS | Retained V44 paid-lesson GridFS access checks; admin media preview uses the correct portal selection. |

These are implemented code controls, not independently verified guarantees. All same-origin client JavaScript remains within one site trust boundary: separate cookies do not isolate one compromised frontend script from the rest of that site's code. A strict nonce-based CSP, independent security review, dependency review, deployment controls and upload hardening still matter.

## 3. Business workspace and data presentation

### Overview and reports

The dashboard renders recognized gross collections, recorded refunds, net collections, current outstanding and overdue balances, student accounts/new registrations, distinct active unblocked members, upcoming expiry terms and login activity. It includes date/currency selectors, a daily zero-filled chart, recent receipts, expiring memberships and overdue follow-up tables. No synthetic sales data is injected into the application.

Reports use UTC date windows and one currency at a time: USD, PKR, EUR, GBP, CAD or AUD. Collections use actual recorded paid dates; refunds use their own return dates. Pending/failed payments and unverified paid-labelled legacy records are not counted as collected revenue. Existing verified provider records may be recognized from their stored verification marker, but V45 does not newly verify their historical bank/provider evidence. Such records still need reconciliation when migrating uncertain data.

Money is stored in integer minor units for new invoices, receipts and refunds. Input is validated to two decimal places. Legacy `amount` values are retained and converted with a consistent rounding rule when valid. Different currencies are never mixed or converted. Net collections equals gross collections minus recorded refunds. It does not calculate accrual revenue, operating costs, tax, gateway fees or net profit.

Current outstanding/overdue cards intentionally use current invoice balances across all dates, rather than silently applying the chart's collection-date window. Daily report export uses the same values as the chart. Product reports show gross collections, not profitability.

### Customers

Profiles show signup time, last successful login, login count since tracking became available, verification/account status, contact fields, internal notes, collection totals by currency and linked histories for subscriptions, invoices, payments, refunds, course access and activity. Unknown historical login/term dates remain unknown. A new tracking field cannot reconstruct old events.

Contact updates are allowlisted; client admins cannot arbitrarily edit roles or passwords through the customer form. Blocking revokes existing sessions but does not destroy purchases. Student passwords, MFA secrets, session tokens and reset tokens are not included in business responses.

Per-profile history is bounded at 100 records per financial section and 40 activity entries, with a truncation warning. Main sections provide paginated access and filterable CSV export. Exports are limited to 5,000 rows and escape formula-leading values. Progress summaries use published lessons for directly enrolled courses; this is not a full membership-only learning analytics system or proof of graded assessment success.

### Subscriptions, dates and renewal

The interface distinguishes creation/purchase records, term start, access expiry, original invoice due date, next issued renewal invoice due date, status and days remaining. An expiry is not assumed to be a debt due date. A renewal shows its actual linked open invoice; missing historical billing data is displayed as not recorded.

Membership actions support immediate cancellation, marking the term non-renewing, restoring an eligible term, issuing a renewal invoice, and audited start/end date adjustment. Date adjustment is an administrative access correction/complimentary extension, not a new paid transaction. It preserves a cancelled status unless a separate restore action is authorized. Calendar-month addition handles month-end/leap-year boundaries. Access expiry is exclusive; invoice due dates are through the end of the selected UTC day.

Provider-linked subscriptions are refused by these local change workflows. No code here cancels a live provider subscription or charges another installment. There is no automatic plan upgrade/downgrade/proration system. Independently created membership terms can overlap; staff must review term histories and choose renewals deliberately. One open linked renewal invoice per existing term is enforced.

### Financial lifecycle and safeguards

| Operation | Effect | Deliberate safeguard |
|---|---|---|
| Create invoice | Snapshots product, price, currency, duration, access start and due date | Active student; published course/active plan; no payment or access just from invoice creation |
| Record offline receipt | Immutable gross receipt with actual date/reference | Current password/reason, amount ceiling, idempotency, duplicate-reference protection |
| Partial receipt | Reduces balance | Does not grant new paid access |
| Fully settle invoice | Creates membership or course access once | Same database transaction as receipt/invoice/audit; no duplicate fulfillment |
| Record completed offline refund | Refund history plus equal invoice credit | Limited to remaining refundable manual collections; no transfer to bank/card |
| Optional refund access revocation | Cancels access linked to that invoice | Separate explicit selection, not assumed for every partial refund |
| Void invoice | Retains history, void status | Refuses while collected money remains unreturned |
| Change due date | Updates an open invoice | Does not change membership expiry or create cash |
| Complimentary access | Dated course access or extension | Separate from collections; current password/reason/audit |

Refund/credit policy is important. Original invoice total and gross applied receipts remain historical values. A refund also issues an equal credit, reducing the adjusted invoice price and applied net cash equally. Therefore an ordinary refund does **not** automatically reopen debt. An invoice is not a full accounting journal, multi-line tax invoice or credit-note PDF generator.

Receipt/refund reference fingerprints do not depend on a rotating authentication secret. Idempotency keys also bind the actor and payload, so reusing a key with different data fails rather than making another record. Concurrent duplicate references are protected by unique indexes. Actual real-Mongo contention/rollback behavior still requires staging tests; handler stubs cannot certify it.

Sensitive account and billing writes use a MongoDB transaction with majority write concern. The service checks for transaction capability and rejects standalone databases before mutation. There is no fallback that commits only part of a receipt/access/audit operation. This policy does not make all legacy CMS operations transactional: multi-document curriculum deletion, upload cleanup and CMS finish-hook audit remain best-effort/non-atomic and need separate hardening.

## 4. Administration, reminders and retained scope

The client sidebar provides Overview, Customers, Memberships, Invoices, Payments, Refunds/Credits, Course Access, Reports, Activity, Notifications, CMS sections and Security. The builder sidebar offers content overview, CMS and Security; financial/customer queries are denied at the backend even if the caller manually changes URL or portal headers.

The shared business notification inbox uses a shared read flag, not per-admin read tracking. Invoice reminders require a verified address and outstanding balance; duplicate requests are limited per invoice and IP. They are sent on demand, not by a background scheduler. Dev console preview and SMTP submission are labelled differently. SMTP acceptance is not delivery confirmation and ambiguous email transport failures still require operator review.

V44 course/module/lesson editing, image upload/preview/remove, team/events/plans/review moderation and builder footer/social remain. Established course slugs are protected because purchase records reference them. Course deletion now also checks invoices, not just enrollments and payments; use unpublish for historical products. Public styling and assets are not redesigned. Legacy resource pages/routes are not all removed, and instructor names remain display text rather than new login roles.

## 5. API map

All `/api/business` endpoints require an authenticated **client_admin** session. GET exports are audited; substantive changes require password confirmation and a reason unless specifically described as shared-inbox acknowledgement.

| Endpoint | Responsibility |
|---|---|
| GET /overview, /capabilities | Dashboard and transaction support |
| GET /options | Bounded student search and available billing products |
| GET /customers/:id | Student profile with bounded linked histories |
| GET /records/:kind | Filtered paginated operational records |
| GET /exports/:kind, /reports/export | CSV data; maximum 5,000 record rows |
| POST /invoices, /payments, /refunds | Transactional financial creation; Idempotency-Key required |
| PATCH /customers/:id | Allowlisted profile update |
| POST /customers/:id/actions | Block, unblock or revoke sessions |
| POST /subscriptions/:id/actions | Cancel/restore/non-renewing/date adjustment |
| POST /invoices/:id/actions | Void or due-date correction |
| POST /invoices/:id/remind | Explicit email follow-up; password/reason/throttling |
| POST /enrollments, /enrollments/:id/actions | Complimentary grant, extension, revocation |
| PATCH /notifications/:id/read; POST /notifications/read-all | Shared business inbox acknowledgement |

Auth security endpoints and owner-only recovery commands are documented in START-HERE-V45.md. No testing-enrollment endpoint is mounted. The inherited destructive demo-access reset script is disabled and its npm command removed.

## 6. Verification actually performed

| Check | Actual result | Limitation |
|---|---|---|
| Backend unit/handler suite | **249 passed, 0 failed** | Dependency-free pure tests plus injected model/service stubs; no real MongoDB or HTTP server |
| Frontend parsing | **58 TS/TSX files**, no parse error | Not a TypeScript dependency/type check |
| Backend source syntax | **62 JavaScript files**, no syntax error | Does not prove dependency APIs exist at runtime |
| Local frontend imports | **123 resolved**, no missing local import | npm packages not installed |
| Environment setup self-check | **7 passed** | Isolated temporary directory; never touched user's environment/database |
| Static CSS fixture | No horizontal page overflow at **360, 390, 768, 1024, 1440px** | Static HTML using delivered CSS, not Next/React integration; desktop/mobile fixtures are labelled |
| npm connectivity | **Failed EAI_AGAIN** | Registry hostname resolution unavailable in the build environment |
| Next production build | **Not completed: next not found** | Dependencies could not be installed |

Test areas include exact role/portal matrices, rejection of old/wrong cookies, blocked users, session expiry/version/revocation, MFA vectors/replay/encryption, password/email input checks, safe redirects, CSRF decisions, scalar money/date/pagination/CSV validation, signup role injection, one-time verification shape, transaction refusal, idempotent invoice/receipt/refund handlers, overpayment/refund limits, partial/full fulfillment and date adjustments. Existing CMS tests remain.

Actual logs are under `qa/v45-*`. V44 logs moved to `qa/history-v44` are historical, not new results. `V45-ACCEPTANCE-CHECKLIST.md` is a **required future test checklist**, not a list of tests already passed.

## 7. Required next validation and residual risks

Install dependencies on a working network, inspect resolved versions and dependency audit, save reviewed lockfiles, run full typecheck/build and execute the real staging acceptance suite. Test actual MongoDB indexes, aggregation shapes, transaction rollback and concurrency on the chosen Atlas/replica-set configuration. Use true browser requests to test same-browser portal coexistence, cookie attributes, CSRF/origin rejection, expiry and revocation. Verify real SMTP, MFA onboarding/recovery, GridFS range playback and cross-role lesson-file access. Load-test long histories and large uploads.

Dependency versions are retained from the source manifests except removing the unused JWT dependency; they were not independently confirmed as latest or security-clean. No new cloud account, payment provider or user production database was connected during this work.

Operational requirements remain: HTTPS/reverse-proxy configuration; rate-limit trust-hop accuracy; same-site frontend/API topology; clock synchronization; strong stable MFA encryption key; protected audit logs and backups; off-box audit retention/alerts; malware/content-signature scanning and quotas for uploads; unused-file cleanup; operational restore/reconciliation procedures. The server's limited CSP headers are not a full XSS control set. Custom authorization/security code still warrants a separate professional review before handling real customer funds/data.

New secure defaults do not prove old email addresses were verified. Consider the explicit re-verification migration after planning customer communication. Unknown legacy role/date/amount values need human review rather than silent correction. Neither report labels nor stored `verifiedAt` establish proof of a historical bank payment.

Remaining functional boundaries: no live Stripe/PayPal checkout/webhooks/automatic recurring billing/provider refunds; no bank reconciliation, expenses/profit or tax-compliant invoice generation; no scheduled reminders or verified mail delivery tracking; no multi-line order/proration workflow; no full learner assessment submission/automatic grading/student file submission/certificate issuance. This release is a more complete business-operations foundation, not a claim that every academy business function has been implemented or independently tested.

## 8. Primary design references

These references informed the controls; they do not certify this implementation. The implementation facts above come from the delivered source and local QA logs.

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- RFC 4226 / RFC 6238 algorithm test vectors are exercised by the MFA tests.
