# V56 changed areas

- `backend/src/models/Course.js` - month term fields for individual course pricing.
- `backend/src/utils/cmsValidation.js` - validates course/month plans and fixes membership billing to one payment per selected term.
- `backend/src/utils/commerce.js` - month-based course offers and renewal/extension calculation.
- `backend/src/services/onlineCheckout.js` - stores month terms and extends repeat individual purchases; preserves old day-based order replay semantics.
- `backend/src/services/paymentProviders.js` - provider checkout descriptions now state month terms.
- `backend/src/scripts/migrateV56.js` - non-destructive catalog normalization from legacy days to months.
- `backend/src/data/courseSeeds.js`, `backend/src/scripts/seedData.js` - seed catalog uses fixed month terms.
- `frontend/components/cms/CourseEditor.tsx` - individual course subscription month controls; removes misleading recurring/lifetime wording.
- `frontend/components/cms/SiteEditor.tsx` - Academy Plans are fixed-term one-payment membership plans.
- `frontend/app/checkout/page.tsx` - month-based term summary for both purchase types and automatic-expiry wording.
- `frontend/app/courses/page.tsx` - course cards show month terms.
- `frontend/app/styles.css` - requested serif Singh Academy header wordmark only.
- `backend/src/services/certificatePdf.js` - universal certificate copy/labels refined while preserving approved template assets.
- `backend/test/v56-terms.test.js` - V56 fixed-term behavior regression tests.
