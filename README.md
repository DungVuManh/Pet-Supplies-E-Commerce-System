# Pet Supplies E-Commerce System

This repository has a Next.js frontend and an Express/Mongoose backend. The backend
currently provides configuration, middleware, MongoDB connectivity, and Swagger
documentation; product, cart, order, and other business APIs are not implemented yet.

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
Then edit `backend/.env` and set `PORT=3001`. The example currently says
`PORT=3000`, which would conflict with the frontend. Keep
`CORS_ORIGIN=http://localhost:3000` for the frontend, and set `MONGODB_URI` to
your running MongoDB server if it differs from the example.

Start both apps from the repository root:

```powershell
npm run dev
```

Open the frontend at [http://localhost:3000](http://localhost:3000) and the
backend's Swagger UI at [http://localhost:3001/api/docs/](http://localhost:3001/api/docs/).
Swagger currently lists no business endpoints. Press `Ctrl+C` to stop the
development processes.

## Run one app at a time

From the repository root, use `npm run dev:frontend` or `npm run dev:backend`.
The backend still needs MongoDB and its environment configuration. Its dev script
uses Nodemon, so server changes restart it automatically.

## Backend tests

```powershell
npm --prefix backend test
```

Tests do not require MongoDB, but HTTP tests need permission to open local
loopback sockets. See [backend/AGENTS.md](backend/AGENTS.md) for current backend
structure and conventions.
