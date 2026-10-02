# V50 — academy workflow and exact scope

## 1. Roles and data access

| Feature | Client Admin | Super Admin | Student |
|---|---|---|---|
| Professional overview | Academy/student-completion/term overview | Website-content overview only | Not an admin dashboard |
| Courses, modules, lessons, Team, Events | Edit | Edit | Published content and owned access |
| Academy Plans | Edit | Edit | View and purchase active plans |
| Student subscription register | Read-only, paginated | Denied | Own terms in My Billing |
| Student submitted answers/files and certificate decisions | Review, issue, Try Again, revoke | Denied | Own attempts/status/download |
| Reviews, Footer/Social, Website content | Denied | Edit/moderate | Public output |
| Subscription notifications | Not a shared student inbox | Denied | Own messages/read state |
| Receipt screenshots | Private-file authorization only | Denied | Own paid-receipt attachments |
| Business revenue/customer/financial-write dashboard | Not restored | Not restored | Not applicable |

Permissions are API-enforced. Client Admin can edit Academy Plans but cannot use that permission to edit Footer/Social, Reviews or Website content. Saved plan changes affect future selections/pricing, not previous invoice snapshots or existing term dates. The subscription register does not allow arbitrary role, payment or access changes.

## 2. Useful, denser overview

The Client Admin overview contains registered-student and seven-day activity counts, active live subscription terms, expiries within seven days, pending completion review, issued certificates, course publishing status, team visibility and upcoming events. It also contains bounded recent completion/expiry/student/activity lists, publishing-completeness bars and quick actions. Super Admin gets only content statistics, moderation status, upcoming events and content shortcuts.

Figures come from the database, not demonstration values. Active-subscription counts are **terms**, not a unique-person count; test/sandbox terms are excluded from the live overview. Student timestamps cover recorded activity only. Missing records remain empty/unknown. There is no net-profit or business-revenue dashboard.

Queries run in parallel with projections and bounded detail lists. Overview refresh runs every 60 seconds while visible; last successful content remains during refresh. The subscription register uses 20-row pagination and 250 ms search debouncing. Name/email search caps the resolved account set at 1,000 and warns when it is truncated; narrow the search in that case. These are implementation choices, not measured latency or concurrency guarantees.

## 3. Team photo editor

Team image controls support Upload & crop, Crop & edit, View original, Replace and Remove. Inside the editor: 4:3, square, portrait, landscape or original proportions; zoom; mouse/touch repositioning; precise pan sliders; 90-degree rotation; horizontal/vertical flip; brightness; contrast; reset. Native canvas produces a cropped JPEG for the existing server upload pipeline.

Use 4:3 for the existing Team card frame. A different crop aspect does not redesign that frame. The source and crop are saved as separate media references, and later editing starts from the uncropped source with the previous settings. The server normalizes image formats and strips metadata, so “original” means the **uncropped source copy**, not a byte-identical archival original.

Photos are limited to 10 MB and the local editor to 25 megapixels. GIF editing uses a static first frame. Imported external images must permit browser cross-origin reading; otherwise upload the source from the computer. Apply prepares/uploads the edit; **Save member** publishes the references. Cancel does not alter the saved public photo. Protected orphan uploads may remain after abandoned edits or failures; no automatic storage garbage-collection guarantee was added.

Original public files are not rewritten. Public team responses do not expose the uncropped source or edit settings. Both authorized content administrators can access their editing source; students see the saved public crop only.

## 4. Learner answer button and certificate error placement

Save answers keeps the existing draft/submission logic. It now has a save icon, modern brown styling, hover/active/focus states, busy indication and disabled states for unchanged/saving/uploading work. “Answers saved” is a UI state, not auto-grading. Complete lesson still validates required evidence and submits progress.

Certificate action errors are separate from list/loading errors. Missing/incorrect password, review acknowledgement, feedback or server decision errors appear beneath the password field beside Generate/Try Again controls, with alert semantics and contextual focus. Wrong-password checks return a local permission error rather than invalidating a valid session. Genuine expired authentication still uses the existing login behavior.

Course completion → admin notification → answer review → Generate/issue or Try Again remains the same. Try Again resets only that student's course progress, preserves previous attempts/files/review history and does not extend the subscription.

## 5. Subscription register and student notifications

Client Admin can search/filter student subscriptions by name/email/plan, effective status and **entry-date** range. The register shows entry date, actual subscription/payment date where the linked invoice supplies it, start, expiry, remaining days, price/currency and linked invoice reference. Sandbox records and blocked accounts are visibly distinguished. Missing historical data is not synthesized.

