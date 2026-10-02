# Singh Academy V60 — Enrollment, Video Providers, Contact & Footer

V60 is a focused patch over V59. It does not reset existing users, payments, certificates or course progress.

## Upgrade
1. Copy your existing `backend/.env` into the V60 backend folder.
2. Run `npm run install:all`.
3. Run `npm run migrate:v60` **once against the target database**. This repairs any legacy globally-unique Enrollment index that can prevent a second student from enrolling in the same course, while preserving the intended unique `(user, courseSlug)` rule.
4. Run `npm --prefix backend test`.
5. Run `npm run check:ui` and `npm run verify`.
6. Start with `npm run dev:backend` and `npm run dev:frontend`, or redeploy.

## V60 changes
- Different students can enroll in the same course after the V60 index migration.
- Repeated same-student enroll clicks are idempotent instead of surfacing a duplicate-key message.
- Lessons with no saved video URL/upload no longer render an empty video placeholder.
- Video URLs support YouTube, Vimeo (including unlisted/private-hash share URLs), TikTok, Instagram, TED, Dailymotion, Loom, direct video files and a safe external-link fallback.
- Saved thumbnail/poster remains the click-to-play gate for external or uploaded video.
- Contact page/footer defaults: singh@singhacademy.com, +1 (559) 308 1249, By appointment · USA.
- Footer ends with a linked `Developed by coffeeCODEhub` credit to https://www.coffecodehub.com/.

## Important
For Vimeo videos restricted to specific embed domains, Vimeo must also allow the production Singh Academy domain. The application now preserves the Vimeo unlisted privacy hash when converting share links to player URLs.
