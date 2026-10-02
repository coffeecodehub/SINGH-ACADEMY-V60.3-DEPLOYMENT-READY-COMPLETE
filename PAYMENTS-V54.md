# Singh Academy V54 — Stripe + PayPal A-to-Z Setup and Test Guide

This guide is intentionally practical. Follow it in order. Never paste Stripe or PayPal secrets into chat, screenshots, frontend code, GitHub, or Vercel public variables.

## A. What the project now does

The browser never decides the amount. It sends only the course/plan choice and payment provider. The backend reads the saved course/plan price, creates a local checkout order, then creates a hosted provider checkout.

### Stripe

1. Student chooses Stripe.
2. Backend creates a Stripe Checkout Session in `mode=payment`.
3. Student is redirected to Stripe's hosted checkout page.
4. Stripe returns the student to `/checkout/return`.
5. The backend re-reads Stripe's Checkout Session/PaymentIntent and checks the local order ID, user ID, amount, currency, environment and successful collection.
6. Signed Stripe webhooks can perform the same reconciliation even if the student closes the browser.
7. Only then are invoice, payment, enrollment/subscription and notification records written.

### PayPal

1. Student chooses PayPal.
2. Backend authenticates with PayPal using Client ID + Client Secret.
3. Backend creates an Orders v2 order with `intent=CAPTURE` and the local order ID in `custom_id`.
4. Student is redirected to PayPal's approval page.
5. After approval, the backend captures the PayPal order. Browser return and `CHECKOUT.ORDER.APPROVED` webhook use the same idempotent local order.
6. Backend re-reads the PayPal order/capture and checks amount, currency, local order, environment and optional Merchant ID.
7. Only a verified completed capture grants access.

Memberships remain fixed-term one-time purchases. V54 does **not** create automatic recurring Stripe/PayPal subscriptions.

## B. New/important V54 commands

From project root:

```bash
npm run migrate:v54
npm run payments:check
npm run payments:reconcile
```

From backend directly:

```bash
npm --prefix backend run payments:check
npm --prefix backend run payments:check -- --remote
npm --prefix backend run payments:check -- --remote --strict-webhooks
npm --prefix backend run payments:reconcile
```

`payments:check -- --remote` does not create a charge. It authenticates the configured provider API credentials and inspects registered webhook endpoints.

`payments:reconcile` checks already-saved `creating`/`pending` provider orders. It does not create a new checkout. PayPal approved orders are not captured by this recovery command unless the owner intentionally adds `--capture-approved-paypal`.

## C. Keep TEST and LIVE completely separate

Use a separate staging database for sandbox/test payments. Do not run sandbox checkout against the client's live production database.

Recommended:

- Production DB: `singh_academy`
- Staging DB: `singh_academy_staging`

V54 also refuses a mixed configuration such as Stripe TEST + PayPal LIVE.

## D. Stripe TEST setup

### 1. Create/use a Stripe account and enter a Sandbox/Test environment

Use Stripe Dashboard test/sandbox mode. Get the **secret key** (`sk_test_...`). This project uses hosted Checkout and does not need a Stripe publishable key in the browser.

### 2. Add the Stripe webhook

Use a public HTTPS backend URL:

```text
https://YOUR-BACKEND/api/payments/webhooks/stripe
```

Subscribe to these events:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
refund.created
refund.updated
charge.dispute.created
charge.dispute.closed
```

Reveal/copy the endpoint signing secret (`whsec_...`). A Stripe CLI forwarding secret and a Dashboard webhook secret are different; use the one belonging to the endpoint that actually sends the event.

### 3. Backend sandbox variables

```env
ONLINE_PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Do not add these to Vercel `NEXT_PUBLIC_*` variables.

## E. PayPal SANDBOX setup

### 1. Create/open a PayPal REST app

PayPal Developer Dashboard -> Apps & Credentials -> Sandbox -> create/select the Singh Academy REST app.

Copy:

```text
Client ID
Client Secret
```

### 2. Create/use sandbox buyer and business accounts

Use a sandbox buyer to make the test purchase. Do not use a real PayPal payment for the sandbox test.

### 3. Add the PayPal webhook

Webhook URL:

```text
https://YOUR-BACKEND/api/payments/webhooks/paypal
```

Subscribe to:

