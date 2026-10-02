# V48 — roles, learning review and student billing

## Current roles

| Capability | Client Admin | Super Admin | Student |
|---|---|---|---|
| Courses, modules and lessons | Create/edit/publish | Create/edit/publish | Read available curriculum |
| Team and Events | Edit | Edit | Read published records |
| Reviews, Academy Plans, Footer/Social | No | Edit/moderate | Read public records |
| Registered website text/images | No | Edit, save or restore original | Read public presentation |
| Quiz/assignment answers and private submissions | Review by completion/attempt | No | Own course attempts only |
| Certificate issue, Try Again, revoke | Yes, password + reason | No | Own status/download |
| Course-completion notifications | Yes | No | Status/feedback on course and certificates |
| Business revenue/customer/payment-management workspace | Removed | Not exposed | Not applicable |
| My Billing, invoice records, renewal checkout | No access to another student's billing UI | No | Own records only |
| Account security | Own account | Own account | Student authentication |

No instructor login role was added. An instructor name in course authoring remains display text. Role restrictions are server-side, not merely hidden menus. `/api/business` is not mounted. Internal financial records and services remain because verified payments still need receipts, invoices and access fulfillment. Old manual records are preserved, not deleted.

## Public UI and website editing

The V47 public layout, shared public CSS, header, original assets and PDF template are the baseline. Super Admin's **Website content** edits registered text/image slots while keeping page structure, navigation routes and layout fixed. There are 238 registered text slots and 74 original-image slots, covering the existing editorial copy/FAQ/footer and reused original images. Existing Courses, Team, Events, Plans and Reviews continue to use their established collection editors.

No visual page-builder or arbitrary HTML/CSS editor is added. Changes are plain text, validated media references or supported URLs, not executable HTML. A blank override/restore uses the original content. An image replacement for a registered original asset applies wherever that asset is reused. Image files on disk are not overwritten. Website settings use revision checks: another admin's concurrent save must be reloaded/reconciled instead of silently overwritten. Default settings introduce no new public layout or replacement photographs.

## Student answer submission

Questions support text, multiple choice, true/false, rating and configured file-response questions. Existing assignment instructions and reflection/assignment blocks now have answer inputs. A file question can accept PDF/DOCX up to 20 MB or JPG/PNG/WebP up to 10 MB; production uploads pass the existing signature/scanner pipeline. Files are restricted to the owning student and Client Admin, never public image URLs or Super Admin previews.

Use **Save answers** to persist a draft, then **Complete lesson** to submit the lesson and mark progress. Draft typing is not autosaved on every keystroke. A saved-state indicator and unsaved-change warnings are shown. Uploading a file alone is not a submitted answer: save or complete the lesson after upload. Required fields must be answered before a required lesson can complete. This validates presence/form, not correctness or plagiarism.

Answers are stored with user, course, lesson, attempt number, question-set fingerprint, prompt/options/rubric snapshot, revision and submission time. A different course attempt, another student's file, stale tab revision or changed question set is rejected. Within one question-set/attempt, saving updates the current draft; this is not a keystroke-level audit log. Previously submitted attempts and prior question-set versions are retained.

Student responses never receive stored correct-answer/rubric fields. Client Admin can see them in the review alongside the student's answers. Learner video attention, exam identity and grading are not inferred from completion clicks.

## Completion, review and certificate sequence

1. The backend confirms required published lessons are complete. Empty courses do not complete; completion is not rounded upward from 99.x%.
2. The attempt is frozen as submitted, a pending completion is recorded and Client Admin receives a deduplicated notification. The course card says **Waiting for certificate**.
3. Client Admin opens **Certificates → Review answers**. The modal shows submitted work, optional rubric, required-evidence gaps and previous attempts/feedback. The 20 most recent attempts appear in the selector; older attempt numbers can be opened explicitly.
4. To approve, the admin checks the review acknowledgement, confirms certificate spelling, enters an approval note and current password, and selects **Generate & issue certificate**. The backend rechecks the current curriculum and required submitted evidence.
5. The existing professional PDF template, logo, unique serial, issue/completion dates and verification link are used. The student downloads the private issued PDF. A payment never issues a certificate automatically.

There is no automatic assessment score or pass/fail threshold. The academy makes the review decision. A legacy attempt with no saved required answers is visibly marked and cannot receive a certificate pretending that evidence exists. Issued V47 certificates remain historical; later course edits do not silently regenerate them.

## Try Again — precise effect

For a pending attempt, Client Admin enters feedback, confirms review and password, then selects **Try Again — restart course**. In one database transaction the old attempt receives the feedback/reviewer/progress snapshot, only `Progress` for that student and course is removed, a new attempt number is created, and the completion pointer becomes Try Again. Old quiz/assignment answers remain read-only review evidence. Repeated requests for the same decision do not reset the student's newly started work again.

The learner is returned to the first lesson on refresh/focus and starts with blank answers/new progress. My Courses / Certificates shows the feedback and restart action. The learner must complete the new required work before a new pending review is created.

No other student, other course, payment, invoice, membership or expiry date is reset. A course restart is not free extra membership time. When access has expired, the student renews/purchases eligible access before continuing. An issued or revoked certificate cannot be converted into Try Again by this action; revocation retains its history and previously downloaded PDFs cannot be recalled.

## My Billing

The existing My Billing route now opens **My plans & subscriptions**, alongside invoices, receipts and refunds. A term card contains plan, recorded price, entry date, subscription/payment date, access start, expiry and linked invoice. Dates are shown in UTC. Missing historical values remain **Not recorded**.

- Entry date: when that subscription record was created.
- Subscription/payment date: the linked invoice's actual paid date, when available; not a guessed start date.
- Subscription start and expiry: the actual access term, with expiry exclusive.
- Payment due date: an invoice deadline, not the subscription expiry date.

The circle uses the actual term duration and server time. Remaining days round upward for a partial remaining day, and the ring is clamped to 0–100%. Active, scheduled, expired, cancelled and unknown records are distinguished. Unknown/inconsistent dates or status do not get fabricated remaining-day counts. Expired terms show zero and **Term completed**. Visible billing data refreshes every 60 seconds; there is no background charging task.

**Re-subscribe** opens the existing Stripe/PayPal checkout for the currently active plan and binds the selected prior term to the student. An active term's new purchase starts after the applicable existing term; an expired term starts according to verified settlement. Renamed/disabled plans direct the learner to available Academy Plans instead of selling an unavailable item. Checkout shows the current price. A clicked link or successful-looking browser return never grants access without provider verification.

Payments remain deliberate, one-time purchases of a fixed-duration membership. No automatic recurring debits were introduced. Provider-completed refunds retain the V47 synchronization policy; there is no new admin refund-transfer tool.

## Operational limits

Completion notifications are an in-app, shared Client Admin inbox, not an email/push-delivery guarantee. Access/security checks require the live API. Legacy contact messages and financial records remain in the database, but their retired Business Admin inbox/reporting screens are not exposed by this scope. Dedicated inquiry-management tools, automatic grading, plagiarism scanning, Unicode certificate shaping, a visual page-builder and automatic recurring billing are not included.