After a verified Stripe/PayPal **membership** settlement, a congratulations notification is upserted inside the same database transaction. Duplicate fulfillment cannot create another congratulations row. A single-course purchase remains a course purchase rather than a new membership notification. Historical subscriptions are not assigned fabricated purchase confirmations by migration.

A running backend checks immediately and about every 15 minutes for active terms in the seven-day expiry window. One reminder is keyed by subscription and expiry snapshot. Terms with a covering next active renewal are skipped; corrected dates, cancelled accounts/terms and later renewal are rechecked before email. If the backend returns late but the term is still within the window, the message uses actual days remaining rather than claiming exactly seven days. A server that is off for the entire window cannot deliver the reminder in advance.

The student sees a private “Subscription notifications” inbox in My Billing with unread count/read state. Email is a queued secondary delivery: verified address and configured SMTP required. Sandbox notification emails are skipped; development without SMTP produces a console preview. Production has no console-email substitute.

Unique notification keys and atomic five-minute delivery leases coordinate multiple processes. Each cycle handles up to 100 email claims, with retries/backoff and failure state after repeated delivery errors. An uncertain SMTP send/crash can still produce a repeated email on retry; there is no exactly-once external email guarantee. “Sent” means the mail transport accepted the message, not that it landed in the recipient's inbox. Deferred unverified-address rows retry later; monitor the outbox, server logs and delivery provider. No SMS, push service or automatic card charge is added.

## 6. My Billing and private receipts

The student has exactly three tabs: **My plans & subscriptions**, **Invoices & dues**, **Payment receipts**. The Refunds tab is removed; underlying refund/credit records and provider synchronization are retained for accurate history. Removal of a tab does not erase money movements.

Term cards show plan, recorded price, entry/subscription/start/expiry dates and a blue ring. Blue fill increases as the actual term elapses; the center shows remaining days. A future term is scheduled, an expired term is completed, cancellation is distinct and unknown dates are not treated as real progress. The visible billing page refreshes every 60 seconds, so the day count changes without requiring a manual reload.

**Expiry is not an invoice debt date.** The next payment due date is shown only when an actual linked open renewal invoice exists. Otherwise the interface shows the access expiry and renewal action without inventing an amount automatically owed. A scheduled next term is indicated. Re-subscribe uses the existing deliberate Stripe/PayPal checkout and current active plan price; memberships remain fixed-term, one-time purchases.

Receipts show actual paid amount/date/method/reference and a system-generated PDF. A student can attach up to three JPG/PNG/WebP screenshots per paid receipt (10 MB each; 100 per account), preview them later and remove their own attachment. Uploads follow file-signature, scanning and image normalization controls. Attachment registration rechecks ownership/status/quota in a transaction. Own student and Client Admin private-media authorization are required; guests, other students and Super Admin are denied.

A screenshot is **supporting material only**. Uploading or deleting it never changes payment status, creates a paid invoice or grants learning access. A PDF receipt is generated from the Academy's stored record, not a fabricated bank screenshot, settlement proof or tax invoice. Sandbox PDFs are explicitly labelled. Receipt PDFs use basic Latin/ASCII rendering with substitution for unsupported characters; full original account names remain in My Billing. The original certificate's Latin-script validation is retained.

## 7. Certificate design

New certificates use the exact original clean Academy shield asset, a warm brown/cream gradient, a faint diagonal SINGH ACADEMY watermark, a structured border and a nominal **48 pt course title (formerly 24 pt)**. Long titles wrap/shrink to prevent overlap; they are not forced outside the page. The student's name, recorded course/date/issuer, unique number and verification link remain.

The generated sample is clearly marked SAMPLE — NOT AN ISSUED CERTIFICATE. No proxy signature, Yasir signature or implied cryptographic signing was added. Approval and private download still use the existing review/identity checks. Previously stored issued PDFs are not regenerated or silently replaced.

## 8. Social fields and preserved UI

Super Admin Footer/Social inputs now display platform-specific URL examples. Existing values remain saved values; placeholders do not create links or social accounts. Client Admin remains unable to edit that section.

The 252 original public assets plus five protected public layout/style files are unchanged. The public header, landing page, colors and original photographs have not been redesigned. Only the expressly requested admin/billing/editor/answer controls and certificate template were changed.
