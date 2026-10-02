# V50 changed files compared with original V48

Base archive: `SINGH-ACADEMY-V48-ORIGINAL-UNCHANGED.zip`.

Public asset preservation is separately checked in `qa/v50/public-preservation.log`. This manifest includes documentation and test artifacts, not just application code. Generated manifest files themselves are additional metadata.

## Modified

- `README.md`
- `backend/.env.example`
- `backend/integration/v48-role-http.test.js`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/models/TeamMember.js`
- `backend/src/routes/academyAdminRoutes.js`
- `backend/src/routes/adminRoutes.js`
- `backend/src/routes/contentRoutes.js`
- `backend/src/routes/mediaRoutes.js`
- `backend/src/routes/paymentRoutes.js`
- `backend/src/scripts/sampleCertificate.js`
- `backend/src/scripts/setupLocal.js`
- `backend/src/server.js`
- `backend/src/services/certificatePdf.js`
- `backend/src/services/onlineCheckout.js`
- `backend/src/services/uploads.js`
- `backend/src/utils/cmsValidation.js`
- `backend/test/cms-handlers.test.js`
- `backend/test/v47-workflows.test.js`
- `frontend/app/billing/page.tsx`
- `frontend/app/learn/[course]/page.tsx`
- `frontend/components/business/BusinessPortal.tsx`
- `frontend/components/business/Certificates.tsx`
- `frontend/components/cms/ContentCollection.tsx`
- `frontend/components/cms/Fields.tsx`
- `frontend/components/cms/SiteEditor.tsx`
- `frontend/lib/api.ts`
- `frontend/package.json`
- `package.json`
- `qa/README.md`
- `qa/certificate-sample.pdf`
- `scripts/check-preserved-ui.mjs`

## Added

- `ACCEPTANCE-V50.md`
- `DEPLOYMENT-V50.md`
- `SECURITY-QA-V50.md`
- `START-HERE-V50.md`
- `WORKFLOW-V50.md`
- `backend/src/assets/certificate-logo-original.alpha.deflate`
- `backend/src/assets/certificate-logo-original.json`
- `backend/src/assets/certificate-logo-original.png`
- `backend/src/assets/certificate-logo-original.rgb.deflate`
- `backend/src/models/PaymentAttachment.js`
- `backend/src/models/StudentNotification.js`
- `backend/src/routes/studentNotificationRoutes.js`
- `backend/src/scripts/migrateV50.js`
- `backend/src/scripts/runStudentNotifications.js`
- `backend/src/services/academyOverview.js`
- `backend/src/services/paymentAttachments.js`
- `backend/src/services/receiptPdf.js`
- `backend/src/services/studentNotifications.js`
- `backend/src/utils/adminSubscriptions.js`
- `backend/src/utils/pdfWriter.js`
- `backend/src/utils/subscriptionNotifications.js`
- `backend/test/v50-notifications.test.js`
- `backend/test/v50-subscriptions-receipts.test.js`
- `frontend/app/billing/billing-v50.css`
- `frontend/app/learn/[course]/answers-v50.css`
- `frontend/components/billing/PaymentReceiptCard.tsx`
- `frontend/components/billing/SubscriptionNotifications.tsx`
- `frontend/components/billing/SubscriptionProgress.tsx`
- `frontend/components/business/AcademyOverview.tsx`
- `frontend/components/business/AdminSubscriptions.tsx`
- `frontend/components/business/dashboard-v50.css`
- `frontend/components/cms/CropMediaField.tsx`
- `frontend/components/cms/ImageCropEditor.tsx`
- `frontend/components/cms/photo-editor-v50.css`
- `qa/v50/backend-tests.log`
- `qa/v50/browser-check.log`
- `qa/v50/browser-check.py`
- `qa/v50/browser-fixtures.json`
- `qa/v50/certificate-generation.log`
- `qa/v50/certificate-long-title.pdf`
- `qa/v50/dependency-install.log`
- `qa/v50/fixture-generation.log`
- `qa/v50/fixtures/admin-overview.html`
- `qa/v50/fixtures/admin-subscriptions.html`
- `qa/v50/fixtures/billing-invoices.html`
- `qa/v50/fixtures/billing-payments.html`
- `qa/v50/fixtures/billing-plans.html`
- `qa/v50/fixtures/certificate-error.html`
- `qa/v50/fixtures/crop-editor.html`
- `qa/v50/fixtures/drawCrop.js`
- `qa/v50/fixtures/super-overview.html`
- `qa/v50/frontend-build.log`
- `qa/v50/frontend-typecheck.log`
- `qa/v50/integration-attempt.log`
- `qa/v50/original-public-sha256.json`
- `qa/v50/public-preservation.log`
- `qa/v50/receipt-fixture.pdf`
- `qa/v50/render-fixtures.cjs`
- `qa/v50/screenshots/admin-overview-1440.png`
- `qa/v50/screenshots/admin-overview-390.png`
- `qa/v50/screenshots/admin-subscriptions-1440.png`
- `qa/v50/screenshots/admin-subscriptions-390.png`
- `qa/v50/screenshots/billing-invoices-1440.png`
- `qa/v50/screenshots/billing-invoices-390.png`
- `qa/v50/screenshots/billing-payments-1440.png`
- `qa/v50/screenshots/billing-payments-390.png`
- `qa/v50/screenshots/billing-plans-1440.png`
- `qa/v50/screenshots/billing-plans-390.png`
- `qa/v50/screenshots/certificate-error-1440.png`
- `qa/v50/screenshots/certificate-error-390.png`
- `qa/v50/screenshots/crop-editor-1440.png`
- `qa/v50/screenshots/crop-editor-390.png`
- `qa/v50/screenshots/super-overview-1440.png`
- `qa/v50/screenshots/super-overview-390.png`
- `qa/v50/source-check.log`
- `qa/v50/tests-first.log`
- `qa/v50/tests-second.log`
- `qa/v50/tests-third.log`
- `qa/v50/verify-attempt.log`

## Removed


