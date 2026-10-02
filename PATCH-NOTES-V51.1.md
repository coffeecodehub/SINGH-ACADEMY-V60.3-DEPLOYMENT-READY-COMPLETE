# Singh Academy V51.1 verification patch

This patch changes verification logic only. It does not change the public UI, certificate design, database data, course logic, admin flows, images, or runtime behavior.

## Fixed
1. `scripts/check-preserved-ui.mjs`
   - Windows ZIP extraction may transcode the non-ASCII apostrophe in the Leonardo team-image filename.
   - The checker now accepts only a byte-for-byte SHA-256 equivalent file in the same directory, preventing a false UI-change failure while still protecting content integrity.

2. `backend/test/v50-subscriptions-receipts.test.js`
   - Replaced a stale V50 certificate assertion (`ShadingType 2` / old 48pt-gradient expectation) with assertions for the approved V51 reference certificate: exact Singh Academy text/logo image with alpha mask, repeated watermark state, framed reference design, authorized-signature area and sample marker.
   - No certificate generator code was changed by this patch.

## Local patch verification
- `node scripts/check-preserved-ui.mjs`: 253 protected V48 public files checked, 0 unexpected differences.
- `node --test backend/test/v50-subscriptions-receipts.test.js`: 54 passed, 0 failed.

Run `npm run verify` again after extracting this patched package. Any subsequent npm audit/typecheck/build result should be handled separately; do not use `npm audit fix --force` blindly.
