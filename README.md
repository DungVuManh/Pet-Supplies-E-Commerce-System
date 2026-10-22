# Pet Supplies E-Commerce System

This repository has a Next.js frontend and an Express/Mongoose backend. The backend
provides Firebase customer authentication, HttpOnly sessions, MongoDB profiles,
middleware and tests, Product/Staff order read APIs and Staff in-store CASH sales.
Cart and online checkout APIs are not implemented yet.

## Requirements

- Node.js 24.x and npm 11+ (required by `backend/package.json`)
- A running MongoDB server reachable at the URI in `backend/.env`
- For Staff in-store order creation, MongoDB must be a replica set or Atlas.
  Standalone MongoDB supports the existing reads but sale creation fails closed
  with `TRANSACTIONS_REQUIRED`; there is no non-transactional fallback.

Staff opens **Tạo đơn hộ khách** from Orders or Dashboard. The form can select an
existing Customer or record guest contact information without creating a User,
select live SKUs and confirm cash received. The backend creates a completed paid
offline order and commits inventory, payment and audit together. See the
[creation spec](docs/specs/staff-order-create.md) and [plan](docs/plan/staff-order-create.md).
Restart the backend after updating so startup creates the new partial idempotency
index; no existing User/order data migration is required.

There is no Docker Compose file in this repository. Download it yourself (using Docker or manually). Start MongoDB separately or
point `MONGODB_URI` to a MongoDB deployment you can access. The backend waits for
MongoDB to connect before it starts listening.

## Run both apps

From the repository root, install each project's dependencies:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend ci
Copy-Item backend/.env.example backend/.env
```

On macOS/Linux, use `cp backend/.env.example backend/.env` for the last command.
The backend example uses `PORT=3001`. Keep
`CORS_ORIGIN=http://localhost:3000` for the frontend, and set `MONGODB_URI` to
your running MongoDB server, including credentials and `authSource` if required.
Configure Firebase and `frontend/.env.local` using [authentication setup](docs/authentication.md).

Start both apps from the repository root:

```powershell
npm run dev
```

Open the frontend at [http://localhost:3000](http://localhost:3000). The backend
listens on port 3001; see [authentication endpoints](docs/authentication.md#api).
Press `Ctrl+C` to stop the development processes.

## Run one app at a time

From the repository root, use `npm run dev:frontend` or `npm run dev:backend`.
The backend still needs MongoDB and its environment configuration. Its dev script
uses Nodemon, so server changes restart it automatically.

## Backend structure

```text
backend/src/
  config/        Environment, MongoDB and Firebase setup
  routers/       Endpoint registration (auth.router.js)
  controllers/   Request handling, authentication logic, responses and cookies
  models/        Mongoose schemas and persistence
  validators/    Request input validation
  common/        Shared errors and middleware
  app.js         Express application composition
  server.js      Startup and shutdown
```

Requests flow through routers, controllers and models. Keep input
validation in `validators/` and add new features to the corresponding layers.
Controllers export handlers such as `login` and `register` directly; routers
import those handlers and export an Express router.

## Backend tests

```powershell
npm --prefix backend test
```

Tests do not require MongoDB, but HTTP tests need permission to open local
loopback sockets. See [backend/AGENTS.md](backend/AGENTS.md) for current backend
structure and conventions.
