# Singh Academy V53 — media, session and contact fixes

V53 is an additive update on V52. It intentionally keeps the previously approved public layout and all earlier V52/V51 learning, payment, certificate, admin and Try Again workflows unless a V53 change is listed below.

## V53 requested changes

- Course editor placeholders were added.
- Category, Learning Field, Learning Path and Credit Hours are no longer shown in the course authoring UI. Old stored values are preserved for backwards compatibility; this update does not destructively rewrite historical course documents.
- Long admin uploads now show progress and keep the admin session alive while a transfer is active. The backend request ceiling was increased to 30 minutes. Admin sessions have a 12-hour hard lifetime and 4-hour idle window; the visible admin workspace refreshes its session periodically.
- Lesson video authoring now supports a separate poster/thumbnail image and an in-editor playable preview.
- Student video playback uses the saved poster when available.
- Internal lesson PDF/document/media URLs are remapped through the current API host, so legacy localhost/old-host GridFS URLs do not break after deployment changes.
- Team-member slug is no longer exposed in the shared Team editor. The backend still creates an internal stable slug from the member name.
- Contact email, phone and location can be configured from Super Admin → Website content → Contact. The rendered values are clickable (`mailto:`, `tel:` and map link). Environment fallbacks are also available.
- Mobile header username has a bounded, ellipsized layout so it does not break the right-side header controls.

## Before upgrading

1. Back up the source, `backend/.env`, MongoDB database and GridFS media.
2. Extract V53 into a new folder.
3. Copy the existing `backend/.env` into V53. Preserve `AUTH_SECRET`, `MFA_ENCRYPTION_KEY`, MongoDB URI and payment-provider secrets.
4. Do not copy an old `node_modules` or `.next` directory.
5. Use Node.js 22 or newer.

## First setup / upgrade

From the V53 root:

```powershell
npm run setup
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v53
npm run check:ui
npm run verify
```

`migrate:v53` is additive. It does not reset courses, team members, progress, attempts, payments, subscriptions or certificates.

If `verify` reports an install, dependency audit, typecheck or build error, stop and fix the reported issue before deployment. Do not use `npm audit fix --force` just to make the gate green.

## Run locally

Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev:frontend
```

Local URLs:

- Website: `http://localhost:3000`
- Student login: `http://localhost:3000/login`
- Client Admin: `http://localhost:3000/admin/login`
- Super Admin: `http://localhost:3000/super-admin/login`
- API health: `http://localhost:5000/api/health`

## Contact details

Preferred: open **Super Admin → Website content → Contact** and set Email, Phone, Location and optional Map URL. This avoids hard-coding business contact details.

Optional frontend environment fallbacks:

```dotenv
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_CONTACT_LOCATION=
NEXT_PUBLIC_CONTACT_MAP_URL=
```

A frontend environment change requires a frontend rebuild/redeploy.

## Video uploads

The admin UI supports MP4, WebM and MOV uploads up to the configured backend limit (default `MAX_UPLOAD_MB=250`). Upload progress is visible and an active large upload sends session keep-alives.

Upload speed is still determined by the user's upstream bandwidth, hosting ingress speed, malware scanning and MongoDB/GridFS write speed. V53 does not pretend that a 250 MB upload can be instant. For long training videos, an optimized web MP4 or a hosted YouTube/Vimeo URL can provide a faster authoring and streaming experience.

Production upload scanning/security requirements are unchanged.

## PDF/media deployment note

For the recommended same-origin frontend proxy setup, keep:

```dotenv
NEXT_PUBLIC_API_URL=/api
```

and proxy `/api/*` to the Express backend. V53 remaps stored internal `/api/media/<ObjectId>` links to the current API base so media saved under an older localhost/Render URL can still open through the current deployment.

## Production acceptance

Before client handover test at minimum:

1. Client Admin can create/edit a course with the simplified fields.
2. Upload a real video, watch progress, remain logged in, save the lesson, preview the video, then play it as an entitled student.
3. Upload a poster image and confirm it appears on the video player.
4. Upload a PDF, save, open it from Admin and from an entitled student account in the deployed environment.
5. Add/edit a Team member and confirm no slug input appears.
6. Configure Contact email/phone/location in Super Admin and test each clickable action on desktop and mobile.
7. Check header username at narrow mobile widths.
8. Re-test previous V52 flows: signup/auto-login, direct payment sandbox, billing, course resume, Try Again, answers, certificate review/download and admin notifications.
