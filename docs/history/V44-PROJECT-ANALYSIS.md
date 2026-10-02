# Singh Academy — V44 project analysis and admin CMS update

**Review date:** 26 September 2026  
**Input:** `SINGH-ACADEMY-MONGODB-PRO-LMS-V43-ADMIN-CMS-FIXED(3).zip`  
**Delivery status:** Updated source code, with passing source checks and dependency-free unit tests. **Staging validation is still required. This is not a production-readiness certificate.**

## 1. Executive assessment

The project already had a useful LMS foundation: a Next.js frontend, an Express API, MongoDB models, authentication, course progress and GridFS media storage. The main CMS problem was not the absence of database models. The frontend editors, backend permissions and public-page data sources were inconsistent.

In the supplied version, Client Admin could manage courses but could not save several other content types. Super Admin and Client Admin used different course-editing implementations. Events required a slug that their editor did not generate, while the public Events page did not consume event records. The signed-in Home course catalog was hardcoded. Consequently, adding a database record was not enough to make all relevant screens agree.

V44 replaces those divergent editors with shared components, enables the requested content management in Client Admin, connects the affected public views, and addresses several access-control and data-loss risks found during the review. The existing visual identity, assets, general page structure and sidebar distinction are retained. This is a functional CMS update, not a public-site redesign.

Two important pre-existing limitations remain: **live Stripe/PayPal checkout and verified webhooks are not implemented**, and **student assessment answers are not submitted or graded on the backend**. Editing plan prices or quiz questions must not be confused with completing those workflows.

## 2. Architecture and data ownership

| Layer | Responsibility and important files |
|---|---|
| Frontend | Next.js App Router, React, existing CSS; `frontend/app/` |
| Admin interface | Role-specific shell in `components/cms/AdminPortal.tsx`; shared collection, course, lesson and settings editors |
| API | Express routes under `backend/src/routes/`; cookie-based authentication in `middleware/auth.js` |
| Database | Mongoose models for users, courses, modules, lessons, progress, enrollments, subscriptions, payments, team, events, reviews and settings |
| Media | GridFS bucket `academyMedia`, protected delivery through `/api/media/:id` |
| Public content | Published courses, active team members, published events, approved reviews and allowed site settings |

Course ownership is `Course → Module → Lesson`. Enrollment records reference `courseSlug`, which makes changing an existing course URL dangerous. V44 therefore permits title/content editing but locks an established course slug, and refuses deletion of courses with enrollment or payment history. Unpublish such a course instead.

MongoDB remains the project's database. No SQL migration, new cloud storage service, Redis dependency or instructor account system was introduced. Actual database documents and uploaded files are not inside the source ZIP.

## 3. Findings and code changes

The locations below refer to the delivered source; the finding column describes behavior observed in the uploaded V43 code.

