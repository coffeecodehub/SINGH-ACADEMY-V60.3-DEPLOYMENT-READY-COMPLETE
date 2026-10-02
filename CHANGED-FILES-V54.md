# Singh Academy V54 — Change Scope

V54 is intentionally narrow: payment finalization + deployment plumbing only. It is based on V53 and does not redesign the public website or existing admin/course/media/contact/certificate flows.

## Backend payment changes

- `backend/src/services/paymentProviders.js`
  - Stripe hosted Checkout remains server-created and one-time.
  - Eligible Stripe Checkout methods can follow Stripe Dashboard configuration.
  - PayPal Orders v2 create/capture uses deterministic idempotency request IDs.
  - PayPal direct-merchant configuration no longer requires Merchant ID; if supplied it is verified against provider truth.
- `backend/src/services/gatewayWebhooks.js`
  - Explicit Stripe async failure/expiry state handling.
  - PayPal approval-reversal handling.
  - PayPal capture failure accepts both `PAYMENT.CAPTURE.DENIED` and `PAYMENT.CAPTURE.DECLINED`.
  - Successful settlement/refund/dispute flows remain provider-verified and idempotent.
- `backend/src/utils/commerce.js`
  - PayPal Webhook ID is required for a connected PayPal method.
  - Optional Merchant ID validation.
- `backend/src/utils/deployment.js`
  - Optional `PAYMENTS_REQUIRE_BOTH=true` gate.
  - Test/live provider mixing rejected.
  - `PAYMENT_WEBHOOK_BASE_URL` validation and split-host warning.
- `backend/src/scripts/checkPayments.js`
  - New config/remote provider validation command.
- `backend/src/scripts/reconcilePayments.js`
  - New recovery/reconciliation command for saved open provider orders.
- `backend/src/scripts/migrateV54.js`
  - Additive/no-destructive migration marker.
- `backend/.env.example`
  - V54 payment deployment variables documented.

## Deployment-only frontend changes

No React page/component/style was changed for V54.

- `frontend/next.config.ts`
  - Optional `API_PROXY_TARGET` same-origin `/api` rewrite for Vercel frontend + separate backend hosting.
- `frontend/.env.example`
  - Documents local direct API vs production same-origin proxy variables.
- `frontend/package.json`
  - Version metadata only.

## Release/tests/docs

- Root/backend/frontend version metadata moved to V54 where applicable.
- V54 payment regression tests added/extended.
- `START-HERE-V54.md`
- `PAYMENTS-V54.md`
- `QA-V54.md`

## Explicitly preserved

V54 does not intentionally alter:

- public page design/layout/colors;
- V53 course placeholders/field removals;
- long video upload/session keepalive;
- video thumbnail/player behavior;
- PDF media remapping/opening;
- team slug hiding/auto-generation;
- contact page clickable data;
- mobile header username fix;
- authentication/signup behavior;
- certificate design/issuance workflow;
- student progress, Try Again, My Billing, course access logic other than payment settlement state handling;
- existing database records.