```text
CHECKOUT.ORDER.APPROVED
CHECKOUT.PAYMENT-APPROVAL.REVERSED
PAYMENT.CAPTURE.PENDING
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.REFUNDED
PAYMENT.CAPTURE.REVERSED
CUSTOMER.DISPUTE.CREATED
CUSTOMER.DISPUTE.RESOLVED
```

PayPal documentation currently uses `PAYMENT.CAPTURE.DENIED` in its checkout-webhook guide while its Payments v2 event catalog also documents `PAYMENT.CAPTURE.DECLINED`. V54 accepts either failure event. If your Dashboard exposes both, subscribing to both is safe; the V54 strict checker treats DECLINED as an accepted equivalent for DENIED.

After saving the webhook, copy its **Webhook ID**. This is not the Client ID.

### 4. Backend sandbox variables

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_SANDBOX_CLIENT_SECRET
PAYPAL_WEBHOOK_ID=YOUR_SANDBOX_WEBHOOK_ID
PAYPAL_MERCHANT_ID=
```

`PAYPAL_MERCHANT_ID` is optional for this direct-merchant integration. If the owner supplies it, V54 binds and cross-checks that 13-character account ID on provider truth.

### Important PayPal simulator note

V54 uses PayPal's **postback verify-webhook-signature API**. PayPal says mock events from its Webhook Simulator cannot be verified through that postback endpoint. Therefore, do the final PayPal webhook test using a real **sandbox checkout transaction**, not only the simulator.

## F. Backend sandbox environment — both providers

For a test backend:

```env
NODE_ENV=development
ONLINE_PAYMENTS_ENABLED=true
PAYMENTS_REQUIRE_BOTH=true

FRONTEND_URL=https://YOUR-STAGING-FRONTEND
FRONTEND_URLS=https://YOUR-STAGING-FRONTEND
PUBLIC_API_URL=/api
PAYMENT_WEBHOOK_BASE_URL=https://YOUR-PUBLIC-BACKEND

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MERCHANT_ID=
PAYPAL_WEBHOOK_ID=...
```

Keep all existing V53 auth, MFA, MongoDB, SMTP, upload-scanner and admin settings unchanged unless the deployment itself requires them.

## G. Vercel frontend + Render backend

V54 includes an environment-driven same-origin API rewrite. This avoids browser cookie/CORS/CSP problems while allowing provider webhooks to hit the backend directly.

### Vercel variables

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=https://YOUR-RENDER-BACKEND
```

For the deployment used earlier in this project, the shape would be:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=https://singh-academy-api.onrender.com
```

Redeploy Vercel after changing `NEXT_PUBLIC_*` values because they are compiled into the frontend build.

### Render backend variables

```env
FRONTEND_URL=https://YOUR-VERCEL-FRONTEND
FRONTEND_URLS=https://YOUR-VERCEL-FRONTEND
PUBLIC_API_URL=/api
PAYMENT_WEBHOOK_BASE_URL=https://YOUR-RENDER-BACKEND
```

Provider webhook URLs should use the stable direct backend origin:

```text
https://YOUR-RENDER-BACKEND/api/payments/webhooks/stripe
https://YOUR-RENDER-BACKEND/api/payments/webhooks/paypal
```

Do not use a sleeping/free backend for real client payments. Use an always-on production service with a stable HTTPS URL.

## H. Hostinger / same-domain deployment

If frontend and backend are served behind the same public origin, for example `https://singhacademy.com` with `/api` reverse-proxied to Express:

```env
FRONTEND_URL=https://singhacademy.com
FRONTEND_URLS=https://singhacademy.com
PUBLIC_API_URL=/api
PAYMENT_WEBHOOK_BASE_URL=https://singhacademy.com
```

