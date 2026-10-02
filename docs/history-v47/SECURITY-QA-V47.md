# V47 implementation, security and actual QA record

## Scope and starting point

Input: `SINGH-ACADEMY-V46-SECURE-DEPLOYMENT-PACKAGE.zip`. Output: UI restoration/price formatting, direct Stripe+PayPal hosted checkout, course-completion approval certificates and related operational fixes. No user production database, merchant account, SMTP account or server was changed.

The new online scope supersedes V46's manual-enrollment-first purchase journey. Automatic recurring subscriptions, automatic admin-triggered provider refunds, assessment submission/grading and forged signatures are not silently added.

## Code changes

### Public UI and pricing
- V46's image wrapper implicitly emitted each source asset's large intrinsic height, conflicting with legacy card CSS. It now uses only explicitly supplied HTML dimensions; existing aspect-ratio/hero CSS controls presentation and responsive srcset still supplies optimized files.
- Team cards use the original 4:3 frame. Home's second original picture has object-position 88% center. This changes cropping only, not the original file or the approved layout.
- Shared money formatting displays `$` for USD without changing saved numeric prices. Course authoring amount controls include the currency sign.
- The V46 landing-page component is byte-for-byte unchanged. This is not a claim that an unseen earlier client-approved screenshot exactly matches all V46 markup.

### Commerce boundary
Server-side snapshots and exact minor units; hosted redirects to official provider origins; fixed environment/merchant IDs; Stripe raw signature validation; PayPal signature verification API; retrieval of authoritative paid status/amount/currency/bindings; exact portal/ownership checks; per-user serialization; idempotency keys; unique provider transaction keys; transaction-bound invoice/receipt/access/audit/notification writes. Payment-provider network calls are outside database transaction retry bodies.

Browser success flags do not grant access. Event ledger markers are written after successful local application; failures permit provider retry. Invalid imports or unidentified payments are not invented as revenue. Sandbox records are explicitly flagged and omitted from real collection sums/production entitlements. Duplicate independent actual course payments preserve prior entitlement and surface a review item, not silently erase a receipt.

Refund synchronization records a provider-completed refund and equal invoice credit, limits the refundable amount and avoids duplicate events. Full refunds cancel only invoice-linked access; partial refunds retain it. Disputes/reversals require operational review. This is not a bank settlement ledger, tax engine or automatic dispute resolution service.

### Certificate boundary
Published required-lesson progress is checked server-side. Empty courses cannot complete; the percentage is not rounded up. Completion/pending notification writes are transactional. Client Admin alone approves after current-password confirmation and current-curriculum recheck. A permanent PDF/hash/serial and random verification token are stored. Private PDFs require owner/admin authentication. Public verification minimizes exposed fields and is noindex. Revocation preserves audit/history and cannot recall previously downloaded copies.

The certificate proves the application's required-lesson completion record and administrative approval, not automatically graded assessment results. Built-in PDF fonts support Latin-script text; unsupported scripts require approved transliteration and are rejected rather than rendered incorrectly.

### Retained security / fixes
Separate V45 portal cookies and server sessions retained; no test-enrollment shortcut. Production config still requires MFA/email verification/HTTPS/SMTP/scanning. Development false flags preserve account-level enrolled MFA. Existing GridFS protection, upload signature checks/scanner integration, responsive CMS and user block/session revocation retained.

Duplicate Subscription schema index removed. Backend listening message is emitted after successful binding; a port conflict is reported without pretending the server is listening. Sharp 0.35.4 is pinned in backend and frontend override; Stripe SDK 22.6.2 is pinned. Versions and code controls are not proof of a clean resolved audit or independent penetration test.

## Actual checks in this working environment

