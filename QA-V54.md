# Singh Academy V54 — QA Report

Release focus: Stripe + PayPal finalization on top of V53 without public UI redesign.

## Automated checks completed in the build workspace

### Backend regression suite

Command:

```bash
node --test test/*.test.js
```

Result:

```text
657 tests
657 passed
0 failed
0 skipped
```

Coverage represented by this suite includes existing authentication/business/certificate/course/media behavior plus payment pricing/evidence, webhook replay, provider mismatch rejection, refunds, PayPal capture idempotency, Stripe raw webhook verification behavior, failed/expired payment states and V54 deployment checks.

### Source syntax/local import check

Command used with the available TypeScript parser:

```bash
TYPESCRIPT_PATH=<typescript> node scripts/check-source.cjs
```

Result:

```text
Frontend: 88 TS/TSX files parsed
Backend: 140 JavaScript files checked
Relative frontend imports checked: 223
Syntax/import errors: 0
```

This is a syntax/local-file-resolution check; it is not a substitute for a dependency-installed Next.js production build.

### Protected public UI baseline

Command:

```bash
node scripts/check-preserved-ui.mjs
```

Result:

```text
252 protected public files checked
0 unexpected differences
```

A direct V53 -> V54 frontend comparison additionally found no changed visible page/component/style files. V54 frontend differences are limited to `.env.example`, `next.config.ts`, and version metadata in `package.json`.

### JavaScript parse check

All project backend/script `.js`, `.mjs`, and `.cjs` files were parsed with `node --check` successfully.

## Payment-specific protections verified in code/tests

- Server database price is authoritative; browser price/currency/access injection is ignored.
- Stripe hosted Checkout uses a saved local order ID and server-side verification before fulfillment.
- Stripe signed webhook route is mounted before global JSON parsing and verifies raw request bytes.
- PayPal Orders v2 create/capture is server-side and uses deterministic idempotency request IDs.
- PayPal webhook messages are verified using the configured Webhook ID and PayPal verification API before processing.
- PayPal approved order can be captured from the webhook path if the buyer does not return to the site.
- Stripe async failure/expiry and PayPal denied/declined/approval-reversed events close the local checkout without access grant.
- Duplicate webhook events do not duplicate fulfillment.
- Full verified provider refunds revoke linked access; partial refunds retain it and update credits.
- Provider disputes/reversals are surfaced for review rather than silently inventing financial outcomes.
- Production can be configured to require both providers.
- Test/live provider environments cannot be mixed.
- Production backend rejects sandbox/test checkout.
- Split-host deployment has an optional same-origin `/api` proxy while provider webhooks can target the direct backend origin.

## Checks that require the owner's real provider/deployment environment

These cannot be truthfully completed without the owner's private Stripe/PayPal accounts, provider secrets, public webhook registrations, MongoDB deployment and a running frontend/backend:

- Stripe API credential authentication;
- Stripe Dashboard webhook registration + signing secret;
- real Stripe sandbox Checkout success/decline/3DS/refund delivery;
- PayPal sandbox REST app credential authentication;
- PayPal registered Webhook ID and real signed sandbox webhook delivery;
- PayPal sandbox buyer approval/capture/refund;
- live-mode account eligibility/approval;
- real production transaction and payout/settlement behavior;
- end-to-end deployed browser/session/cookie behavior;
- production MongoDB transaction behavior;
- production build/audit after dependencies are installed.

Use:

```bash
npm run install:all
npm run verify
npm --prefix backend run payments:check -- --remote --strict-webhooks
```

in the actual staging/production environment. Do not go live if any of those checks fail.

## Build-workspace limitation

A dependency installation attempt in this workspace timed out, so no claim is made here that a fresh `npm install`, Next.js production build, dependency audit, or live provider network test was completed in this environment. The source-level and backend test results above are the checks that were actually executed.
