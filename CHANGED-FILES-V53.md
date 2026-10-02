# V53 primary changed files

- `frontend/components/cms/CourseEditor.tsx` — placeholders and simplified course fields.
- `frontend/components/cms/LessonEditor.tsx` — video poster field and playable Admin preview.
- `frontend/components/cms/Fields.tsx` — long-upload progress/cancel/session keep-alive.
- `frontend/components/cms/ContentCollection.tsx` — Team slug hidden and useful placeholders.
- `frontend/app/learn/[course]/page.tsx` — video poster and current-host PDF/media links.
- `frontend/app/contact/page.tsx` — clickable contact channels.
- `frontend/components/SiteHeader.tsx` / `frontend/app/styles.css` — mobile username/header layout.
- `frontend/lib/api.ts` — legacy/current GridFS media URL remapping.
- `frontend/lib/website-slots.json` / `backend/src/data/websiteSlots.js` — editable contact email/phone/location/map slots.
- `backend/src/models/Lesson.js` — video thumbnail/poster fields.
- `backend/src/utils/cmsValidation.js` — poster validation.
- `backend/src/utils/media.js` / `backend/src/routes/courseRoutes.js` — poster media authorization/serialization.
- `backend/src/utils/security.js` — V53 admin session policy.
- `backend/src/server.js` — long request ceiling and V53 label.
- `backend/src/scripts/migrateV53.js` — additive migration/index check.
- `backend/test/security-utils.test.js` / `backend/test/v53-media-cms.test.js` — regression checks.
