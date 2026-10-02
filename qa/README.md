# QA evidence

`v50/` contains the current release's actual logs, isolated fixtures and screenshots. Read `../SECURITY-QA-V50.md` before interpreting results. The 643 passing backend tests are unit/stub/local-protocol checks, not real MongoDB/provider/SMTP/browser integration. The 40 layout checks mock React hooks/data and the 68 canvas checks execute the source drawing function in native Chromium. The complete app has not been run here.

`certificate-sample.pdf` is a newly generated, explicitly labelled V50 demonstration, not a real student's issued certificate. V50 long-title and receipt fixtures are in `v50/`. Older V48/history folders and old root documents are retained as historical context, not new passing results.

Installation, typecheck/build, integration prerequisites and verify failures are preserved as actual logs, not suppressed. Intermediate test runs are historical within the change; `v50/backend-tests.log` is the final backend result.
