# Singh Academy V47 — preserved UI, hosted payments and course certificates

**Updated source package. Not an already deployed application or a claim of completed live payment testing.**

Start with **START-HERE-V47.md**. Configure payments using **PAYMENTS-V47.md**. Certificate operations are in **CERTIFICATES-V47.md**. Deployment and acceptance gates are in **DEPLOYMENT-V47.md**, **ACCEPTANCE-V47.md** and **SECURITY-QA-V47.md**.

## What changed

The approved public website design, colors and original asset files are retained. Team portraits return to the established 4:3 card frame; Home's second original photograph uses a right-side focal point so the receiving interaction is visible. USD prices use `$`, including authoring controls. The landing-page component itself is unchanged from the supplied V46 source. This does not claim that every V46 design detail was identical to every earlier approved release.

Students now choose a course or fixed-term Academy membership, then pay through hosted Stripe or PayPal checkout. Successful payment is retrieved/verified server-side before an invoice, receipt and access entitlement are committed together. A browser success URL cannot grant access. Existing manual billing records/tools remain available for historical and exceptional operations; an admin enrollment request/invoice is no longer mandatory for normal online checkout.

Memberships in this release are **one-time purchases for a fixed term**, not automatically recurring provider subscriptions. A renewal is a new deliberate purchase. Card/account details are entered at the payment provider, not stored by this application.

Finishing all required published lessons creates one pending completion and a Client Business Admin notification. The student sees “Waiting for certificate”. The Client Admin reviews and issues a private PDF certificate, which the student can download. A random public verification link reports only the approved certificate identity/status, not the account email, financial records or PDF.

Client Admin manages business records plus the existing CMS. Super Admin retains the separate content workspace; new certificate approval and business data routes are not granted to it. Student/admin sessions, access checks and production MFA/email/scanning gates are retained.

## Actual validation boundary

430 dependency-free backend unit/helper/handler-stub tests passed. Source parsing/local-import checks passed (74 frontend files, 99 backend JS files, 169 relative frontend imports). The actual native certificate PDF was generated/rendered. Static fixtures at six widths matched V44 Team image heights and had no page-level horizontal overflow. All 252 V46 `frontend/public` files are byte-for-byte unchanged.

The V47 npm install failed with `EAI_AGAIN` in this environment. New full dependency typecheck, Next production build, resolved dependency audit, installed Sharp 0.35.4 runtime, MongoDB/HTTP integration, real provider sandbox/live payments, SMTP, Docker and real application browser flows **have not been verified here**. Run the supplied gates on your environment before launch. Old V46 successful builds are not V47 build evidence.

No real `.env`, credentials, database export, installed dependencies, build outputs or font files are included. Keep old database/config backups. Do not reseed courses or drop collections to apply this update.