| Check | Actual result | Important limitation |
|---|---|---|
| Backend `node --test test/*.test.js` | **430 passed, 0 failed, 0 skipped** | Pure helpers, injected model/transaction/API stubs and local scanner-protocol tests; not a real merchant/MongoDB transaction suite |
| Frontend parsing | **74 TS/TSX files** | Used available TypeScript parser; no project dependency typecheck |
| Backend syntax | **99 JS files** | Parsing only, not runtime module compatibility |
| Relative frontend imports | **169 resolved; 0 source/import errors** | npm package exports not certified |
| Asset preservation | **252/252 V46 public files unchanged** | Includes original and optimized files; not a claim of identical pixels at every screen width |
| Landing component | V46 `frontend/app/page.tsx` unchanged | Historical V44/V43 differences are not automatically reverted |
| Static Team/Home fixtures | 320, 390, 768, 1024, 1440, 1920px; no document-level overflow; Team heights equal V44 reference within 1px | Actual CSS/original imagery on static fixtures, **not Next/React application/browser testing** |
| Native PDF output | Generated one A4-landscape sample, extracted and rendered/visually inspected | Example identity/serial; no real student or issued DB record |
| Project npm installation | **Failed: EAI_AGAIN** | Network hostname resolution prevented dependency install |
| Full new TypeScript/Next production build | **Attempts failed** | TypeScript reported missing project dependencies/types; Next reported `next: not found`. V46 user build success is not V47 build evidence |
| Resolved dependency audit / installed Sharp 0.35.4 pipeline | **Not completed** | Runtime check and fail-fast audit are included for the user's working network |
| Real MongoDB/HTTP integration | **Authored; not run here** | Test database/installed packages unavailable |
| Real Stripe/PayPal sandbox/live purchase | **Not run** | Requires owner's merchant credentials/webhooks/accounts |
| Real application Playwright, SMTP, Docker, ClamAV engine and restore | **Not run here** | Must complete on staging |

Actual logs and labelled images are under `qa/v47`. Older QA is historical, not retesting evidence. The sample PDF is explicitly marked as a sample. No lockfile was invented; generate/review real lockfiles before `npm ci`, Docker or release verification.

## Tests included for a real environment

`backend/integration/v47-checkout-certificates.test.js` uses a guarded disposable database and actual HTTP/MongoDB for ownership, normalized payment-evidence settlement, concurrent replay, invoice/access, required completion, roles/password, PDF download/verification/revocation and provider-refund record integration. It injects a payment evidence fixture and **does not place a real Stripe/PayPal payment**. Perform the separate actual provider tests in ACCEPTANCE-V47.md.

The existing V46 manual-history/authentication integration suite remains as regression coverage. Playwright tests public pages, portal separation/navigation and responsive source imagery against the application stack; they are not marked passed until executed. Source checks explicitly report their narrow scope even when run after a separate successful build.

## Remaining operational boundaries

All same-origin JavaScript shares the website's trust boundary; separate role cookies are not protection from a compromised whole-site script. Keep dependency/CSP/independent security review, least-privilege database/network controls, trustworthy secrets and backups. Some legacy curriculum multi-document edits/deletions remain non-atomic; testing editorial concurrency/interruption is still necessary. External videos/files retain the host's own security. Existing uploads are not retroactively scanned and automatic orphan cleanup/storage quotas are not supplied.

No background payment reconciliation, scheduled reminders, certificate email delivery job, exam grading, full Unicode certificate shaping, tax/profit accounting or automated chargeback resolution is claimed. Test the specific merchant account, currencies, infrastructure, logs and support/recovery procedures before launch. No guaranteed 0.05ms image loading, perfect security or unlimited capacity.

## Primary references used for implementation contracts

Stripe fulfillment: https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted
Stripe webhook raw body/signatures: https://docs.stripe.com/webhooks/signature
PayPal Orders v2 capture: https://developer.paypal.com/api/orders/v2/orders-capture
PayPal verify-webhook-signature: https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post
Sharp 0.35.4 release: https://sharp.pixelplumbing.com/changelog/v0.35.4/
Stripe SDK release: https://github.com/stripe/stripe-node/releases/tag/v22.6.2

Public documentation supports the contracts, not a certification of this source or your deployment.
