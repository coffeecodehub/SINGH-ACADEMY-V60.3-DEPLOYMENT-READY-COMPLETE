# Singh Academy V57 QA report

## Checks executed in the release workspace
- Backend JavaScript syntax: all `backend/src/**/*.js` checked with `node --check` — PASS.
- Frontend TypeScript/TSX parser: 88 files parsed — 0 syntax diagnostics.
- Local relative imports: 223 checked — 0 missing.
- Backend JS files in source check: 146 checked — 0 syntax/import errors.
- Preserved public UI baseline: 252 protected files — 0 unexpected differences. Explicitly requested header, reviews and lesson-player files are excluded from the preservation baseline.
- Search for user-facing review moderation/approval language in active frontend/admin/controller paths — none found.

## Key regression assertions from source
- `My Courses` no longer adds free/unpurchased courses to an individual student list.
- Active Academy membership still unlocks all published courses during its active date range.
- YouTube embeds use `youtube-nocookie.com`, strict-origin referrer policy and click-to-play thumbnail behavior.
- Student login rejects a correct password when `emailVerified` is false.
- Student registration/reset use an 8-character minimum; admin security policy remains 12 characters by default.
- Review admin management route is removed from the admin CMS model map and navigation.
- Certificate issuance no longer requires a manual review-acknowledgement checkbox.
- V57 migration regenerates issued certificates using the one certificate PDF generator.

## Not executed here
The archive does not contain package-lock files or installed node_modules, so a full Next production build, MongoDB integration tests, SMTP delivery, YouTube browser playback, Stripe/PayPal provider transactions, and real deployed latency were not executed in this workspace.

Run after dependency install / staging deployment:
```bash
npm run migrate:v57
npm --prefix backend run preflight
npm run check:ui
npm run verify
```
Then perform real-browser acceptance for YouTube, email verification, My Courses, certificate download, and payment sandbox flows.
