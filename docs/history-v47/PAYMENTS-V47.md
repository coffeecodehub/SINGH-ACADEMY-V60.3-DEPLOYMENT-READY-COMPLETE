# V47 Stripe + PayPal hosted checkout

## Agreed flow

**Course or fixed-term membership -> Stripe/PayPal -> verified payment -> access.** The normal student journey no longer requires a manual enrollment request or an admin-generated invoice. A paid invoice/receipt is generated automatically after provider verification for records. Existing manual tools remain optional.

Membership payment is one-time for the selected number of months. Renewals are new deliberate purchases; automatic monthly card charging/provider subscription billing is NOT enabled. Stripe currently presents card checkout, PayPal presents its hosted account/payment experience. Availability to your business/buyers is determined by your actual merchant account; this package does not approve/open an account or bypass provider restrictions.

A server-side published course/active plan supplies the title, currency, amount and access period. Browser-submitted prices are ignored. Duplicate success/webhook notifications cannot intentionally create duplicate local receipts/access. Amount/currency/order/customer/environment mismatch, pending payment or signature failure does not grant new paid access. The database must support transactions before payment creation.

## Configuration — backend only

Use the account owner's actual credentials; never send them in chat. Use one consistent test/sandbox environment and a separate staging database first.

```dotenv
ONLINE_PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=YOUR_OWN_STRIPE_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_OWN_STRIPE_ENDPOINT_SIGNING_SECRET
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=YOUR_OWN_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_OWN_SANDBOX_CLIENT_SECRET
PAYPAL_MERCHANT_ID=YOUR_OWN_SANDBOX_MERCHANT_ID
PAYPAL_WEBHOOK_ID=YOUR_OWN_REGISTERED_SANDBOX_WEBHOOK_ID
```

These are placeholders, not usable keys. Keep existing auth/database/MFA values. Both methods need their own complete settings to be enabled. `PAYPAL_MERCHANT_ID` is the receiving business merchant ID, not the API client ID. The webhook ID belongs to the same PayPal REST app/environment.

No frontend publishable/client key is needed for this release's hosted redirect flow. The backend creates the hosted session/order. Sensitive card or PayPal login fields are not collected in our form.

`FRONTEND_URL` is used for success/cancel return URLs and certificate verification URLs. Set it to the actual user-facing origin. Production uses the same HTTPS origin for website and `/api`, with the reverse proxy preserving the webhook request body.

## Stripe

Create/register the endpoint on your account (test and live endpoints have different signing secrets):

```text
https://YOUR_OWNED_HOSTNAME/api/payments/webhooks/stripe
```

Subscribe to these events used by the implementation:

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

For local development with your installed authorized Stripe CLI:

```powershell
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhooks/stripe
```

Keep the listener open; place **its** displayed signing secret in the local `STRIPE_WEBHOOK_SECRET`, then restart the backend. Do not confuse a CLI secret with the separately registered dashboard endpoint secret. Perform a real test Checkout through this application using Stripe's published test payment details, not a fake application-success route. A generic CLI fixture alone is not an application-order fulfillment test.

Verify payment return, the webhook event, one local paid record, correct access, My Billing, and the corresponding provider dashboard record. Also test paying successfully and closing the browser before returning: the webhook still needs to fulfill the order.

## PayPal

Create/use the business owner's REST app and sandbox business/buyer accounts. Register:

```text
https://YOUR_OWNED_STAGING_HOSTNAME/api/payments/webhooks/paypal
```

Subscribe to:

```text
CHECKOUT.ORDER.APPROVED
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.PENDING
PAYMENT.CAPTURE.REFUNDED
PAYMENT.CAPTURE.REVERSED
CUSTOMER.DISPUTE.CREATED
CUSTOMER.DISPUTE.RESOLVED
```

PayPal must be able to reach the endpoint. Use an owner-controlled HTTPS staging environment; localhost alone is not reachable by the external provider. Match `FRONTEND_URL`, registered webhook ID, merchant ID, API app and mode. Do not copy another environment's webhook ID.

The backend creates an Orders v2 CAPTURE order. Approval from the return path or verified APPROVED webhook triggers an idempotent capture; then the backend retrieves the order and checks the completed capture, exact amount/currency, local order binding, merchant and environment. An approval/URL alone is not payment. The webhook signature is checked through PayPal's verification API.

Perform an actual sandbox buyer approval/capture, test cancellation, reload and duplicate delivery, and inspect both provider and local records. A webhook simulator or mocked test response alone does not prove a merchant-account purchase works.

## Test vs live / reporting

Test/sandbox receipts, invoices, refunds and entitlements are explicitly marked. Sandbox collections are excluded from real collection totals, and production access checks exclude test entitlements. Use an entirely separate staging database rather than mixing test learners/completion history into production. Test payments must never be described to clients as revenue.

For production, use the real owner-approved live credentials, `PAYPAL_MODE=live`, live registered webhook secrets/IDs and live merchant ID. Set `NODE_ENV=production`, HTTPS, verified SMTP, required admin MFA/email verification and upload scanning. Preflight rejects test gateways enabled as live production checkout.

Complete one controlled real transaction/refund only with the account owner's authorization and retain verification evidence privately. No live transaction was performed during development of this package.

## Refunds and operational cases

Completed Stripe/PayPal refunds made at the provider are retrieved and mirrored in local refund/credit history through verified events. A complete refund cancels only access linked to that invoice; a partial refund preserves access. Original gross receipts remain historical and credits do not automatically invent new debt.

This release does not add an admin button that transfers a refund to a card/bank. Disputes/reversals create review notifications, not automatic final accounting or dispute resolution. Monitor the provider dashboard and application notifications, reconcile unhandled/pending events, and repair downtime by redelivering the original signed events. A scheduled provider reconciliation job is not implemented.

Concurrent independently paid purchases for an already accessible course preserve existing access and flag the duplicate for review; an actual second payment is never hidden. Membership renewals extend a term using calendar-month boundaries. Membership access and direct course enrollment may overlap; revoking one is not necessarily equivalent to blocking all account access.

Course prices are USD `$` by default. Hosted checkout allows USD, EUR, GBP, CAD and AUD in this implementation; unsupported currency must be corrected before checkout, not silently converted. Taxes, provider fees, net profit and bank settlement reconciliation are outside the current operational collections dashboard.

## Primary implementation references

- Stripe fulfillment: https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted
- Stripe signature/body handling: https://docs.stripe.com/webhooks/signature
- PayPal Orders v2 capture: https://developer.paypal.com/api/orders/v2/orders-capture
- PayPal webhook verification: https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post

These explain provider contracts; they do not certify that this project's live integration has been tested.
