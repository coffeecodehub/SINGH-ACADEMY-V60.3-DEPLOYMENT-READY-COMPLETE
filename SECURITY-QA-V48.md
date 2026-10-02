# Singh Academy V48 — implementation and actual QA record

## Source and scope

Baseline: `SINGH-ACADEMY-V47-UI-PAYMENTS-CERTIFICATES.zip`. This update retires the Client Business Admin workspace, restricts Client Admin to academy content and assessment/certificate reviews, adds persisted course-attempt answers and Try Again, extends student billing and adds registered website-copy/image controls for Super Admin. No owner database, host, merchant credentials, real payment or real student certificate was modified.

The new source is an implementation package, **not a production deployment or independent security certification**. Older release QA under history folders is not current evidence.

## Main source changes

| Layer | Relevant source |
|---|---|
| Role-specific academy/content navigation | `frontend/components/business/BusinessPortal.tsx` (existing shell filename retained) |
| Removed Business HTTP surface | `backend/src/app.js`; `businessRoutes.js` is no longer mounted |
| Client-only notification API | `backend/src/routes/academyAdminRoutes.js` |
| Client Courses/Team/Events allowlist; Super site settings | `backend/src/routes/adminRoutes.js` |
| Attempt/submission/file models | `CourseAttempt.js`, `LessonSubmission.js`, `StudentFile.js` |
| Question-set definitions, strict answers/revisions | `backend/src/utils/assessments.js` |
| Entitlement/sequence/transactional learner save | `learningAccess.js`, `attempts.js`, `learningSubmissions.js` |
| Private assignment files | `studentFiles.js`, `uploads.js`, `mediaRoutes.js` |
| Completion, review, retry and issuance | `services/completions.js`, `routes/certificateRoutes.js` |
| Learner answer inputs | `frontend/components/learning/AnswerSheet.tsx`, `app/learn/[course]/page.tsx` |
| Client evidence review and history | `frontend/components/business/Certificates.tsx` |
| Student term/date/circle/renewal display | `paymentRoutes.js`, `subscriptionDisplay.js`, `frontend/app/billing/page.tsx` |
| Owner-bound deliberate renewal | `onlineCheckout.js`, `CheckoutOrder.js`, `Invoice.js`, checkout request body |
| Website text/image slots | `websiteContent.js`, `websiteSlots.js`, `website-slots.json`, `WebsiteContent.tsx`, `WebsiteContentEditor.tsx` |
| Additive migration | `backend/src/scripts/migrateV48.js` |

## Implemented security/data boundaries

All three portals retain the V45 separate opaque sessions. Client Admin cannot change plans/reviews/social/website settings by bypassing navigation. Super Admin cannot view student answers, private assignment files or issue certificates. Student answer and billing ownership come from the authenticated session and validated course/lesson/attempt, not a client-supplied user ID.

Answer saves, completion, retry and certificate decisions use the existing majority-write transaction service and the same per-student serialization record. Stale attempt/schema/revision submissions are rejected. Try Again archives reviewer feedback and old progress, resets only the selected student's selected course, and creates a new attempt. A repeated retry response cannot erase newly started work. No payment/access period is deleted or extended by a retry.

Required answers are validated for shape/presence and current question-set version. Correct-answer/rubric fields are withheld from learner payloads and available to Client Admin review. This is **manual approval**, not automatic grading, plagiarism detection, proof of video attention or accredited exam proctoring.

Student files are bound to owner/course/lesson/attempt/question, signature-checked and passed through the retained scanning pipeline. Production requires the configured scanner; there is no unsafe scanner-success fallback. The final binding checks the active attempt and unchanged question set after upload. Other students and Super Admin are denied, even with guessed media IDs. Scanning protocol tests use a local fake engine, not the real ClamAV engine. Existing older uploads are not retroactively scanned; abandoned uploads and storage retention still need operational cleanup/quota planning. File removal clears an answer reference rather than deleting historical submitted evidence.

Certificate issuance rechecks required progress and required evidence in the review transaction, requires current password and acknowledgement, then retains the original native PDF generator and historical serial/hash/token. Already issued certificates remain historical; revocation does not recall downloaded copies. Certificate fonts retain the original Latin/Western-script boundary and unsupported script names need an agreed transliteration.

My Billing dates are actual saved fields. Unknown values are not guessed, invoice due date is not treated as membership expiry, and unknown term status has no invented remaining-day count. Renewal bindings must belong to the same student and plan. Direct provider verification and idempotent settlement remain V47 code, not a newly verified merchant account. These are deliberate fixed-term purchases, not automatic recurring debits.

Website CMS is plain-text/registered-image editing, not arbitrary executable markup. Empty settings restore original text/images. A revision compare-and-set prevents one stale website settings save from overwriting another. Curriculum collection edits still have some legacy multi-document/non-atomic paths; concurrent authoring/approval changes and interrupted cleanup need staging and operational review.

