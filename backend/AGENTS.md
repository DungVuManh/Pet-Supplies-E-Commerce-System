# Backend agent instructions

These instructions apply to `backend/`. Keep this file aligned with the code and
`package.json` when changing the backend.

## Current scope

- This is an Express 5, MongoDB/Mongoose, JavaScript ESM backend foundation. It has
  configuration, middleware, Swagger UI, database lifecycle code, and tests, but no
  business routes, models, seed data, or authentication yet.
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

The copied `.env.example` sets `PORT=3000`, so Swagger UI is at
`http://localhost:3000/api/docs/` with that file loaded. Without `PORT` in the
environment, `src/config/env.js` defaults to **3001**. The frontend's development
server also uses port 3000; choose a free backend port when running both. Keep
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
- `MONGODB_PORT` and `MONGODB_DATABASE` appear in `.env.example` but are not read
  by the application. They do not change `MONGODB_URI` or create a database.
- `src/server.js` validates configuration, connects to MongoDB, then listens on
  the configured port. It drains requests and disconnects Mongoose on SIGINT or
  SIGTERM, with a ten-second shutdown deadline. Connection errors must not log
  raw database URIs or driver exceptions.
- The default local MongoDB URI has no replica set configuration. Use a replica
  set before introducing multi-document transactions.

## Code boundaries

- `src/app.js` exports `createApp(config)` without reading `.env`, connecting to
  MongoDB, or opening a listener. Keep those side effects in `src/server.js` so
  application tests remain isolated.
- Middleware runs in this order: Helmet, explicit CORS, rate limiting for
  `/api/v1`, 100 KB JSON and URL-encoded parsers, Swagger UI at `/api/docs`, then
  404 and error handlers. Mount future feature routers under `/api/v1` before the
  fallback handlers. The rate limit is 100 requests per IP per 15 minutes with
  an in-memory store; review proxy trust and the store before scaling out.
- Keep errors in the common `{ success: false, message, error: { code } }`
  envelope. Use `AppError` for intentional public errors; unexpected errors get
  a generic message without a stack. Express 5 forwards rejected route promises.
- `src/modules/` is empty and reserved for feature modules. Add only the module
  needed for an agreed feature. Routes bind handlers; controllers translate HTTP;
  services own business logic; Mongoose models own persistence; Zod schemas
  validate input. Put reusable technical concerns in `src/common/`. Use explicit
  `.js` extensions in ESM imports.
- `src/docs/swagger.js` currently defines OpenAPI 3 with no operations. Unknown
  routes return JSON 404 responses. Update the document when adding routes.

## Verification

- `tests/env.test.js`, `tests/app.test.js`, and `tests/database.test.js` cover
  configuration, HTTP middleware/error behavior, Swagger assets, and mocked
  database lifecycle. Run `npm test` after backend changes.
- Check any command or file mentioned here against the current tree before
  updating instructions. Do not claim a server or MongoDB smoke test passed
  unless it was actually run.
