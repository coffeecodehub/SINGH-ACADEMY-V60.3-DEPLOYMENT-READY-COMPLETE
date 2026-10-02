# Singh Academy V56 - Fixed-Term Access + Payment Checkout + Certificate Polish

V56 is based on V55 and preserves the approved public UI except the explicitly requested header wordmark typography and payment/subscription/certificate changes.

## Access model
1. **Individual course subscription** - one Stripe/PayPal payment grants only the selected course for the selected whole-number month term. Buying it again extends the course expiry.
2. **Academy membership** - one Stripe/PayPal payment grants all published courses for the selected month term. Buying membership again extends membership expiry.

No new paid checkout creates lifetime/no-expiry course access. Existing historical entitlements are not silently rewritten.

## Upgrade
```bash
npm run install:all
npm run migrate:v56
npm --prefix backend run preflight
npm run verify
```

Configure Stripe and PayPal using `PAYMENTS-V56-A-TO-Z.md`, then run:
```bash
npm run payments:check -- --remote --strict-webhooks
```