## Actual checks performed in this working environment

Runtime for these checks: Node.js 22.16.0; source parsing used an available TypeScript parser, not installed application dependencies.

| Check | Actual result | Scope/limitation |
|---|---|---|
| `node --test test/*.test.js` | **534 passed, 0 failed, 0 skipped** | Pure helpers, model/transaction/API stubs and local scanner-protocol tests; no real MongoDB/merchant transaction |
| Frontend source parse | **78 TS/TSX files** | Syntax only, not full project types |
| Backend JavaScript syntax | **116 JS files** | Syntax only, not installed module/API compatibility |
| Relative frontend imports | **193 resolved, 0 source/import errors** | npm exports/types not certified |
| Public file preservation | **252/252 public asset files unchanged** | SHA-256 comparison with V47 source ZIP |
| Shared public CSS/header/PDF generator | Unchanged | `styles.css`, `SiteHeader.tsx`, `certificatePdf.js` byte comparison |
| 11 default public JSX comparisons | Equal | No-op hooks, placeholder child components and original fallback text; not live Next render/hydration |
| Billing/review layout fixtures | No document-level horizontal overflow at **320, 390, 768, 1024, 1440px** | Chromium rendered static TSX/CSS with sample data; not real application interactions; wide tables retain scrolling |
| Backend dependency install | **Failed `EAI_AGAIN`** | npm registry DNS unavailable |
| Frontend dependency install | **Failed `EAI_AGAIN`** | npm registry DNS unavailable |
| Full frontend typecheck attempt | **Failed: missing application dependencies/types** | This is not a passed typecheck |
| Next production build attempt | **Failed: `next: not found`** | Dependencies not installed |
| `npm run verify` attempt | **Stopped: missing genuine package lockfiles** | Intended fail-fast gate; no lockfile invented and no audit bypass |
| Real HTTP/MongoDB suite attempt | **3 prerequisite failures before application tests** | Missing dedicated `TEST_MONGODB_URI`; no real MongoDB assertions executed |
| Stripe/PayPal sandbox/live purchases | Not run | Owner credentials/accounts/webhooks required |
| Real application Playwright, SMTP, ClamAV, Docker and restore | Not run | Must execute on staging |

Logs and explicitly labelled static fixtures are under `qa/v48`. No successful V48 production build, clean resolved audit, full integration pass, measured live performance or perfect security is claimed. The V46 build reported by the user in a past conversation is not V48 build evidence.

### Included regression cases

Coverage includes required-answer rejection, draft persistence/reload, stale-tab/schema conflicts, private file ownership, submitted-attempt immutability, attempt retry history and replay, unrelated course/student/financial preservation, transaction rollback under injected failure, native PDF approval prerequisites, Client/Super CMS boundaries, own billing/renewal binding, unknown/expired term display and CMS input allowlists. These are useful regressions, not substitutes for real concurrent database behavior.

### Real test files supplied

`backend/integration/v48-role-http.test.js` tests real HTTP role separation, removed Business APIs, website setting revision handling and rollback. `v48-learning-review.test.js` covers actual saved answers, file binding/access, concurrent revision handling, retry history and PDF lifecycle on a disposable replica set. The retained V47 settlement integration is updated for the new submission/approval contract. It uses normalized provider-evidence fixtures, not actual external payments. The obsolete public Business Admin integration was moved to `integration/history/business-http.v46.txt`, not reported as a current passing test.

`frontend/e2e/public-portals.spec.ts` retains authored public/portal layout checks. Complete the specific interactive V48 acceptance checklist as well. Browser fixtures in `qa/v48` are static and should never be described as these Playwright application tests passing.

## Residual operational requirements

Keep HTTPS/proxy/origin rules, stable secrets, required production MFA/email verification, dependency/container review, least-privilege database/network permissions, protected logs and tested backups. Same-origin JavaScript is one website trust boundary; separate cookies are not isolation from a compromised entire site. Rate limits, upload storage limits and per-student serialization must be load-tested on the actual host.

No automatic recurring billing, automated grading, keystroke history, automatic certificate email/push jobs, accounting/profit/tax dashboard, unlimited export/history size, Unicode PDF shaping or arbitrary visual page-builder was added. Attempt lists are paginated/bounded (20 recent with older-number lookup); review payloads refuse more than 2,000 submission versions rather than silently omitting evidence. Student files are capped at 200 per course attempt. These constraints should be validated against the intended curriculum and retention policy.

## Primary implementation references

- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Mongoose transaction guide: https://mongoosejs.com/docs/transactions.html
- V47 provider contracts are retained in PAYMENTS-V48.md.

These are design references, not certification of this implementation. Implementation/test claims above come from source inspection and actual local logs.
