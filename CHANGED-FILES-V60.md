# V60 changed files

## Backend
- `backend/src/routes/courseRoutes.js` — idempotent enroll retry.
- `backend/src/scripts/migrateV60.js` — repairs legacy Enrollment uniqueness and fills blank contact values.
- `backend/src/utils/enrollmentIndexes.js` — safe index detection helper.
- `backend/src/data/websiteSlots.js` — requested contact/footer defaults.
- `backend/test/v60-regressions.test.js` — focused regression coverage.
- `backend/src/server.js`, package versions/scripts.

## Frontend
- `frontend/lib/video.ts` — shared multi-provider video resolver.
- `frontend/app/learn/[course]/page.tsx` — no empty video stage; multi-provider playback.
- `frontend/components/cms/LessonEditor.tsx` — broader video-link input and preview.
- `frontend/middleware.ts` — frame CSP for supported providers.
- `frontend/app/contact/page.tsx` — requested contact fallbacks.
- `frontend/components/layout/SiteFooter.tsx` — requested contact details and coffeeCODEhub credit.
- `frontend/app/learn/[course]/player.css`, `frontend/app/styles.css` — only support styles for requested changes.
- package version.

## Project
- `package.json`, `README.md`, `START-HERE-V60.md`, `V60-FIX-GUIDE.md`, `V60-QA-REPORT.md`, `CHANGED-FILES-V60.md`, `scripts/check-preserved-ui.mjs`.