| Priority | Finding | V44 change / source reference |
|---|---|---|
| Critical | Any signed-in user could use the testing enrollment route to obtain course access. | Testing is disabled by default, requires an admin role when enabled, and is always disabled in production. `routes/testingRoutes.js` |
| High | GridFS delivery did not enforce paid-content entitlement. | Public covers/team/event images are distinguished from lesson media. Paid lesson files require access; admins can preview drafts. `routes/mediaRoutes.js` |
| High | Public course responses removed too few lesson fields, exposing protected content and answer keys. | Locked lessons return metadata only; defined teacher answer-key fields are removed from learner/public payloads. `routes/courseRoutes.js` |
| High | Rerunning seeds overwrote edited course/module/lesson content, team/settings and admin passwords. | Course seeds skip existing courses; content seeds insert missing records only; admin seeds preserve existing accounts unless password reset is explicitly requested. `scripts/seed*.js` |
| High | Courses with purchase history could be deleted or renamed by slug. | Immutable existing slugs and purchase-history deletion guard. `utils/cmsValidation.js`, `routes/adminRoutes.js` |
| Functional | Client Admin could not edit Team, Events and related content. | Shared authenticated CMS routes and forms enable course/team/event/plan editing and review moderation. `components/cms/`, `routes/adminRoutes.js` |
| Functional | Events were missing slug generation and a connected public listing. | Slug generation, draft/publish selector, date/location/map controls, image controls, public events API and Events page. `ContentCollection.tsx`, `contentRoutes.js`, `app/events/page.tsx` |
| Functional | Separate course editors exposed different/incomplete lesson controls. | One shared Course Editor and Lesson Editor for both panels. Module/lesson ordering, draft state, duplicate and deletion are supported. |
| Functional | Video/PDF uploads wrote names that did not match the lesson model's file-ID fields. | Uploads use `videoFileId`, `pdfFileId` and block/resource `fileId`. Image removal clears IDs to `null`, not an invalid empty ObjectId. |
| Functional | No dependable lesson draft filtering or consistent sequence rules. | New lessons default to draft; public/student queries omit explicit drafts; optional lessons and module sequential settings are considered. |
| Functional | Signed-in Home displayed a fixed course array; landing fallback profiles could reappear after hiding every member. | Home now reads published courses. Landing team accepts an empty API result instead of restoring demo profiles. `app/home/page.tsx`, `app/page.tsx` |
| Functional | Landing footer did not use saved social settings; social icons were text substitutes. | Shared footer with configured links and SVG brand icons. Blank links remain hidden. `SiteFooter.tsx`, `socialIcons.ts` |
| Functional | Checkout selection did not reliably change the selected price option; access checks differed from the learner endpoint. | Selected option is used and free/membership access is recognized. Payment processing itself remains unimplemented. `app/checkout/page.tsx`, `paymentRoutes.js` |
| Functional | Some business-table columns obscured payment amounts behind course slugs. | Entity-specific columns show payment amounts/currency, account details and access/subscription dates. `BusinessPanels.tsx` |
| Defensive | Generic updates accepted broad payloads, malformed dates/URLs, and confusing server errors. | Field allowlists, validation, meaningful 400/403/404/409 responses, restricted public settings, and ordering parent checks. |
| Defensive | File deletion could remove media still referenced by a duplicated lesson. | Remove a file only after checking remaining course/team/event/lesson references. `utils/media.js` |
| Defensive | Media suffix byte ranges were incorrectly handled. | Validated single/open-ended/suffix ranges and 416 for invalid requests. `utils/cmsValidation.js`, `mediaRoutes.js` |
| UX | Search inputs, image removal, unsaved changes and responsive navigation were inconsistent. | Connected search/status filters, preview/replace/remove controls, unsaved-change prompts, upload/save states and navigation CSS correction. |

These are reviewed code changes, not claims that every production path has been exercised. Multi-document deletion and media cleanup are not transactionally atomic; a production hardening pass should address concurrency and interrupted operations.

## 4. What is editable

| Section | Client Admin | Super Admin | Notes |
|---|---|---|---|
| Courses | Create/edit/delete or unpublish | Same shared editor | Existing course slug is intentionally locked; deletion is blocked where history exists. |
| Modules / lessons | Create/edit/order/duplicate lessons/delete | Same shared editor | New lessons start in draft; course publication and lesson publication are separate. |
| Team | Add/edit/hide/order/delete | Same shared editor | Founder, faculty, board and core categories; designation is editable text. |
| Events | Add/edit/draft/publish/delete | Same shared editor | Date/time, address, map link and cover image. No event registration workflow was added. |
| Academy Plans | Add/edit/order/show/hide/delete | Same shared editor | Name, duration, USD price, billing label, description and features. Existing subscriptions are not rewritten. |
| Reviews | Edit/moderate/delete existing submissions | Same shared editor | Pending/approved/rejected. No fabricated review-creation form. |
| Footer & Social | Not editable | Supported social profile links | General footer wording and navigation are not a new full-page CMS. |
| Business records | Users/subscriptions/payments/enrollments/notifications | Hidden from Super Admin sidebar | Business records are reporting views, not arbitrary editable payment/access ledgers. |

The sidebar split is preserved. Super Admin remains a privileged backend role and can authenticate to Client Admin; hiding business menus is not a separate security boundary between two untrusted organizations.

Removed Resources, Navigation, System and general Site Content menu items have not been restored. Existing historical resource routes/files remain in the project; this update does not claim to remove every legacy route.

### Course authoring detail

The course editor exposes descriptions, instructor display text, category/learning fields, prerequisites, outcomes, tools/skills, duration, thumbnail positioning, gallery, pricing, publication and SEO text. Modules have editable names, descriptions and sequential-learning settings.

Lesson authoring includes theory/notes, uploaded video, external video links, PDF/Word documents, resources, assignment instructions and question authoring. Ordered blocks support text, image, video, document, external link, reflection, assignment, quiz and resource lists. Questions include text, multiple-choice, true/false, rating and a file-question placeholder. The player now displays the corresponding practice controls and assignment instructions.

