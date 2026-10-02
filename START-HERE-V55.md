# Singh Academy V55 — My Courses + PDF Download + Video Thumbnail Fix

V55 is a **targeted regression-fix release on top of V54**. Stripe/PayPal payment code, course/payment records, approved public pages, certificate flow, contact fixes, team fixes and V53 upload/session changes are preserved.

## What was actually wrong

### 1. My Courses disappeared from the header
The header rendered the course link only when `/auth/session` returned a current enrollment object. That meant a valid signed-in student could lose the navigation item when there was no currently-active enrollment object, even though `/my-course` itself was still a valid page.

V55 shows **My Courses** for every signed-in student. The page itself still decides whether to show enrolled courses or the existing empty state. It is also marked active while the student is inside `/learn/...`.

### 2. Lesson PDF said “Download” but was opened inline
The student link used `target="_blank"`, while the media endpoint deliberately served PDFs inline. That was not a deterministic download flow and could produce browser/PDF-viewer errors depending on hosting/proxy behavior.

V55 adds an explicit internal download URL (`?download=1`). The backend then returns `Content-Disposition: attachment` with the GridFS filename. Uploaded lesson PDFs, uploaded document blocks, and uploaded learning resources use this download flow. External document URLs still open externally because Singh Academy cannot force a third-party server to download a file.

The Client Admin media field now also shows **Download file ↓** for uploaded PDF/DOC/DOCX resources.

### 3. Saved video thumbnail did not appear for external videos
The V53 thumbnail fields were saved correctly, but the course player immediately rendered YouTube/Vimeo/TED as an iframe. HTML iframe players do not use the native `<video poster>` attribute, so the custom thumbnail was bypassed for external videos.

V55 uses the saved thumbnail as a real click-to-play poster for **both uploaded videos and external videos**. The Client Admin lesson editor uses the same visual preview behavior.

## Upgrade

1. Back up the current database.
2. Deploy the V55 code over V54.
3. Keep the same backend `.env` / hosting secrets.
4. Run:

```bash
npm run install:all
npm --prefix backend run migrate:v55
npm --prefix backend run preflight
npm run check:ui
npm run verify
```

`migrate:v55` is non-destructive. It does not rewrite courses, payments, enrollments, PDFs, videos or thumbnails.

## Acceptance test

1. Sign in with a student account with no current course access: **My Courses** must still be visible in the header.
2. Click My Courses: the existing enrolled-course list or empty state must load.
3. In Client Admin, edit a lesson, upload an MP4 or set a YouTube/Vimeo URL, upload a Video thumbnail / poster, then **Save lesson**.
4. Open that lesson as the student: the custom thumbnail must be shown before playback. Click it to reveal/play the video.
5. Upload a PDF to the lesson, save the lesson, open it as the student, then click **Download lesson PDF**. It must download using the saved GridFS filename instead of relying on the browser PDF viewer.
6. In Client Admin, the uploaded document field should show both **Open file ↗** and **Download file ↓**.
7. Re-test Stripe and PayPal checkout from V54. V55 does not modify provider checkout, webhook or fulfillment code.
