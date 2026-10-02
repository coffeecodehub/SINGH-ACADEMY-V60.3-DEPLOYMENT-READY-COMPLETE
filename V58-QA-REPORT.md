# Singh Academy V58 — QA Report

## Checks completed in the build workspace

### Focused V58 regression suite

Command:

```text
node --test backend/test/v58-regressions.test.js
```

Result:

```text
5 tests
5 passed
0 failed
```

Coverage assertions include:

1. instant student auth, 8-character registration minimum and no email-verification gate;
2. enrollment-driven My Courses plus membership/free enrollment creation;
3. immediate/no-cache learner review publishing;
4. Client Admin read-only Reviews and Super Admin editable Reviews;
5. approved certificate implementation preserved byte-for-byte.

### Source/parser check

```text
Frontend: 88 TS/TSX files parsed
Backend: 148 JavaScript files checked
Relative frontend imports: 222 checked
Syntax/import errors: 0
```

This source check validates syntax and local relative-file resolution only.

### Approved public UI preservation

```text
252 protected V48 public files checked
0 unexpected differences
```

### Certificate master preservation

These V58 files match their V57 SHA-256 values exactly:

```text
backend/src/services/certificatePdf.js
7dfac1e4f2a9cee2916f05c29407941248b6ecfd96d641a8a14a7ebf43f8d4d3

backend/src/routes/certificateRoutes.js
2788bec427fdffa4610a1b232525e34dde8ef2e2417aca847590e50050b9736f

backend/src/assets/certificate-logo-original.png
fbfcc3260a9d4784703e4c7be03f2b440224383cdb5c888a572a93defbb886d0

backend/src/assets/certificate-signature.png
94f1226a2a520c79370e839e0c367c105265a52351fd8e7e869efa959fe39418

frontend/app/certificates/page.tsx
17880a8d51f82f81e5adeb79fab471f6b8365fc3e7ee784e5de49bd36720f6ad

frontend/components/CertificateStatus.tsx
2814ef64f585e894cf50151e6907eefb7b978ab3565f352ebb8ce31fea544809

frontend/components/business/Certificates.tsx
1e1f9fc95f5564545414cfeca25e7661b8fe19028cafb22e7d3327f8c584def2
```

## Checks not claimed as completed

A fresh dependency installation was attempted in this build environment but timed out on the network before `node_modules` / lockfiles were created. Therefore the full dependency-backed backend suite, Next.js production build, live MongoDB migration and deployed browser acceptance are **not** claimed as passed here.

On the target machine/deployment, run:

```powershell
npm run install:all
npm run migrate:v58
npm --prefix backend run preflight
npm run check:ui
npm run verify
```

Then perform real-browser acceptance for login, enrollment/My Courses, reviews/admin review roles, certificate rendering and any configured Stripe/PayPal checkout.
