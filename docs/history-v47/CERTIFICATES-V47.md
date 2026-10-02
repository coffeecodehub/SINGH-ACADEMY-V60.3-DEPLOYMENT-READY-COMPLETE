# V47 course completion and certificates

## Student and Client Admin workflow

When the learner marks the final required published lesson complete, the backend checks actual saved lesson progress. Progress, the new pending completion, one notification and business audit are committed transactionally. Duplicate lesson clicks do not intentionally produce duplicate completion/notification records.

The learner sees **Waiting for certificate** on the completed course card and in their certificate area. An existing completed course can be backfilled deliberately with the commands in START-HERE-V47.md. Empty courses never count as completed; optional lessons are excluded if at least one lesson is required. When all lessons are marked optional, all published lessons are used, avoiding completion without doing anything. Percentage uses floor, so 99.x% is not rounded to complete.

Client Admin opens **Certificates**, filters pending records and selects **Generate certificate**. The form shows learner/course identity and current required-lesson completion. The admin reviews the certificate display spelling, supplies a reason and their current password, then selects **Generate & issue certificate**. Issuance checks required progress again; adding a required lesson before issuance means the student must complete it first.

A permanent PDF snapshot is stored with a unique certificate number, private PDF bytes/hash, course title, approved learner display name, completion date, issue date and issuer display name. Repeated approval does not replace the PDF or issue another serial. The student can download it from My Courses / Certificates; the Client Admin can download the same PDF. Super Admin and other students cannot download or approve it.

Certificates acknowledge **required-lesson completion and Academy approval**. The application still does not persist/grade assessment answers, prove video attention, enforce accredited exam outcomes or attest to professional licensing. Do not interpret a checkbox completion record as a passed regulated exam.

## PDF and verification

The PDF is an A4-landscape Academy certificate with the existing logo, a structured border, name/course, completion/issue dates, unique number and clickable verification link. The sample at `qa/certificate-sample.pdf` is explicitly marked **SAMPLE - NOT AN ISSUED CERTIFICATE**; its example number/link are not production records.

The real verification URL contains a cryptographically random token. Sharing it exposes the approved certificate name/course/serial/dates/status only, not email, login, financial history or the PDF. No public name search is provided. Verification pages are marked noindex/nofollow, but a holder can still share the URL and its visible identity. Tell students the purpose of the public verification link.

Downloads require an authenticated student owner or Client Admin; PDF responses are private/no-store. Revoking an issued certificate requires the Client Admin password/reason and retains audit/history. Revocation blocks future downloads and makes verification report revoked. It cannot erase PDFs that were already downloaded; recipients should check the verification link. Reissuing a revoked certificate is intentionally not silently automated.

Issued PDFs remain historical after later course edits. Before issuance, reviewed required-lesson IDs and completion date are refreshed to avoid backdating new required work. Certificate and payment approval are independent: payment grants access, not a certificate.

## Name/script support

The bundled native PDF generator uses standard built-in PDF fonts and supports Latin-script text/Western accented names. Unsupported scripts are explicitly rejected rather than printed as missing glyphs. The approval form permits the administrator to use an agreed Latin transliteration for the certificate display name/course title without renaming the student's account or the course. Full Unicode/script shaping and font licensing are a separate enhancement; no third-party font files are included.

Issuer text is an authorized account display name, not a forged handwritten signature. No external e-signature or third-party credentialing integration is claimed.

## Operations and backups

Keep the public frontend origin stable. PDFs include the verification origin at issue time; changing domains later requires redirects for old verification links. Include CourseCompletion records/PDF bytes and indexes in normal database backups. Keep them protected as personal records. Notifications use the existing business inbox; certificate issuance email and automatic reminder scheduling are not added.

Run:

```powershell
npm --prefix backend run test:certificate
npm --prefix backend run certificates:backfill
# Only after reviewing dry-run output and backups:
npm --prefix backend run certificates:backfill -- --apply
```

The generated local sample is not a student's issued credential. Complete real MongoDB/HTTP/browser tests in ACCEPTANCE-V47.md before allowing production issuance.
