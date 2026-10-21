# Backend agent instructions

These instructions apply to `backend/`. Keep this file aligned with the code and
`package.json` when changing the backend.

## Current scope

- This is an Express 5, MongoDB/Mongoose, JavaScript ESM backend with Firebase
  customer authentication, session cookies, profile persistence, middleware
  and tests. Product/cart/order APIs and seed data are not implemented.
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
  the unique Firebase UID index, then listens on
  the configured port. It drains requests and disconnects Mongoose on SIGINT or
  SIGTERM, with a ten-second shutdown deadline. Connection errors must not log
  raw database URIs or driver exceptions. MongoDB must allow reads, writes and
  index creation; a connected socket alone does not prove authentication works.
- The default local MongoDB URI has no replica set configuration. Use a replica
  set before introducing multi-document transactions.

## Code boundaries

- `src/app.js` exports `createApp(config)` without reading `.env`, connecting to
  MongoDB, or opening a listener. Keep those side effects in `src/server.js` so
  application tests remain isolated. It stores validated configuration in
  `app.locals.config`; handlers access it through `request.app.locals.config`.
- Middleware runs in this order: Helmet, explicit CORS, rate limiting for
  `/api/v1`, 100 KB JSON and URL-encoded parsers, auth
  router at `/api/v1/auth`, then 404 and error handlers. Auth no-store headers are
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
- Check any command or file mentioned here against the current tree before
  updating instructions. Do not claim a server or MongoDB smoke test passed
  unless it was actually run.
