# V55 changed files

Functional changes are intentionally limited to:

- `frontend/components/SiteHeader.tsx` — restore My Courses for every signed-in student.
- `frontend/lib/api.ts` — same-origin media download URL helper.
- `backend/src/routes/mediaRoutes.js` — explicit authenticated attachment response when `download=1`.
- `frontend/app/learn/[course]/page.tsx` — deterministic PDF/resource downloads and click-to-play thumbnail.
- `frontend/app/learn/[course]/player.css` — thumbnail overlay styling only.
- `frontend/components/cms/Fields.tsx` — admin Download file action for stored documents.
- `frontend/components/cms/LessonEditor.tsx` — custom poster preview before uploaded/external video playback.
- `frontend/app/admin/admin.css` — poster preview styling only.
- `backend/src/scripts/migrateV55.js` — non-destructive no-op migration marker.
- `backend/test/v55-regressions.test.js` — focused regression checks.
- package versions/scripts and release documentation.

No Stripe/PayPal checkout, webhook, fulfillment, refund, invoice, enrollment, subscription, certificate, team/contact or course-authoring payment logic was modified.
