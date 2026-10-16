# Pet Supplies E-Commerce Backend

Technical foundation for a feature-based modular monolith. This initialization
contains configuration, HTTP middleware, MongoDB lifecycle management, OpenAPI
documentation, and infrastructure tests. No business routes, models, collections,
or seed data are defined.

## Requirements and stack

- Node.js **24.x** (Active LTS on 2026-10-16); `.nvmrc` pins **24.22.0**.
- npm **11+** and Docker Desktop with its Linux engine running.
- Express 5, JavaScript with native ESM, MongoDB and Mongoose.
- Zod, dotenv, Helmet, CORS, express-rate-limit, Swagger UI / OpenAPI 3.
- Node.js watch mode, ESLint flat config, Prettier, Vitest, Supertest.

Dependencies use exact versions in `package.json`; `package-lock.json` pins the
entire dependency tree. Use `npm ci` for a reproducible installation.

Installed direct packages:

| Runtime package    | Version | Development package    | Version |
| ------------------ | ------- | ---------------------- | ------- |
| cors               | 2.8.6   | @eslint/js             | 10.0.1  |
| dotenv             | 18.0.8  | eslint                 | 10.12.0 |
| express            | 5.3.0   | eslint-config-prettier | 10.1.8  |
| express-rate-limit | 8.7.1   | prettier               | 3.9.10  |
| helmet             | 8.3.0   | supertest              | 7.3.1   |
| mongoose           | 9.11.2  | vitest                 | 5.0.5   |
| swagger-ui-express | 5.0.1   |                        |         |
| zod                | 4.6.7   |                        |         |

## Local setup

Run from the repository root after selecting Node 24 in your version manager:

```powershell
cd backend
node --version
npm ci
Copy-Item .env.example .env
docker compose up -d --wait
npm run dev
```

On macOS/Linux, replace `Copy-Item .env.example .env` with `cp .env.example .env`.
With nvm, use `nvm install 24.22.0` and `nvm use 24.22.0` (nvm-windows uses these
same explicit version arguments). The installed system Node must satisfy the
declared engine; Node 22.11 is too old for this toolchain.

