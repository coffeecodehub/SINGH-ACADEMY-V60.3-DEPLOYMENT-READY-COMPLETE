# V57 fix guide

## YouTube Error 153
Root cause in the prior deployment: the site globally sent `Referrer-Policy: no-referrer`. YouTube Error 153 can appear when an embedded player receives no referrer/client identity. V57 changes the site policy to `strict-origin-when-cross-origin`, adds the same policy to the iframe, and uses the privacy-enhanced YouTube embed host.

After deploying V57, redeploy the Next.js frontend so the new response header is live. Then hard-refresh / test in an incognito tab.

## Course loading
V57 parallelizes access/progress/attempt/completion queries, removes repeated O(course × lesson) filtering from My Courses, and adds short public cache headers. This improves warm-server behavior. If the first request still takes 1–3 minutes on Render Free, that is a cold-start/hosting issue; use an always-on backend for production.

## My Courses rule
- Individual course purchase/enrollment: only that active course appears.
- Active Academy membership: all published courses appear.
- Expired individual access: course disappears / access denied.
- Expired membership: membership-granted course access ends.

## Student email verification
A website cannot reliably ask Gmail whether an arbitrary mailbox exists. V57 instead proves ownership by sending a verification link to the address. Until the link is opened, student login returns `EMAIL_VERIFICATION_REQUIRED`.

## Payments
The Stripe/PayPal buttons are intentionally disabled while provider credentials are absent. Obtain merchant test credentials, configure webhooks, set `ONLINE_PAYMENTS_ENABLED=true`, redeploy, and run `npm run payments:check -- --remote --strict-webhooks`.
