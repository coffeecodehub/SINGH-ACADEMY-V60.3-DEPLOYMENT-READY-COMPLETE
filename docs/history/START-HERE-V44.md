# Start here — Singh Academy V44

V44 contains the edited frontend/backend source, analysis report, test code and real test outputs. It does **not** include a MongoDB database export, live credentials, installed `node_modules`, or compiled production output.

**Pehle apne puranay project aur database ka backup rakhein. Naya ZIP alag folder mein extract karein; existing `.env` ko overwrite na karein.** New CMS code does not require dropping your database or reseeding existing courses.

## 1. Prerequisites

Use Node.js 22 or newer as required by these package manifests; the source checks here used Node 22.16.0 and npm 10.9.2. You need working access to the npm registry and a local or hosted MongoDB database. Internet is needed for installing dependencies, not for the dependency-free backend tests after Node is available.

The extracted root is `singh-academy-v44`, containing `backend` and `frontend`. Open terminals inside this root. The application runs as **two processes**.

## 2. Backend — first terminal (Windows CMD)

```bat
cd backend
npm install
if not exist .env copy .env.example .env
```

Edit `backend/.env` before starting. Preserve your existing database URI when upgrading; use a separate staging database for the first test.

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/singh_academy_staging
JWT_SECRET=YOUR_OWN_LONG_RANDOM_SECRET
FRONTEND_URLS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
ENABLE_TEST_ENROLLMENT=false
PUBLIC_API_URL=http://localhost:5000/api
```

The local MongoDB example works only if MongoDB is installed and running. For an existing Atlas database, keep your own Atlas connection string instead; do not copy placeholder credentials.

Generate a random JWT secret locally, then paste its output into `.env`:

```bat
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set your own `CLIENT_ADMIN_EMAIL`, `CLIENT_ADMIN_PASSWORD`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`. Use different strong passwords of at least 12 characters. The default `CHANGE_ME...` values are deliberately rejected by the admin seed script.

```bat
npm run seed:admins
npm test
npm run dev
```

`seed:admins` creates missing accounts. A normal rerun does **not** reset existing passwords, names or roles. To intentionally reset an existing admin password to the configured `.env` value:

```bat
npm run seed:admins -- --reset-password
```

That explicit option still refuses to change an existing account's role. It does not revoke already-issued sessions; use it with care on a real deployment.

**Optional demo content — only when needed:**

```bat
npm run seed:data
npm run seed:courses
```

V44 seeds preserve existing content instead of replacing it. Courses already present by slug are skipped, including their curriculum. This is not a repair/migration tool for an interrupted old seed; do not expect a rerun to overwrite an existing course. No reseed is needed merely to enable the V44 editors. Existing lessons without a `published` flag remain visible for compatibility; newly created lessons start as drafts.

## 3. Frontend — second terminal (Windows CMD)

From the extracted project root:

```bat
cd frontend
npm install
if not exist .env.local copy .env.example .env.local
npm run dev
```

The frontend `.env.local` should contain:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Do **not** put MongoDB passwords, JWT secrets or payment secret keys in frontend environment variables. Restart the frontend after changing its environment configuration.

Open:

```text
Website:          http://localhost:3000
Client Admin:     http://localhost:3000/admin/login
Super Admin:      http://localhost:3000/super-admin/login
Backend health:   http://localhost:5000/api/health
```

Use the admin email/password you configured, not the student login portal. If the frontend starts on a different port, update backend `FRONTEND_URLS` and restart the backend.

For macOS/Linux, replace each `if not exist ... copy ...` with a guarded copy, for example:

```sh
[ -f .env ] || cp .env.example .env
[ -f .env.local ] || cp .env.example .env.local
```

Run each copy in its corresponding backend/frontend directory.

## 4. Editing workflow

**Course:** Open Courses → Add course. Save the basic details first, then open Curriculum. Add named modules, create lessons, edit their content, and save each lesson. Set a lesson to Published when ready; publish the course separately. New lessons stay hidden while draft. Close/Cancel warns about unsaved form changes. Curriculum actions save immediately; closing the course editor does not undo already-saved module/lesson operations.

**Media:** Upload or replace a file, wait for completion, then save the parent item. Remove clears its reference on save. Canceling an editor is not a published change, but an abandoned uploaded file may remain in GridFS until a cleanup process is added. External video links are accepted; locally uploaded documents/videos use the backend media route.

**Team:** Set category and designation separately. Save images, descriptions, order and visibility. Deactivating a member hides the public profile.

**Events:** Use the Draft/Published dropdown. Date/time is entered in your browser's timezone and stored with an explicit timestamp. Search the address on Maps, generate a map-search link or paste a valid location link. Published records appear on `/events`.

**Academy Plans:** Edit plan duration, price, billing label, description, features and active state. The one-year legacy seed is normalized as 12 months. These controls update public plan details, not real payment-provider subscriptions.

**Reviews and social:** Moderate real reviews using pending/approved/rejected. Configure supported social links from Super Admin → Footer & Social; blank links are hidden.

## 5. Staging acceptance checklist — required before deployment

- Run `npm test` in `backend`. In `frontend`, run `npm run typecheck` and `npm run build`. Then run `node scripts/check-source.cjs` from the root. Commit the generated package lockfiles after successful installation and review `npm audit` output in both directories.
- Sign in separately as Client Admin, Super Admin and Student. Confirm a student receives 403 for admin routes and Client Admin cannot edit Footer & Social. Confirm the Super Admin sidebar stays content-focused.
- Create a draft course, two named modules and several lessons. Edit, reorder, duplicate, hide/publish and delete a draft lesson. Reload the page after saving and verify persisted values. Check optional/sequential behavior with real progress records.
- Upload and replace an image, video and PDF. Remove a saved image and save again. Check the real GridFS file routes as an admin, guest, enrolled student and non-enrolled student; seek through a real video to test range streaming. Duplicate a lesson before deleting one copy and verify the shared file still opens.
- Create/update/hide Team and Events entries and verify public pages. Hide every team record and confirm old demo profiles do not reappear. Check saved social links on both landing and inner-page footers. Check the signed-in Home catalog after editing/unpublishing a course.
- Save plan changes and reload both admin and `/academy`. Verify review moderation, business lists, actual amounts/currencies and notification marking using known database fixtures. Do not infer that a zero dashboard value is a bug when the database has no corresponding records.
- Keep `ENABLE_TEST_ENROLLMENT=false` for normal use and all deployments. Confirm no real payment or enrollment is created by the incomplete checkout flow. Do not enable live sales until a verified payment integration is implemented and tested.

## 6. Important limits

The delivered source passed **68 unit tests** and syntax/import checks, but a full app build and live MongoDB/browser tests were **not possible here**: dependency resolution failed with `EAI_AGAIN`, and `next` was therefore not installed. The exact logs are in `qa/`.

Stripe/PayPal checkout/webhooks, persisted assessments/automatic grading/student file submissions, and certificate issuance remain incomplete. The full analysis describes other operational work. Do not treat the updated ZIP as a fully deployed or certified production system.

If installation reports `EAI_AGAIN` on your machine, resolve its DNS/network/npm-registry connectivity before retrying. Do not delete the database, disable TLS verification, or use `--force` to conceal a dependency/build error.
