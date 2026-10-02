# Singh Academy V57 — start here

V57 is an additive fix release based on V56. It preserves the approved public website except the explicitly requested header, review-flow and lesson-player changes.

## What changed
- Course-opening queries are parallelized and grouped to reduce warm-server latency; public catalog/detail/reviews get short cache headers.
- My Courses now lists only active individually purchased/enrolled courses, or all published courses while an Academy membership is active.
- YouTube lesson embeds use youtube-nocookie plus `strict-origin-when-cross-origin`, fixing the missing-referrer condition that causes YouTube Error 153 on many deployments.
- A lesson thumbnail remains the click target; clicking it starts the embedded video with autoplay.
- My Courses uses the same normal header color as the other navigation links; only the active route gets the standard active style.
- Student passwords require 8+ characters. Admin password policy remains 12+ characters.
- New student accounts must verify ownership of the email inbox before login. This is the reliable way to stop invented addresses from signing in; syntax/domain shape alone cannot prove a Gmail mailbox exists.
- Review moderation/approval was removed from admin UI/API. New student reviews publish immediately. Existing pending reviews are published by the V57 migration; previously rejected reviews stay rejected.
- The certificate approval checkbox is removed. Required completion/assessment evidence still has to exist, and Client Admin can issue a certificate or choose Try Again.
- V57 migration regenerates all already-issued certificate PDFs with the single approved universal Singh Academy certificate template; only student/course/date/number data differs.
- Stripe/PayPal hosted checkout remains unchanged and secure. Buttons stay disabled until real test/live provider credentials are configured.

## Upgrade
1. Copy your existing backend `.env` into this release.
2. Keep payments disabled until keys exist.
3. For production email verification, configure SMTP before opening registration.

```bash
npm run install:all
npm run migrate:v57
npm --prefix backend run preflight
npm run check:ui
npm run verify
```

Development:
```bash
npm run dev:backend
npm run dev:frontend
```

## Email verification
Set in backend environment:
```env
REQUIRE_EMAIL_VERIFICATION=true
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Singh Academy <verified-sender@yourdomain.com>
```

New users receive a verification link and cannot sign in until it is opened.

Legacy V52 instant-signup accounts that were already marked `emailVerified=true` cannot be distinguished from genuinely verified accounts. If the Academy wants every existing student to prove inbox ownership, first verify SMTP delivery, then intentionally run:
```bash
npm run students:require-reverification -- --confirm
```
This signs out all student accounts and requires them to use **Resend verification** before logging in again. It does not affect Client Admin or Super Admin.

## Payment status
`Not connected yet` is expected while these are blank / disabled:
```env
ONLINE_PAYMENTS_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
```
No code release can generate merchant secrets. After Stripe Test and PayPal Sandbox credentials + webhooks are configured, set `ONLINE_PAYMENTS_ENABLED=true`, redeploy, and run:
```bash
npm run payments:check -- --remote --strict-webhooks
```

## Performance note
V57 reduces application/query overhead, but a sleeping/free backend can still take tens of seconds or minutes to wake. For client production, use an always-on backend instance. Code changes cannot eliminate a hosting cold start.
