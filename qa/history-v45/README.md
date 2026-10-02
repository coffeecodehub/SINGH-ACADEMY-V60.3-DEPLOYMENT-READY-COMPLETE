# QA evidence — V45

- `v45-unit-tests.tap`: actual Node test output, 249 passed. Includes pure functions and source handlers with dependency stubs, not a live MongoDB/server test.
- `v45-source-check.txt`: actual 58 frontend/62 backend/123 relative-import source checks; not full TypeScript/build verification.
- `v45-setup-script-check.json`: seven actual checks in an isolated temporary directory.
- `v45-npm-network-check.txt`: registry DNS EAI_AGAIN; dependency connectivity failed.
- `v45-build-attempt.txt`: actual build attempt blocked because next was not installed.
- `v45-static-layout-check.json`, `layout-fixture.html`, `layout-fixture-*.png`: static HTML/CSS layout inspection at five viewport widths. Table rows/zero metrics are **fixture-only**, not real customer records, not a running application, and not seeded into MongoDB.
- `history-v44/`: previous-version outputs only.

No claim is made that real HTTP/cookie/MongoDB/SMTP/browser transaction workflows passed. Complete the staging acceptance checklist on a working installation.
