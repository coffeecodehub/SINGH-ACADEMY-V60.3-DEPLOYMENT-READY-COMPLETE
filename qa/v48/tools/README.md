# Static layout helpers

These helpers render **sample data and mocked hooks**, not the running React/Next app. `layout-fixtures.cjs` uses the installed frontend TypeScript parser (or explicit TYPESCRIPT_PATH) to build billing/review HTML from actual source; `render_layouts.py` uses Python Playwright and `/usr/bin/chromium` to inspect the resulting sample pages. That Python dependency/browser is not required to run the LMS. Static fixtures do not prove login, click actions, payment, persistence or real responsive API states.