**Limits:** theory is edited as text, not a full WYSIWYG document editor. Teacher answer keys may be stored, but automatic grading, server-side assessment submissions, student file uploads, pass/fail enforcement and certificate generation are not implemented by this update. Player responses remain in the current browser component state and disappear on reload; only lesson completion/progress uses the existing backend persistence. Completion must not be treated as proof of assessment success.

### Media behavior

Images have immediate local preview and upload/replace/remove controls. Supported image formats are JPG, PNG, WebP and GIF, up to 10 MB; the upload route accepts supported video and document formats up to 500 MB. Removing a saved reference triggers best-effort unused-file cleanup after saving. Abandoned unsaved uploads are not automatically garbage-collected.

GridFS access checks apply to files managed by this backend. Externally hosted links retain the external host's access behavior. Upload MIME filtering is not malware scanning or content-signature validation; production deployment still needs those controls and storage/quota planning.

## 5. Verification actually performed

| Check | Actual result |
|---|---|
| Pure validation tests | 38 passed |
| Route/helper tests using in-memory dependency stubs | 30 passed |
| Combined unit-test run | **68 passed, 0 failed** |
| Frontend TS/TSX parse checks | **51 files, 0 syntax errors** |
| Backend JavaScript syntax checks | **38 files, 0 syntax errors**; includes the test files |
| Relative frontend import file-resolution checks | **96 checked, 0 missing targets** |
| Dependency resolution attempt | Failed with `EAI_AGAIN` resolving `registry.npmjs.org` |
| Next production build attempt | Could not start: `next: not found`, because dependencies were not installed |
| Full TypeScript semantic check | Not run against real installed dependency types |
| Real MongoDB CRUD, GridFS streaming, browser E2E and deployment | **Not verified in this environment** |

Raw outputs are under `qa/`. The handler tests execute the current route/helper code with mocked dependencies; they do not start Express, verify a real JWT, validate a real Mongoose model, upload through Multer, or contact a database. Passing them does not substitute for staging acceptance tests.

The original uploaded ZIP was not altered. No real user database, email account, payment account or deployed application was modified.

## 6. Remaining production work, in order

1. **Install and validate in staging.** Resolve dependencies on a connected machine, generate/retain lockfiles, run frontend typecheck/build, start the real API and use a backed-up staging MongoDB database. Test both admin roles and a real student account. Run the acceptance checklist in `START-HERE-V44.md`.
2. **Implement payment fulfillment.** Build actual Stripe/PayPal checkout and signed/idempotent webhook processing; verify server-side product/plan/amount/currency, activate access only after verified payment, and handle refunds, cancellation and expiration. Current checkout may return 503 without credentials or 501 with credentials; there is no working live adapter. The Academy membership purchase workflow also remains incomplete.
3. **Implement assessment persistence.** Add submissions, student uploads, grading, attempts, required-question validation and actual passing-score rules before advertising graded examinations or certificates.
4. **Harden operations and security.** Add rate limits, deliberate CSRF/origin protection for writes, upload content validation/scanning, audit history, database backup/restore tests, pagination, transactional/recoverable destructive operations, upload orphan cleanup and reliable production email. Review deployment cookie/CORS behavior using same-site frontend/API origins; cross-site media authentication is not newly solved here.
5. **Complete remaining content/product gaps.** Approve Terms and Privacy pages, finish any event registration flows, decide which editorial Home/About/FAQ content should become CMS-driven, and review public marketing claims. Dashboard revenue is based on stored `paid` payment records, not bank reconciliation; the original aggregate still assumes one currency and requires multi-currency/reporting review.

## 7. Dependency changes and external references

The source manifest now pins **Next 15.5.19**, **React / React DOM 19.1.5**, and **Multer 2.4.0**. The framework release lines were kept instead of moving the app to a new major Next/React generation. These manifests were edited but could not be installed here. They are not a claim that all transitive vulnerabilities have been eliminated; run a fresh audit and build on the exact resolved lockfile before deployment.

Official references consulted on 26 September 2026:

- Next.js 15.5.19 release: https://github.com/vercel/next.js/releases/tag/v15.5.19
- React 19.1.5 release: https://github.com/react/react/releases/tag/v19.1.5
- React Server Components advisory, updated 26 January 2026: https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components
- Multer 2.4.0 release: https://github.com/expressjs/multer/releases/tag/v2.4.0
- Next.js production Suspense guidance: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout

A Suspense boundary was added around routed content for existing `useSearchParams` consumers. This addresses a known build requirement but cannot be reported as a successful production build in the absence of installed dependencies.
