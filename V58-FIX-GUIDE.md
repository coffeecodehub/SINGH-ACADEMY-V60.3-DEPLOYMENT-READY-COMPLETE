# Singh Academy V58 — Fix Guide

## Scope

V58 addresses only the requested student-auth, My Courses and learner-review behavior while preserving prior payment, lesson/player and certificate work.

## Student login / signup

The V57 account-email verification gate has been removed. Student registration now creates an active, verified-for-login record, issues the student session immediately, and returns an auto-login response. The verify-email route/page and resend-verification flow are removed.

Student registration and reset-password validation use an 8-character minimum. The login endpoint deliberately does not reject an existing account merely because its historic password is shorter; it validates the stored bcrypt password and portal/role normally.

## My Courses

`GET /api/courses/enrolled/mine` is now driven by active `Enrollment` records and no longer builds the list from a generic membership flag. The active-window query also tolerates older enrollment rows that lack `accessStartsAt` or `accessExpiresAt`.

Academy membership fulfillment creates/extends membership-sourced enrollments for all currently published courses. V58 migration performs the same synchronization for already-active memberships. When a learner opens a free course or a course available through membership, the course can persist an enrollment before navigation to learning.

This keeps the product rule consistent:

- individual course purchase → that course is enrolled;
- membership → published courses are enrolled for the membership term;
- expired access → not listed as active My Courses access.

## Learner reviews

Public review responses are marked `no-store`. Review submission creates or updates the learner's review with visible status immediately and returns the full review object. The frontend inserts that returned review into local state instantly, so the student does not need to refresh.

There is no review-approval workflow exposed in the current UI:

- Client Admin → Reviews is read-only;
- Super Admin → Reviews can edit reviewer name, rating, review text and Visible/Hidden state, and can delete a review.

Legacy `pending` reviews are converted to visible reviews by `migrate:v58`.

## Certificate preservation

The certificate implementation was intentionally not redesigned. V58 preserves the V57 certificate service, route, logo, signature and learner/admin certificate UI byte-for-byte. This protects the single approved master certificate template while the auth/review/enrollment fixes are applied elsewhere.

## Payment preservation

Stripe/PayPal provider configuration and the fixed-term entitlement model remain in place. V58 only hooks membership fulfillment into enrollment synchronization so My Courses can remain enrollment-driven. No provider secret is embedded in the project.
