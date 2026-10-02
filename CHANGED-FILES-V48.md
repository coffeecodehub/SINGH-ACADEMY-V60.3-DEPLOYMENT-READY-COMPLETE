# V48 change map

Baseline V47. See WORKFLOW-V48.md and SECURITY-QA-V48.md for behavioral scope.

## Modified existing source/assets/docs at the comparison point

- `backend/integration/v47-checkout-certificates.test.js`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/models/AuditLog.js`
- `backend/src/models/CheckoutOrder.js`
- `backend/src/models/CourseCompletion.js`
- `backend/src/models/Invoice.js`
- `backend/src/models/SiteContent.js`
- `backend/src/routes/adminRoutes.js`
- `backend/src/routes/certificateRoutes.js`
- `backend/src/routes/contentRoutes.js`
- `backend/src/routes/courseRoutes.js`
- `backend/src/routes/mediaRoutes.js`
- `backend/src/routes/paymentRoutes.js`
- `backend/src/scripts/backfillCompletions.js`
- `backend/src/scripts/setupLocal.js`
- `backend/src/services/businessWrite.js`
- `backend/src/services/completions.js`
- `backend/src/services/onlineCheckout.js`
- `backend/src/services/uploads.js`
- `backend/src/utils/completion.js`
- `backend/test/cms-handlers.test.js`
- `backend/test/v47-workflows.test.js`
- `frontend/app/about/page.tsx`
- `frontend/app/academy/page.tsx`
- `frontend/app/billing/page.tsx`
- `frontend/app/book/page.tsx`
- `frontend/app/checkout/page.tsx`
- `frontend/app/contact/page.tsx`
- `frontend/app/courses/page.tsx`
- `frontend/app/events/page.tsx`
- `frontend/app/home/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/learn/[course]/page.tsx`
- `frontend/app/learn/[course]/player.css`
- `frontend/app/page.tsx`
- `frontend/app/reviews/page.tsx`
- `frontend/app/team/page.tsx`
- `frontend/components/AcademyImage.tsx`
- `frontend/components/CertificateStatus.tsx`
- `frontend/components/business/BusinessPortal.tsx`
- `frontend/components/business/Certificates.tsx`
- `frontend/components/layout/SiteFooter.tsx`
- `frontend/package.json`
- `package.json`

## New principal source

- `backend/src/models/CourseAttempt.js`
- `backend/src/models/LessonSubmission.js`
- `backend/src/models/StudentFile.js`
- `backend/src/utils/assessments.js`
- `backend/src/utils/subscriptionDisplay.js`
- `backend/src/utils/websiteContent.js`
- `backend/src/data/websiteSlots.js`
- `backend/src/services/learningAccess.js`
- `backend/src/services/attempts.js`
- `backend/src/services/learningSubmissions.js`
- `backend/src/services/studentFiles.js`
- `backend/src/routes/academyAdminRoutes.js`
- `backend/src/scripts/migrateV48.js`
- `frontend/components/learning/AnswerSheet.tsx`
- `frontend/components/business/AcademyNotifications.tsx`
- `frontend/components/business/review-v48.css`
- `frontend/components/WebsiteContent.tsx`
- `frontend/components/cms/WebsiteContentEditor.tsx`
- `frontend/lib/website-slots.json`
- `frontend/app/billing/subscriptions-v48.css`
- `backend/test/v48-learning-review.test.js`
- `backend/test/v48-boundaries.test.js`
- `backend/integration/v48-learning-review.test.js`
- `backend/integration/v48-role-http.test.js`

All 252 V47 public files, shared public styles/header and native certificate generator are unchanged. Older release guides are under docs/history-v47. Internal financial models/services remain to support existing payments, but the old Business HTTP router and frontend workspace menus are not exposed.
