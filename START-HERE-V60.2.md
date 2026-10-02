# Singh Academy V60.2 — Deep Audit Fix Release

V60.2 is an additive bug-fix release. Do **not** reseed or delete existing production collections.

## Upgrade from V60/V60.1
1. Back up the target MongoDB database.
2. Copy your existing `backend/.env` into this release's `backend` folder. Do not commit it.
3. Stop any old Singh Academy backend already using port 5000.
4. Run `npm run install:all` on a machine with npm registry access. This installs backend/frontend dependencies and creates their lockfiles when absent.
5. Run `npm run migrate:v60` once if the target database has not already received the V60 migration. V60.2 also checks/repairs the enrollment index safely at every backend startup.
6. Run `npm --prefix backend test`.
7. Run `npm run check:ui`.
8. After dependency lockfiles exist, run `npm run verify`.
9. Start locally with `npm run dev:backend` and `npm run dev:frontend`, or deploy using the existing production workflow.
10. Confirm `GET /api/health` reports version `60.2` and test one existing student plus one second student enrolling in the same entitled course.

## What V60.2 fixes
- Hardened legacy Enrollment index repair. Plain unique `(user, courseSlug)` is the only accepted compound uniqueness rule; legacy single-field, partial, sparse or otherwise malformed enrollment pair indexes are repaired.
- Same-student repeat enrollment remains idempotent instead of becoming a duplicate enrollment error.
- Membership renewal at the exact previous-expiry/new-start boundary now extends the existing course enrollment instead of shifting its start into the future.
- Added real `/terms` and `/privacy` pages so footer legal links no longer return 404.
- Corrected the stale Client Admin workspace release label to V60.2.
- Retains the V60.1 favicon fix and startup repair for old enrollment indexes.
- `/api/health` now reports V60.2.

## Preserved behavior
- Public V48-approved baseline remains unchanged outside explicitly approved later changes.
- Student My Courses remains enrollment-driven.
- Existing payment, billing, receipt, refund, review, course-builder, media, certificate and Try Again workflows are preserved.
- Existing database content is not reset by this release.

## Important release note
This source archive intentionally does not contain `node_modules`, `.next`, private `.env` files, or generated TypeScript build cache. The source archive also does not contain backend/frontend dependency lockfiles inherited from the supplied V60.1 package. `npm run install:all` generates those lockfiles on a machine with npm registry access; commit/preserve them before using the strict `npm run verify` release command.

See `V60.2-DEEP-QA-REPORT.md` for the checks completed in this audit.
