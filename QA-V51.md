# Singh Academy V51 - QA status

## Checks completed in the delivery environment
- Backend JavaScript syntax: 126 files checked with `node --check` before packaging.
- Frontend TypeScript/TSX parse: 86 files parsed with TypeScript 5.8.3; 0 parse errors.
- Relative frontend imports: 219 checked; 0 missing local imports.
- Pure backend tests: 176 existing security/business/CMS utility tests passed, 0 failed.
- New V51 MSQ tests: 2 passed, 0 failed.
- V51 protected-public baseline: 253 V48 baseline files checked; 0 unexpected byte changes. Four public baseline changes are intentional: two logo assets, landing `page.tsx`, and shared `styles.css` for requested image positioning. Contact page is a requested page-level change outside that baseline list.
- Certificate PDF: generated, rendered to PNG and visually inspected. No clipping/overlap was observed in the issued-certificate content. The sample-only warning sits on the lower edge by design and is not present on real issued certificates.
- Requested logo: generated directly from the supplied logo reference; exterior background is transparent while the white shield interior is preserved.

## Not completed here
`npm run install:all` could not complete in this environment before timeout, so the full resolved dependency audit, installed full TypeScript typecheck, Next.js production build, real MongoDB integration tests, browser E2E flows, payment-provider sandbox transactions, SMTP delivery and production upload scanner were not certified in this package.

Run `npm run verify` on the deployment/staging machine after dependency installation. Do not call the package production-ready until that passes and the real acceptance flows are exercised.

## Required staging acceptance
1. Complete several lessons, close the browser, reopen course: verify the saved current lesson resumes.
2. Navigate across 2+ modules; verify next/previous module controls and sequential locks.
3. Complete a course, review earlier modules, request Try Again from Client Admin with feedback; confirm only that student's course progress resets and feedback appears.
4. Create Team records across categories; confirm Founder/Core/Faculty/Board ordering.
5. Add MCQ and MSQ questions; save MSQ answers, reload, submit, and review from Certificates.
6. Exercise admin confirmations and success feedback for course/module/lesson/team/event/plan edits and deletes.
7. Check Contact page at mobile/tablet/desktop widths.
8. Verify exact logo on public header/footer/auth/admin and new certificate.
9. Generate a real staging certificate and confirm PDF verification/download flow.
10. Run provider sandbox purchases and normal security acceptance before production.
