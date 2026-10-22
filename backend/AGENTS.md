# Backend agent instructions

These instructions apply to `backend/`. Keep this file aligned with the code and
`package.json` when changing the backend.

## Current scope

- This is an Express 5, MongoDB/Mongoose, JavaScript ESM backend with Firebase
  authentication for customer/staff/admin, session cookies, profile persistence, middleware
  and tests. All 14 SRS section 5.2 models are defined, including PetProfile and
  Wishlist. Role-specific dashboard bootstrap APIs return the public profile only.
  Product and Staff order read APIs exist. Staff can create completed CASH offline
  orders through `staff-sale.controller.js`; cart/online checkout APIs are not implemented.
  Staff can PATCH `/api/v1/staff/orders/:id/status` with JSON/Origin/CSRF to move
  online orders pending → confirmed → processing → shipping, or cancel pending/confirmed.
  Status/history update atomically in Order using expectedStatus; no stock/payment
  mutation. Shipping metadata is optional. Staff cannot mark orders completed.
  See `../docs/specs/staff-order-status.md` for confirmation guards and the API contract.
  `src/scripts/seed.js` provides
  development/test sample data for all 13 non-User models using existing users.
- Use Node.js 24.x and npm 11+ as declared in `package.json`. Run commands from
  `backend/`. Use `npm ci` to install the locked dependencies.
- The tracked backend has no `.nvmrc`, Docker Compose file, ESLint configuration,
  Prettier configuration, or build step. MongoDB must be supplied separately to
  run the server. Do not assume the old README's Docker commands or lint/format
  scripts exist.

## Local setup and commands

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Start a local MongoDB server that matches MONGODB_URI.
npm run dev
```

On macOS/Linux, use `cp .env.example .env`. `npm run dev` starts Nodemon on
`src/server.js`; `npm start` runs the same server directly. `npm test` runs Vitest
once and `npm run test:watch` runs it in watch mode. Supertest needs permission to
open local loopback sockets, but the tests do not require a running MongoDB server.

`npm run seed` connects to the configured MongoDB and inserts missing samples;
it does not delete or overwrite existing documents or create/modify User data.
It requires an existing customer and at least one staff/admin, selected by lowest
MongoDB `_id` per role. Missing users stop the seed before index creation/data
writes. It refuses `NODE_ENV=production`. Offline sample orders require Staff;
with only Admin, all 13 collections are still populated using online orders.
See `src/models/README.md` for seed contents and rerun behavior.

The copied `.env.example` and runtime default use `PORT=3001`. The frontend uses
port 3000. Keep
the example, runtime default, tests, and documentation in sync if you change port
behavior. `CORS_ORIGIN=http://localhost:3000` identifies the allowed frontend
origin; it does not select the backend listening port.

## Configuration and startup

- `src/config/env.js` loads `.env` with dotenv and validates settings with Zod.
  Existing shell variables take precedence. `NODE_ENV` defaults to `development`;
  `PORT` must be an integer from 1 to 65535.
- In development and test, `MONGODB_URI` defaults to
  `mongodb://127.0.0.1:27017/pet_supplies` and `CORS_ORIGIN` to
  `http://localhost:3000`. Supply both explicitly in production. `CORS_ORIGIN`
  accepts comma-separated, exact HTTP(S) origins without paths or trailing
  slashes. Invalid configuration reports field names without secret values.
- `FIREBASE_PROJECT_ID` defaults to `wdp-pet-supplies`. Firebase Admin uses
  Application Default Credentials; locally set `GOOGLE_APPLICATION_CREDENTIALS`
  to an absolute service-account JSON path outside the repository. Never log the
  file contents or put them in frontend configuration. See `../docs/authentication.md`.
- `src/server.js` initializes Firebase, connects to MongoDB and explicitly creates
  all declared model indexes through `createModelIndexes()`, then listens on
  the configured port. It drains requests and disconnects Mongoose on SIGINT or
  SIGTERM, with a ten-second shutdown deadline. Connection errors must not log
  raw database URIs or driver exceptions. MongoDB must allow reads, writes and
  index creation; a connected socket alone does not prove authentication works.
- `src/models/index.js` exports the 14 persistence models. See
  `src/models/README.md` for collections, field conventions, indexes and validation
  limits. Keep Firebase identity fields unchanged; domain user references use its MongoDB
  `_id`, not its Firebase UID. Models do not implement stock reservation, payment
  verification, review purchase eligibility or authorization.
- Staff sale creation currently supports standalone MongoDB with sequential
  writes and best-effort compensation, as explicitly requested by the user.
  A pending Order claims the request key before stock/Payment/AuditLog writes;
  mark it complete only after all writes succeed. Pending orders stay out of
  list/detail/summary and cannot replay as successful receipts. Failed cleanup,
  uncertain stock writes or final acknowledgements retain the pending request
  for manual reconciliation; never auto-retry its deductions. This is not atomic
  across documents or process crashes; use transactions for production atomicity. Startup
  creates the partial unique `(createdByStaffId, creationRequestId)` index for
  duplicate-submit protection. `CASH` is for offline sales, not online COD.
  See `../docs/specs/staff-order-create.md` for API/input/idempotency contracts.

