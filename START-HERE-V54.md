# Singh Academy V54 — Stripe + PayPal Final Payment Release

V54 is an additive payment-hardening release based on V53. The approved course/media/contact/mobile fixes remain in place. No public page layout, course lesson UI, team UI, contact UI, certificate design, or admin content workflow was redesigned for V54.

## What V54 finalizes

- Stripe-hosted Checkout for one-time course and fixed-term membership purchases.
- PayPal Orders v2 hosted approval/capture flow.
- Server-authoritative prices, currency, access duration and membership duration.
- Provider-side verification before enrollment/subscription access is granted.
- Signed Stripe and PayPal webhooks, idempotent fulfillment, refund mirroring and dispute review notices.
- Browser-return reconciliation plus webhook fulfillment if the buyer closes the tab.
- Failed/expired/reversed checkout state handling.
- Deployment checks that can require both Stripe and PayPal.
- `payments:check` command to validate configuration and, optionally, authenticate provider credentials and compare registered webhooks.
- `payments:reconcile` recovery command for saved pending provider orders.
- Same-origin `/api` proxy support for split frontend/backend hosting without changing the visible frontend UI.

## First install

```bash
npm run setup
npm run install:all
npm --prefix backend run migrate:v54
npm --prefix backend run preflight
npm run check:ui
npm run verify
```

`npm run install:all` creates dependency lockfiles when they are absent. Review and commit those lockfiles before a production deployment.

## Payment configuration

Do not put provider secrets in frontend environment variables or GitHub. Configure them only on the backend host.

Sandbox/test example:

```env
ONLINE_PAYMENTS_ENABLED=true
PAYMENTS_REQUIRE_BOTH=true
PAYMENT_WEBHOOK_BASE_URL=https://YOUR-PUBLIC-BACKEND

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MERCHANT_ID=
PAYPAL_WEBHOOK_ID=...
```

Production must use Stripe live keys and `PAYPAL_MODE=live`. V54 deliberately rejects test/sandbox checkout on a `NODE_ENV=production` backend.

For full setup and testing, read `PAYMENTS-V54.md`.
