# Pet Supplies E-Commerce System

This repository has a Next.js frontend and an Express/Mongoose backend. The backend
provides Firebase customer authentication, HttpOnly sessions, MongoDB profiles,
middleware and tests. Product, cart and order APIs are not implemented yet.

## Requirements

- Node.js 24.x and npm 11+ (required by `backend/package.json`)
- A running MongoDB server reachable at the URI in `backend/.env`

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
  controllers/   HTTP requests, responses and cookies
  services/      Authentication and session business logic
  models/        Mongoose schemas and persistence
  validators/    Request input validation
  common/        Shared errors and middleware
  app.js         Express application composition
  server.js      Startup and shutdown
```

Requests flow through routers, controllers, services and models. Keep input
validation in `validators/` and add new features to the corresponding layers.

## Backend tests

```powershell
npm --prefix backend test
```

Tests do not require MongoDB, but HTTP tests need permission to open local
loopback sockets. See [backend/AGENTS.md](backend/AGENTS.md) for current backend
structure and conventions.