Open [Swagger UI](http://localhost:3001/api/docs/). `/api/docs` redirects to that
page. Its OpenAPI document has no operations yet. Unknown routes, including `/`,
return JSON 404 responses. The HTTP listener starts only after MongoDB connects.

## Environment

dotenv loads `backend/.env` when commands run from this directory. Existing shell
variables take precedence. Zod validates configuration before database connection
or HTTP startup. Errors report field names without echoing sensitive values.

| Variable           | Development default                      | Validation / purpose                                                        |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`         | `development`                            | `development`, `test`, or `production`                                      |
| `PORT`             | `3001`                                   | Integer from 1 through 65535                                                |
| `MONGODB_URI`      | `mongodb://127.0.0.1:27017/pet_supplies` | MongoDB driver URI validation; supports `mongodb://` and `mongodb+srv://`   |
| `CORS_ORIGIN`      | `http://localhost:3000`                  | Comma-separated exact HTTP(S) origins; no wildcard, path, or trailing slash |
| `MONGODB_PORT`     | `27017`                                  | Compose host port only; update `MONGODB_URI` to match if changed            |
| `MONGODB_DATABASE` | `pet_supplies`                           | Compose database selection; keep URI database consistent                    |

`MONGODB_URI` and `CORS_ORIGIN` must be explicitly supplied in production. Empty or
invalid values fail rather than silently falling back. `.env` and its variants
are ignored by Git; `.env.example` is tracked. No auth/payment secrets are needed.

## MongoDB development container

`docker-compose.yml` runs only the official `mongo:8.0.30` image, with a persistent
named volume, ping health check, and `unless-stopped` restart policy. The port is
bound to `127.0.0.1`; this unauthenticated standalone container is for local
development. Use a secured MongoDB deployment in production.

```powershell
docker compose config --quiet
docker compose up -d --wait
docker compose ps
docker compose logs mongodb
docker compose exec mongodb mongosh --quiet --eval "db.adminCommand('ping')"
docker compose down
```

`docker compose down` preserves the named volume. `docker compose down -v`
**deletes local database data**. There are no initialization scripts, models, or
seed documents. `MONGO_INITDB_DATABASE` selects a database for initialization;
MongoDB creates a database only after its first write.

Before implementing multi-document transactions for future order/inventory
workflows, configure MongoDB as a **replica set** (or use a suitable managed
deployment). A standalone server does not support those transactions. Replica set
and transaction handling are outside this initialization.

If Docker reports a missing engine/named pipe, start Docker Desktop and its Linux
engine first. A successful `docker compose config` validates YAML only; it does
not prove that MongoDB is running.

## Commands

Run all commands inside `backend/`:

| Command                | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Node.js development server with native watch mode              |
| `npm run lint`         | ESLint for source, tests, and JavaScript configuration         |
| `npm run format`       | Format supported project files with Prettier                   |
| `npm run format:check` | Verify formatting without modifying files                      |
| `npm test`             | Run infrastructure tests once                                  |
| `npm run test:watch`   | Run Vitest in watch mode                                       |
| `npm start`            | Run the JavaScript server directly                             |
| `npm audit`            | Check the installed dependency graph for known vulnerabilities |

Tests do not load `.env`, start the production server, or require MongoDB. Supertest
uses temporary local HTTP listeners, so the test environment must allow loopback
sockets. Tests cover configuration validation, app creation without side effects,
404s, error envelopes, async errors, CORS, request size limits, rate limits,
security headers, Swagger assets, and mocked database connection/disconnection.

For production, set `NODE_ENV=production`, `MONGODB_URI`, `CORS_ORIGIN`, and optionally
`PORT` in the deployment environment, then run:

```powershell
npm ci
npm run lint
npm test
npm prune --omit=dev
npm start
```

No compilation or build step is required. The HTTP server drains active requests on
SIGINT/SIGTERM, then disconnects Mongoose; shutdown has a ten-second deadline.
Startup errors exit with a nonzero code. Database errors never log raw connection
strings or driver exceptions.

## Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   ├── common/
│   │   ├── errors/app-error.js
│   │   └── middlewares/
│   │       ├── error.middleware.js
│   │       └── not-found.middleware.js
│   ├── modules/.gitkeep
│   ├── docs/swagger.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── app.test.js
│   ├── database.test.js
│   └── env.test.js
├── .env.example
├── .gitignore
├── .nvmrc
├── .prettierrc
├── .prettierignore
├── docker-compose.yml
├── eslint.config.js
├── vitest.config.js
├── package.json
├── package-lock.json
└── README.md
```

The empty `modules/` directory is tracked as the future feature boundary.
`common/utils/` will be added only when a shared utility exists.

## Architecture conventions

`app.js` exports `createApp(config)`, which returns the configured Express
application without reading environment files, connecting MongoDB, or listening
on a port. `server.js` owns startup, validated configuration, connection and
shutdown. The factory allows isolated tests and avoids global mutable app state.

Middleware order is Helmet, explicit CORS, API rate limiting, bounded body parsers,
documentation, then 404 and error handlers. Future routers belong at `/api/v1`
before the fallback handlers. JSON and URL-encoded bodies are limited to 100 KB.
API traffic allows 100 requests per IP per 15 minutes; rate limiting uses the
default in-memory store for a single process. Review the store and trusted proxy
configuration before scaling to multiple instances or deploying behind a proxy.
Proxy headers are not trusted automatically.

Error responses follow one envelope, including 404, 429, malformed JSON (400),
oversized bodies (413), disallowed origins (403), and unexpected errors (500):

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": { "code": "INTERNAL_SERVER_ERROR" }
}
```

Use `AppError` for intentional public errors. Unexpected errors always receive a
generic message and never expose stacks. Express 5 forwards returned rejected
promises to error middleware; no async wrapper package is necessary.

Future modules should use this convention; these example files are **not created**:

```text
src/modules/<feature>/
  <feature>.routes.js
  <feature>.controller.js
  <feature>.service.js
  <feature>.model.js
  <feature>.schema.js
```

Request flow: route → middleware → controller → service → Mongoose model → MongoDB.
Routes bind handlers, controllers translate HTTP, services own business logic,
models own persistence definitions, and Zod schemas validate incoming payloads.
Keep reusable technical concerns in `common/`; avoid repository layers, dependency
injection frameworks, and circular imports. ESM imports use explicit `.js`
extensions and run directly with Node.

## Next implementation steps

Agree on the first business feature and its API contract, then add only that
feature's module and tests. Configure a replica set before transaction-dependent
work. No authentication, catalog, cart, payment, or inventory code is included.

## Initialization verification

Verified on Windows with Node 24.22.0 and npm 11.11.1:

- Dependency installation and `npm ls --depth=0` succeeded; `npm audit` reported
  zero known vulnerabilities.
- ESLint and Prettier check passed; JavaScript runs directly without a build.
- All 35 tests across three files passed without a running database dependency.
- Compose configuration validated; `mongo:8.0.30` became healthy and returned
  `{ ok: 1 }` to an actual ping.
- Both `npm start` and `npm run dev` connected to MongoDB and listened on port 3001.
  Production Swagger HTML and its initialization script returned HTTP 200;
  an unknown API path returned the expected HTTP 404 envelope.
- Invalid configuration and an unavailable database each exited with code 1.
  Interrupting the production server logged shutdown and MongoDB disconnection.

The execution sandbox blocks loopback connections, so Supertest and runtime smoke
checks were run with local network access enabled. The machine's default Node
remained 22.11; verification used a separate Node 24 runtime. Select Node 24 before
running this project locally. Compose uses the explicit project name
`pet-supplies-backend` to avoid collisions with other directories named `backend`.

## Official references

- [Node.js release schedule](https://github.com/nodejs/Release/blob/main/schedule.json)
- [Express 5 error handling](https://expressjs.com/en/guide/error-handling/)
- [Mongoose connection options and events](https://mongoosejs.com/docs/connections.html)
- [MongoDB official image](https://hub.docker.com/_/mongo)
- [MongoDB transaction prerequisites](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
- [Rate limiter configuration and memory store](https://express-rate-limit.mintlify.app/reference/configuration)
- [Swagger UI Express integration](https://github.com/scottie1984/swagger-ui-express)
- [Zod schema validation](https://zod.dev/api)
- [ESLint language options](https://eslint.org/docs/latest/use/configure/language-options)
- [Node.js native watch mode](https://nodejs.org/api/cli.html#--watch)
- [Vitest configuration](https://vitest.dev/config/)
