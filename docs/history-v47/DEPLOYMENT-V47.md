# Singh Academy V47 — deployment and operations

**Audience: authorized implementation/database owners. Release gate, not a claim of deployment.** No domain, server, Atlas account or SMTP service has been changed by this delivery. These commands need a real owner-controlled environment. All commands in the container section are for a Linux shell.

## A. Topology and prerequisites

The supplied path is **one HTTPS website origin**. Caddy routes `/api` to Express and other paths to Next.js. Backend, frontend and scanner ports are private container-network services; only the gateway publishes 80/443. Do not expose 5000, 3000 or 3310 publicly. A completely different-site frontend/API combination is not supported just by changing CORS, because the session design uses SameSite=Lax cookies.

Use Node 22+ for local builds/tests, a maintained Docker engine with Compose **2.30+**, your owned DNS hostname, a transaction-capable Atlas/replica-set database and a working verified SMTP sender. The container budgets are approximately 2 GiB scanner, 1 GiB backend and 768 MiB frontend plus gateway/OS/build headroom. This is not a minimal 512 MB hosting stack. Size and load-test the actual server rather than assuming a free tier will run this topology.

Review image tags and dependency advisories at release time; pin reviewed image digests for reproducible production deployments. No container scan or successful image build occurred in this environment.

Back up the database **including GridFS files/chunks**, stable MFA/auth secrets, current source release, environment configuration and gateway certificate volumes. Test an isolated restore before relying on a backup. Restrict Atlas/network allowlists to necessary hosts and give the runtime database account only the privileges it needs. Index creation may need a separately controlled migration account. Never open database access to everyone as a routine setup fix.

## B. Resolve dependencies and test the source

From the extracted root on a working network:

```sh
npm run setup
# Edit backend/.env privately, initially using a staging database.
npm run install:all
npm --prefix backend run preflight
npm --prefix backend run migrate:v47
npm --prefix backend run seed:admins
npm run verify
```

Inspect installation and audit results. Save/review `backend/package-lock.json` and `frontend/package-lock.json` in version control. Docker and CI deliberately fail without them. Do not create an invented lockfile, bypass the gate or add `--force` to suppress security/dependency problems.

### Real HTTP/transaction and browser suites

Use the dedicated **disposable test database**, never production credentials. Ports 27018, 5000 and 3000 must be free. The test harness selects an additional randomly named test database and only drops that generated name on shutdown.

```sh
docker compose -f dev/test-mongo-compose.yml up -d --wait
docker compose -f dev/test-mongo-compose.yml exec -T mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
docker compose -f dev/test-mongo-compose.yml exec -T mongo mongosh --quiet --eval 'db.hello().isWritablePrimary'
export TEST_MONGODB_URI='mongodb://127.0.0.1:27018/sa_test?replicaSet=rs0&directConnection=true'
npm --prefix backend run test:integration
cd frontend
npx playwright install chromium
npm run test:browser
cd ..
docker compose -f dev/test-mongo-compose.yml down
```

Wait/recheck until `isWritablePrimary` is true before the tests. `rs.initiate` is a first-initialization action, not a database reset. Browser tests need a successful production frontend build first (made by `npm run verify`) with development API URL `http://localhost:5000/api`; the authored stack starts an isolated API and Next server itself. The test stack expects local HTTP; Docker production builds separately embed `/api`.

In PowerShell, the test variable is set with `$env:TEST_MONGODB_URI='...'`; in CMD use `set TEST_MONGODB_URI=...`. Test URI must specify a database whose name ends `_test`. The harness refuses a general production-shaped URI. The test Compose database uses temporary storage and is not a backup solution.

The real HTTP suites cover authentication/portal rejection, MFA and historical manual billing plus V47 normalized-provider-evidence settlement, concurrent replay, certificate approval/ownership/PDF/revocation and refund records. The V47 suite uses payment proof fixtures, NOT real Stripe/PayPal transactions; actual sandbox/live merchant tests remain separate. Playwright checks public portals, removed resources and mobile layouts. They are **additional gates**, not substitutes for the full acceptance checklist or an independent penetration test.

