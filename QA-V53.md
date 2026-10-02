# Singh Academy V53 — QA report

## Scope

This report records checks actually performed on the V53 source in the delivery environment. It is not a penetration-test certificate, live-host performance guarantee or substitute for staging acceptance tests.

## Checks completed

- Backend source syntax: **136 JavaScript files checked; 0 syntax errors**.
- Frontend source parsing: **88 TS/TSX files parsed**.
- Relative frontend imports: **223 resolved; 0 local import errors**.
- Protected public baseline: **252 V48 public files checked; 0 unexpected differences**. The explicitly requested logo/landing/contact/mobile-header files are excluded from the protected byte baseline.
- Security utility regression subset: **66 passed, 0 failed**, including the V53 admin session lifetime/idle policy.
- V53 CMS/media regression subset: **3 passed, 0 failed**:
  - Team creation does not require a visible slug; backend derives it from the name.
  - Lesson video poster URL/file ID survives validation.
  - Unsafe poster URLs are rejected.
- Static source assertions confirmed:
  - course placeholders are present;
  - Category / Learning Field / Learning Path / Credit Hours are absent from the Course Editor UI;
  - Team slug input is absent;
  - lesson poster + video preview controls exist;
  - student PDF/media links use current-host remapping;
  - Contact email/phone/location links are clickable;
  - mobile username truncation rules are present.

Actual logs are stored under `qa/v53/`.

## Not verified in this environment

A complete dependency install, the entire backend dependency-based test suite, Next.js TypeScript production build, resolved npm audit, real MongoDB/GridFS upload, malware scanner, real 250 MB transfer, browser playback, real deployed PDF opening, SMTP and payment-provider sandbox transactions were not executed here. Dependency installation was unavailable/timed out in this environment.

These must be tested in staging after `npm run install:all` and before production handover.

## Performance statement

V53 removes an avoidable logout problem during large active admin uploads by showing upload progress and refreshing the authenticated admin session during transfer. It also raises the backend request timeout to 30 minutes.

It does **not** guarantee a fixed upload or page-load time. Large-video transfer time depends on network bandwidth, hosting, scanning and GridFS/database throughput. Measure real production performance on the intended host.

## Security note

The upload signature validation, supported MIME allowlist, malware-scanning policy, protected media authorization and role boundaries remain in place. Long-upload improvements do not bypass these controls.