## Code boundaries

- `src/app.js` exports `createApp(config)` without reading `.env`, connecting to
  MongoDB, or opening a listener. Keep those side effects in `src/server.js` so
  application tests remain isolated. It stores validated configuration in
  `app.locals.config`; handlers access it through `request.app.locals.config`.
- Middleware runs in this order: Helmet, explicit CORS, rate limiting for
  `/api/v1`, 100 KB JSON and URL-encoded parsers, auth
  router at `/api/v1/auth`, workspace router under `/api/v1`, then 404 and error handlers. Auth/workspace no-store headers are
  set before CORS/parsers/limiting so error responses also remain uncacheable.
  Mount future feature routers under `/api/v1` before the
  fallback handlers. The rate limit is 100 requests per IP per 15 minutes with
  an in-memory store; review proxy trust and the store before scaling out.
- Keep errors in the common `{ success: false, message, error: { code } }`
  envelope. Use `AppError` for intentional public errors; unexpected errors get
  a generic message without a stack. Express 5 forwards rejected route promises.
- Organize `src/` by layer: `routers/` binds routes to handlers, `controllers/`
  handles HTTP and business logic, `models/` owns Mongoose persistence, and
  `validators/` owns Zod input schemas. Keep routers thin; controllers call
  Firebase and models directly. Put reusable technical concerns in `src/common/`
  and environment/database/Firebase setup in `src/config/`. Use explicit `.js`
  extensions in ESM imports. Auth uses `auth.router.js`, `auth.controller.js`,
  `auth.schema.js`, and `user.model.js` in their respective layers.
- Controllers export named handlers directly (for example `login(request,
response)`); routers import those handlers and export the Express router.
  Do not wrap controllers or routers in factory functions or pass test adapters
  through application code. Tests mock Firebase, model methods and the clock.
- Unknown routes return JSON 404. Document authentication endpoints in
  `../docs/authentication.md` when changing their behavior.
- Auth mutation endpoints require JSON, an allowed Origin and matching CSRF
  cookie/header. Identity and email come from Firebase verification, never the
  request body. Password provider and <5-minute sign-in are required to exchange
  an ID token for an HttpOnly session. `/me` checks revocation; logout clears only
  the current browser cookie. Default tokens last 24 hours; remembered sessions
  last 14 days. Production uses Secure `__Host-` cookies. Do not cache auth data.
- Protected requests use `readCookies`, `requireAuth`, and exact-role `requireRole`
  from `src/common/middlewares/auth.middleware.js`. Firebase sessions check
  revocation; current roles are loaded from MongoDB on every request. Staff and
  Admin do not inherit each other's workspace access. The dashboard endpoints at
  `/api/v1/staff/dashboard` and `/api/v1/admin/dashboard` return only public user
  fields. Their responses, including errors, use no-store headers before middleware.
- POST `/api/v1/staff/orders` additionally uses the existing `protectMutation`
  JSON/Origin/CSRF guard. The server derives actor, prices, statuses and totals;
  `expectedPrice` is a comparison precondition only. Pending request recovery is
  scoped to the current actor and only returns a receipt, never the request hash.
- User profiles are insert-only upserts keyed by unique Firebase UID. Registration
  retries must never overwrite an existing profile or accept a client role.
  Preserve incomplete-profile recovery when changing the registration flow.

## Verification

- `tests/env.test.js`, `tests/app.test.js`, and `tests/database.test.js` cover
  configuration, HTTP middleware/error behavior, and mocked
  database lifecycle. Run `npm test` after backend changes.
- `tests/auth.test.js` covers auth/CSRF HTTP boundaries, token/session validation,
  public profile projection, insert-only persistence and dependency failures using
  mocked dependencies. It does not verify Firebase or MongoDB live connectivity.
- `tests/models.test.js` covers document validation, defaults, snapshot structure
  and index declarations without a database. `tests/database.test.js` also checks
  explicit index initialization using mocked model methods. These tests do not
  verify unique constraints or concurrency against a live MongoDB server.
- `tests/seed.test.js` uses real Mongoose queries/save middleware and mocks only
  collection operations at the database boundary
  to check all 13 seeded models, references, totals, repeated runs, preservation of
  existing data, missing-user preflight and disconnect behavior. It never seeds
  the configured database or calls Firebase/payment/email services.
- Check any command or file mentioned here against the current tree before
  updating instructions. Do not claim a server or MongoDB smoke test passed
  unless it was actually run.
- `tests/staff-sale*.test.js` cover input, HTTP authorization/CSRF, replay,
  pending receipts and standalone compensation with mocked dependencies. The
  optional isolated `tests/staff-sale-integration.mjs` uses a standalone test
  server from `mongodb-memory-server-core` via `MONGODB_MEMORY_MODULE_PATH`, or
  an explicit server URI via `STAFF_SALE_TEST_MONGODB_URI`. It always creates
  and drops its own randomly named database; it never loads `.env` or uses
  the application's database. It exercises real compensation/concurrency. Test-tool dependencies
  are optional and are not added to the application lockfiles.
