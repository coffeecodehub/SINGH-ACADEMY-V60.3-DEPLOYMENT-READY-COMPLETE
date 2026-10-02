# V42 Targeted Fixes

- Recovered `frontend/app/super-admin/page.tsx` from accidental literal `\\n` source corruption that caused `Expected unicode escape` and `/super-admin` 500 errors.
- Removed the visible Back button from `/home` after login without changing the Home UI styling/layout classes.
- Added a Team role/category dropdown in Super Admin using the existing Team destinations: The Founder, Faculty, Board of Advisors, Core Team.
- New Team members default to Faculty and are saved with the selected category so they appear under the matching Team tab.
- Added automatic Team slug generation on create because `TeamMember.slug` is required by the MongoDB schema.
- Renamed the main navigation label `Academy` to `Academy Plans` while keeping the existing `/academy` route and visual styling.
- No CSS/theme redesign was performed.

Validation note: backend JavaScript syntax checks pass. A full Next.js production build could not be executed in this environment because the uploaded archive does not include `node_modules` and dependency installation timed out.