Frontend:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=
```

Then the webhook URLs are:

```text
https://singhacademy.com/api/payments/webhooks/stripe
https://singhacademy.com/api/payments/webhooks/paypal
```

## I. Install and run V54 locally

```bash
npm run setup
npm run install:all
npm --prefix backend run migrate:v54
npm --prefix backend run preflight
```

Development terminals:

```bash
npm run dev:backend
```

and

```bash
npm run dev:frontend
```

Before testing checkout:

```bash
npm run payments:check
```

Expected result: Stripe and PayPal local configuration should both say `PASS`.

## J. Remote provider configuration check

Once your staging backend has provider credentials and registered webhook URLs:

```bash
npm --prefix backend run payments:check -- --remote --strict-webhooks
```

It checks:

- online payments enabled;
- both provider configurations when `PAYMENTS_REQUIRE_BOTH=true`;
- Stripe API credential authentication;
- Stripe registered webhook URL and event subscriptions;
- PayPal API credential authentication;
- configured PayPal Webhook ID;
- PayPal webhook URL and event subscriptions;
- no mixed test/live provider environments.

It never prints secret values and does not create a charge.

## K. Create a test product

In Client Admin/Super Admin course management, make sure a published paid course has:

- published status;
- access type set to a paid individual course option;
- valid price greater than zero;
- supported currency: USD, EUR, GBP, CAD or AUD;
- at least one price option if you use pricing options.

For membership testing, make sure an active Academy Plan has a price, supported currency and duration.

The browser cannot override these values; the backend reads them from the database.

## L. Create a fresh student

Use a test student account that does not already have access to the course/membership being purchased.

Log in as the student and open:

```text
Course -> Purchase/Checkout
```

Both buttons should be enabled:

```text
Pay with Stripe
Pay with PayPal
```

If either says `Not connected yet`, run `payments:check` and fix that provider's environment settings.

## M. Stripe SUCCESS test

1. Choose Stripe.
2. You should be redirected to `checkout.stripe.com`.
3. Use Stripe's standard successful test Visa:

```text
4242 4242 4242 4242
```

Use any future expiry date and any valid CVC.
4. Complete the hosted checkout.
5. You should return to `/checkout/return?order=...`.
6. Page should become `PAYMENT CONFIRMED`.

Then verify:

- My Courses: course access exists, or membership access is active.
- My Billing: paid invoice and payment receipt exist.
- Client Admin payment/subscription views show the transaction.
- Stripe Dashboard shows the successful test Checkout/PaymentIntent.
- Backend has only one invoice/payment for this local order.

## N. Stripe failure and authentication tests

Official Stripe test values currently include:

```text
Successful:       4242 4242 4242 4242
3DS/auth test:    4000 0025 0000 3155
Declined:         4000 0000 0000 9995
```

For a declined payment, Singh Academy must not grant course or membership access.

## O. Stripe browser-close/webhook test

This verifies that access does not depend on the success page.

1. Start a Stripe test checkout.
2. Complete payment.
3. Close the payment/browser tab immediately instead of relying on the Singh Academy return page.
4. Wait for the signed Stripe webhook.
5. Log back into Singh Academy.
6. My Billing/My Courses should reflect the verified successful payment.

The webhook is the reliable fulfillment path; the browser return is a second reconciliation path.

## P. PayPal SUCCESS sandbox test

1. Log into Singh Academy using the test student.
2. Choose PayPal.
3. Confirm that the browser goes to `www.sandbox.paypal.com`.
4. Log in using the PayPal **sandbox buyer** account.
5. Approve the payment.
6. V54 will capture the approved order server-side.
7. Return to Singh Academy.
8. `/checkout/return` should show confirmed status after provider verification.

Verify:

- PayPal sandbox activity shows the order/capture completed.
- My Billing has one payment and paid invoice.
- My Courses or membership access is active.
- The stored amount/currency equals the server course/plan price.

## Q. PayPal browser-close/webhook test

Repeat a PayPal sandbox purchase with another test student/product. After approving PayPal, close the browser before the normal application return completes.

The registered `CHECKOUT.ORDER.APPROVED` webhook should allow the backend to capture/reconcile the saved order. A later `PAYMENT.CAPTURE.COMPLETED` webhook/provider API check confirms settlement.

Do not use the PayPal Simulator as the only end-to-end test because this project intentionally verifies real webhook signatures through PayPal's postback endpoint.

## R. Cancellation/failure tests

Test these before go-live:

- cancel Stripe checkout before payment -> no access;
- Stripe decline -> no access;
- let a Stripe session expire -> order becomes expired, no access;
- cancel PayPal approval -> no access;
- PayPal capture denied/declined -> order becomes failed, no access;
- PayPal approval reversed -> order becomes cancelled, no access.

Never create a second payment merely because the return page is slow. Use `Check payment status`, My Billing, provider dashboard or the reconciliation command first.

## S. Refund test

Use provider dashboards/APIs to refund a sandbox/test payment.

Expected behavior after the signed provider refund webhook:

- refund record is written once;
- invoice credit is updated;
- payment refunded amount is updated;
- full refund revokes access tied to that invoice;
- partial refund keeps the access and records the partial credit;
- duplicate webhook delivery does not double-credit the invoice.

Dispute/reversal events create a review notification rather than silently inventing a refund decision.

## T. Duplicate/webhook retry test

Providers can deliver a webhook more than once. V54 stores provider event keys and fulfillment is idempotent.

After one successful test payment, resend the same provider webhook from the provider's event/dashboard tooling where supported. Confirm there is still only:

- one local paid checkout;
- one payment record;
- one invoice for that checkout;
- one access grant/term associated with that fulfillment.

## U. Recovery command

If a browser timed out or a webhook was delayed, do not blindly pay again.

Run:

```bash
npm --prefix backend run payments:reconcile
```

This checks provider truth for saved open orders.

For an already-approved PayPal order that the owner intentionally wants the recovery job to capture:

```bash
npm --prefix backend run payments:reconcile -- --capture-approved-paypal
```

Use that flag deliberately; it can create the capture for an already-approved PayPal order.

## V. Before switching LIVE

All sandbox tests above should pass first. Then create/use LIVE provider credentials and **new LIVE webhook registrations**. Test and live webhook signing IDs/secrets are not interchangeable.

### Stripe production

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Register the production webhook endpoint and required events using the real production backend URL.

### PayPal production

```env
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=LIVE_CLIENT_ID
PAYPAL_CLIENT_SECRET=LIVE_CLIENT_SECRET
PAYPAL_WEBHOOK_ID=LIVE_WEBHOOK_ID
PAYPAL_MERCHANT_ID=
```

Create a separate live webhook registration pointing at the production backend URL.

## W. Production backend values

```env
NODE_ENV=production
ONLINE_PAYMENTS_ENABLED=true
PAYMENTS_REQUIRE_BOTH=true
PAYMENT_WEBHOOK_BASE_URL=https://YOUR-PRODUCTION-BACKEND-OR-SAME-ORIGIN
```

Keep the existing production values for MongoDB, auth secrets, MFA, SMTP, scanner and origins.

V54 production checks intentionally reject Stripe test credentials or `PAYPAL_MODE=sandbox`.

## X. Final production checks

Run on the production backend host after all live env vars are saved:

```bash
npm --prefix backend run preflight
npm --prefix backend run migrate:v54
npm --prefix backend run payments:check -- --remote --strict-webhooks
```

Do **not** proceed with a live client payment if any of these commands prints `FAIL` or exits non-zero.

Then restart/redeploy the backend.

## Y. One small real-money acceptance test

Only after the client/account owner authorizes it, make one low-value real purchase and verify all five sides:

1. provider dashboard says completed/paid;
2. Singh Academy checkout says confirmed;
3. Client Admin has the payment/invoice;
4. student has the correct access dates;
5. My Billing receipt matches amount/currency/provider reference.

If any side disagrees, stop new live payments and reconcile before continuing.

## Z. Production handover checklist

- [ ] Always-on HTTPS backend; no free-service sleep for live payments.
- [ ] Stable frontend and backend/same-origin URLs.
- [ ] `NEXT_PUBLIC_API_URL=/api` for split/same-origin browser access.
- [ ] `API_PROXY_TARGET` set only when Next.js must proxy to another backend host.
- [ ] Separate production MongoDB from sandbox/staging DB.
- [ ] Stripe LIVE secret key stored only in backend secret settings.
- [ ] Stripe LIVE webhook endpoint registered with required events.
- [ ] Correct Stripe LIVE `whsec_...` used.
- [ ] PayPal LIVE REST app credentials stored only in backend.
- [ ] PayPal LIVE webhook endpoint + Webhook ID configured.
- [ ] `ONLINE_PAYMENTS_ENABLED=true`.
- [ ] `PAYMENTS_REQUIRE_BOTH=true`.
- [ ] `payments:check -- --remote --strict-webhooks` passes.
- [ ] `preflight` passes.
- [ ] Success, decline/cancel, browser-close, refund and duplicate-event scenarios tested in sandbox.
- [ ] Provider dashboards and Singh Academy records agree.
- [ ] No secret is committed to GitHub or placed in frontend public variables.

## Official references used when finalizing V54

Stripe:
- https://docs.stripe.com/checkout/quickstart
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/testing

PayPal:
- https://developer.paypal.com/api/rest/integration/orders-api
- https://developer.paypal.com/api/rest/authentication/
- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/payment-methods/webhooks/
- https://developer.paypal.com/api/rest/webhooks/simulator/
- https://developer.paypal.com/sandbox-testing/overview/
