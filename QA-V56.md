# Singh Academy V56 QA

## Scope
V56 starts from V55 and changes only the requested subscription/payment/certificate/header areas.

### Requested behavior covered
- One certificate renderer/template for every course; student/course/dates/certificate number remain dynamic.
- Certificate uses the Singh Academy shield, repeated watermark shields, double frame, gold seal and supplied signature.
- Two paid access paths: individual-course fixed term or Academy membership fixed term.
- Individual-course checkout uses whole-number month terms; no new online paid course checkout creates lifetime access.
- Academy membership unlocks all published courses while membership is active.
- Access checks use exact stored expiry dates and reject access after expiry.
- Re-buying an active individual course extends that course expiry.
- Re-buying an active membership extends membership expiry.
- Stripe and PayPal hosted checkout/webhook code from V54 remains in place.
- Header wordmark changed to a serif family matching the SA shield letterform more closely.

## Automated checks actually run

### Backend test suite
`npm --prefix backend test`

Result: **665 passed, 0 failed**.

### Focused payment/term tests
`node --test backend/test/v54-payments.test.js backend/test/v56-terms.test.js`

Result: **8 passed, 0 failed**.

### Source parser/local import check
Using TypeScript parser from the available Node environment:
- 88 frontend TS/TSX files parsed
- 144 backend JavaScript files checked
- 223 relative frontend imports checked
- 0 syntax/import errors

### Public UI preservation byte check
- 252 protected public files checked
- 0 unexpected differences
- The header stylesheet is intentionally outside the protected manifest because the user explicitly requested the wordmark font change.

### Certificate render verification
Generated `qa/certificate-sample.pdf` and rendered it at 160 DPI with the PDF verification tool. The page rendered without clipped dynamic certificate content, missing logo/signature, black boxes or broken glyphs. The SAMPLE marker is intentionally present only in the QA sample; issued certificates do not receive it.

## Limitation in this environment
A fresh dependency install timed out before package-lock files could be generated, so a fresh `next build` was not falsely claimed as completed here. Run `npm run install:all`, `npm run build`, `npm run verify`, and the sandbox provider tests in the target staging environment before production cutover.
