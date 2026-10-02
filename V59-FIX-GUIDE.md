# V59 Fix Guide

The V58 test log reported 24 failures even though 646 tests passed. The failures clustered around recent V58 behavior changes rather than a single application-wide failure.

## Root causes fixed

1. **Auth tests still referenced removed `verify` handler.** Student account email verification had intentionally been removed, but the source-loader expression still asked for `verify`, causing `ReferenceError: verify is not defined` before login/register tests could execute.
2. **Paid-media source-loader omitted `activeEnrollmentWindow`.** Runtime `mediaRoutes.js` imports it correctly, but the dependency-injected unit test did not pass the helper.
3. **Payment workflow source-loader omitted `syncMembershipCourseEnrollments`.** Runtime `onlineCheckout.js` imports the service correctly; the in-memory payment tests were not updated when membership-to-course enrollment synchronization was added.
4. **Review generic CMS Add returned 404 instead of explicit 405.** V59 now explicitly refuses admin-created learner reviews with 405. Student submission remains the only creation path.
5. **Certificate tests still expected a removed review-acknowledgement checkbox.** V59 aligns tests with the current issue flow and also removes the leftover acknowledgement gate from Try Again. Current admin password, valid completion evidence, and feedback remain required where applicable.

## Payment status

Stripe and PayPal provider code is already integrated. Checkout remains disabled until account-generated environment secrets are configured. V59 does not hardcode or fabricate merchant credentials.
