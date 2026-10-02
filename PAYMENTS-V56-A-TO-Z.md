# Stripe + PayPal A-to-Z Setup (V56)

The code integration is already present. If checkout says **Not connected yet**, the provider credentials/webhook secrets are not configured in the deployed backend. Never put provider secret keys in the frontend or GitHub.

## 1. Backend environment
```env
ONLINE_PAYMENTS_ENABLED=true
PAYMENTS_REQUIRE_BOTH=true
PAYMENT_WEBHOOK_BASE_URL=https://YOUR-BACKEND-DOMAIN

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MERCHANT_ID=
PAYPAL_WEBHOOK_ID=...
```

## 2. Stripe test setup
- Stripe Dashboard: use test mode and copy the test Secret key.
- Create webhook endpoint: `https://YOUR-BACKEND-DOMAIN/api/payments/webhooks/stripe`.
- Subscribe to these events used by V56:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `refund.created`
  - `refund.updated`
  - `charge.dispute.created`
  - `charge.dispute.closed`
- Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
- Redeploy backend.

Test cards:
- Success: `4242 4242 4242 4242`
- 3DS: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 9995`
Use any future expiry and valid CVC in test mode.

## 3. PayPal sandbox setup
- PayPal Developer Dashboard: create/select a Sandbox REST app.
- Copy Client ID and Secret.
- Create a webhook for `https://YOUR-BACKEND-DOMAIN/api/payments/webhooks/paypal`.
- Subscribe to these events used by V56:
  - `CHECKOUT.ORDER.APPROVED`
  - `CHECKOUT.PAYMENT-APPROVAL.REVERSED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.DENIED` (or provider equivalent `PAYMENT.CAPTURE.DECLINED`)
  - `PAYMENT.CAPTURE.PENDING`
  - `PAYMENT.CAPTURE.REFUNDED`
  - `PAYMENT.CAPTURE.REVERSED`
  - `CUSTOMER.DISPUTE.CREATED`
  - `CUSTOMER.DISPUTE.RESOLVED`
- Copy its Webhook ID to `PAYPAL_WEBHOOK_ID`.
- Keep `PAYPAL_MODE=sandbox` while testing.
- Use a Sandbox Personal account as buyer and Sandbox Business account as merchant.
- Redeploy backend.

## 4. Verify configuration
```bash
npm run payments:check -- --remote --strict-webhooks
```
Both Stripe and PayPal should report configured before client acceptance testing.

## 5. End-to-end acceptance
### Individual course
1. Client Admin sets course price and e.g. 3-month/6-month access term.
2. Student logs in -> course -> Individual course -> Stripe or PayPal.
3. Hosted provider page opens.
4. Complete sandbox payment.
5. Return page confirms payment.
6. My Courses shows that course.
7. Its access end date is the paid term; after expiry the learning API rejects access.
8. Buy the same course again and confirm its expiry extends.

### Academy membership
1. Client Admin creates a 1/6/12 month Academy Plan.
2. Student chooses membership -> Stripe or PayPal.
3. Complete sandbox payment.
4. My Courses shows every published course.
5. When membership `endsAt` passes, Academy-wide course access stops automatically.
6. Buy another membership term and confirm expiry extends from the existing active membership end.

## 6. Browser-close/webhook test
Complete payment but close the tab before returning to Singh Academy. Re-open the site after the webhook arrives. Access and billing should still be present. This confirms fulfillment is provider-verified, not dependent on the browser redirect.

## 7. Go live
Only after all sandbox tests pass:
- Stripe: replace `sk_test_...` with live Secret key and create a separate live webhook/signing secret.
- PayPal: set `PAYPAL_MODE=live`, use live app credentials and create a separate live webhook.
- `NODE_ENV=production` and HTTPS frontend/backend.
- Run `npm run payments:check -- --remote --strict-webhooks` again.
- Perform one small owner-approved real transaction through each provider and verify payment, invoice, My Courses, expiry and admin records.