## C. Prepare production configuration

After staging passes, use your actual hostname in the following command; `YOUR_OWNED_HOSTNAME` is a placeholder to replace, not literal configuration.

```sh
npm run setup:production -- --domain=YOUR_OWNED_HOSTNAME
```

The script writes `backend/.env.production` and `.env.deploy`, preserving the configured AUTH/MFA secrets rather than replacing them. It refuses to overwrite an existing production file. Edit production values privately: production MongoDB URI, actual SMTP host/port/user/password and verified EMAIL_FROM, intended admin email addresses, domain and any scanner timeout setting. Also review the copied payment settings: setup:production preserves existing fields, so you MUST replace staging gateway keys/mode/webhook details with the matching live configuration only after authorized staging acceptance. Read PAYMENTS-V47.md. If online payments are enabled, production preflight rejects sandbox providers.

**Important format:** `.env.production` is for Docker Compose `env_file` with `format: raw`; values are unquoted and `$`/`#` are literal. Do not shell-source it or treat it as a normal dotenv file. This avoids accidentally interpreting SMTP passwords. Do not manually add quote characters around values. Do not run it through a secrets-printing command in CI logs. Configuration output may contain credentials: use `docker compose ... config --quiet`, not a publicly logged full `config` dump.

Production sets HTTPS origins, `PUBLIC_API_URL=/api`, exact proxy trust of one hop, mandatory admin MFA/email verification and required scanning. The backend refuses invalid production config. Preflight checks syntax/settings, not real SMTP delivery or successful virus scanning.

Set DNS to the intended gateway host, ensure certificate issuance can reach it, and use a firewall that permits only required public ports and controlled management access. Do not also expose the API through another route that bypasses the gateway's protections.

## D. Build, migrate and start

From the root, with production configuration reviewed and backups completed:

```sh
docker compose --env-file .env.deploy -f compose.production.yml config --quiet
docker compose --env-file .env.deploy -f compose.production.yml build --pull
docker compose --env-file .env.deploy -f compose.production.yml up -d scanner
docker compose --env-file .env.deploy -f compose.production.yml run --rm --no-deps backend npm run preflight
docker compose --env-file .env.deploy -f compose.production.yml run --rm --no-deps backend npm run migrate:v47
docker compose --env-file .env.deploy -f compose.production.yml run --rm --no-deps backend npm run seed:admins
docker compose --env-file .env.deploy -f compose.production.yml run --rm --no-deps backend npm run mail:verify
docker compose --env-file .env.deploy -f compose.production.yml up -d
docker compose --env-file .env.deploy -f compose.production.yml ps
npm run smoke -- --url=https://YOUR_OWNED_HOSTNAME
```

Run one command at a time and **stop on error**. Migrate in a controlled maintenance window, not simultaneously from several replicas. No course reseed is required. `mail:verify` tests SMTP transport configuration/authentication, not receipt in an inbox. Submit an actual verification/reset email to an address you control and confirm arrival privately.

Scanner signatures may still be downloading after the container starts. Check private scanner logs for readiness and perform a clean-file upload before handover. A running backend health check does not mean the scanner or email delivery is working. Configure monitoring for scanner age/availability, HTTP errors, DB pressure and storage use.

Caddy, ClamAV and Docker startup were not exercised here; validate their live configuration on staging, including certificate renewal and the exact provider-network environment. Do not disable a failing protection to get a green homepage.

## E. Account and data operation

Client Admin and Super Admin have separate portals, MFA enrollment, revocable sessions and API permissions. A student cannot acquire a role through signup or a portal header. Super Admin cannot read business invoices/customers through the application API. A server/database owner inherently remains more privileged than either application account; this is not tenant isolation from your own infrastructure operator.

Keep `MFA_ENCRYPTION_KEY` stable and securely backed up. For legitimate owner-confirmed admin recovery only, on a trusted machine/container:

```sh
# Review both configured admin credentials first; this can reset both accounts.
npm --prefix backend run seed:admins -- --reset-password
# Only when an owner has verified loss of all authenticator/recovery codes:
npm --prefix backend run admin:recover -- --email ACTUAL_ADMIN_EMAIL --reset-mfa --confirm-owner-recovery
```

Those commands use the backend's loaded environment. For production containers, run the corresponding command after `docker compose ... run --rm --no-deps backend` without `--prefix backend`. Recovery revokes sessions and requires MFA enrollment again; it must never become a public recovery endpoint. Do not use recovery just to skip MFA.

Normal V47 online checkout creates invoice, receipt and access together only after verified provider confirmation. Historical manual invoice issuance still does not prove money arrived. Financial sensitive writes use transactions. Record real receipt/refund dates and references. Pending legacy payment labels without evidence are not counted as collected cash. Net collections is receipts minus recorded refunds, not profit or a tax report.

## F. Upload and content operations

Production uploads use temporary disk files, signature checks, scanning, image re-encoding and protected GridFS delivery. Images max 10 MB; default other supported uploads max 250 MB. AVIF/HEIC/SVG uploads are intentionally unsupported in this release. Image re-encoding strips metadata and converts animations to a static frame. PDF scanning is not full document sanitization; external links retain their external host's security/access controls.

Existing GridFS files are **not retroactively scanned**. `npm run media:audit` in the backend reports scan metadata totals without modifying data. Automatic physical deletion of detached GridFS files is disabled to avoid races with shared lesson references. Plan an owner-reviewed retention/orphan cleanup job after backups; do not assume clicking Remove reduces storage immediately. No storage quota manager is implemented.

Course/module/lesson multi-document edits/deletions remain legacy non-atomic operations. Use controlled editorial changes and test interruption/concurrent editing before broad multi-editor use. Courses with purchase/invoice history should be unpublished rather than deleted. Existing slugs are intentionally protected.

## G. Rollback, maintenance and release approval

Retain a last-known-good image/source release plus a tested database backup. Do not mix V47-only database records with an older application and assume all workflows are compatible. If rollback is required, stop writes, reconcile in-flight invoices/receipts, restore a compatible application/database pair in a controlled window and verify access and balances. Never roll back by deleting all new collections in production.

Schedule reviewed dependency updates, container/signature updates, secrets access reviews, expired-session cleanup checks, storage monitoring and backup restoration exercises. Session idle/absolute limits, audit retention and server clocks need monitoring. Do not log passwords, reset links, MFA setup keys, tokens or complete customer records.

## H. Payments and certificates release gates

Read PAYMENTS-V47.md and register both exact signed webhook endpoints under `/api/payments/webhooks/stripe` and `/api/payments/webhooks/paypal`. Caddy already proxies `/api`; never put general browser authentication in front of provider webhooks or mutate Stripe's raw request body. Signature checks are mandatory even though these two endpoints are exempt from browser CSRF.

Start with a separate sandbox database and actual provider test users. Test payment return and browser-never-returns behavior, duplicate/cross-user/amount/environment failures, full/partial refund synchronization and membership boundaries. A green `/health` or configuration flag is not a successful merchant payment. No online recurring charging is enabled: memberships are fixed-term one-time purchases.

For legacy completions, backfill first in dry-run mode and only apply after review. Confirm private issued PDFs, public verification scope, revocation and domain stability. Back up stored PDF records along with the rest of the database. A certificate is required-lesson completion plus approval, not a graded/accredited examination result.

Rollback after live V47 transactions must reconcile the payment provider and preserve new invoices/receipts/refunds/completions. Do not switch to V46 code and assume its manual-only model knows how to process V47 gateway events. Stop intake, retain signed pending events and obtain a reviewed application/data recovery plan.

**Release approval requires recorded results from ACCEPTANCE-V47.md.** There is no guarantee of 0.05 ms page loads, 100% uptime, unlimited concurrency or perfect security. Measure performance on production-like mobile/desktop devices and networks, and load-test real business histories before setting capacity expectations.
