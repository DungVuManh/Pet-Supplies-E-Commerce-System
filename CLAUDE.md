# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout and runtime

This is a two-package application, not an npm workspace:

- `frontend/`: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- `backend/`: Express 5, JavaScript ESM, Mongoose 9, Firebase Admin, Zod, Vitest.
- The root package only supplies `concurrently` scripts for launching both apps.

Use Node.js 24.x and npm 11+. The frontend runs on port 3000 and the backend defaults to port 3001. MongoDB is external; there is no Docker Compose configuration in this repository.

## Setup and commands

Install all three lockfiles from the repository root:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend ci
Copy-Item backend/.env.example backend/.env
```

Configure Firebase Web SDK values in `frontend/.env.local`. The backend uses Firebase Admin Application Default Credentials; `GOOGLE_APPLICATION_CREDENTIALS` points to a service-account file outside the repository. See `README.md` and the environment examples for the complete local setup.

```powershell
# Run both applications
npm run dev

# Run only one application
npm run dev:backend
npm run dev:frontend

# Backend production entry point
npm --prefix backend start

# Frontend production build and server
npm --prefix frontend run build
npm --prefix frontend start
```

### Verification

```powershell
# Backend: all tests, watch mode, one file, or one named test
npm --prefix backend test
npm --prefix backend run test:watch
npm --prefix backend test -- tests/auth.test.js
npm --prefix backend test -- tests/auth.test.js -t "test name"

# Frontend: all tests, one file, lint, and production build/type checking
npm --prefix frontend test
node --test frontend/tests/auth-api.test.mjs
node --test --test-name-pattern="test name" frontend/tests/auth-api.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

The backend has no build, lint, or format script. Backend unit/HTTP tests mock Firebase and MongoDB and do not prove live service connectivity. Supertest needs permission to open a loopback socket.

`frontend/tests/rbac-browser.mjs` is an optional smoke test against a running frontend. It requires Playwright and Chrome and accepts `TEST_BASE_URL` and `PLAYWRIGHT_MODULE_PATH`; details are in `frontend/README.md`.

## Backend architecture

`backend/src/app.js` builds the Express application without reading environment files, connecting to MongoDB, or opening a port. `backend/src/server.js` owns those side effects: validate environment, initialize Firebase Admin, connect to MongoDB, create every declared index, start HTTP, and drain connections on shutdown. Preserve this split so HTTP tests can call `createApp(config)` in isolation.

The backend is layered by responsibility:

- `routers/` binds paths and middleware to named controller handlers.
- `controllers/` handles HTTP and business orchestration.
- `validators/` contains Zod request schemas.
- `models/` contains persistence schemas and repositories.
- `common/` contains reusable errors and middleware.
- `config/` owns environment, Firebase, and database setup.

Use explicit `.js` extensions in backend ESM imports. Mount feature routers under `/api/v1` before the 404 and error middleware. The current pipeline applies no-store headers to auth/workspace routes, then Helmet, explicit CORS, API rate limiting, 100 KB parsers, routers, 404, and the centralized error handler. Intentional API failures use `AppError` and the `{ success: false, message, error: { code } }` envelope.

`backend/src/models/index.js` registers all 14 Mongoose models. Startup calls `createModelIndexes()` because `autoIndex` is disabled. Domain references to users store MongoDB `User._id`, not Firebase UID. The schemas define persistence and document validation, but product/cart/order controllers, stock reservation, payment verification, review eligibility, and seed data are not implemented. Read `backend/src/models/README.md` and `docs/SRS.md` before implementing those domains.

## Authentication and authorization

Firebase owns email/password identity; MongoDB stores the application profile and role. The browser obtains a Firebase ID token, sends it to Express, and receives an HttpOnly Firebase session cookie. The Firebase client uses memory-only persistence and signs out after the exchange.

Auth mutations require JSON, an allowed `Origin`, and matching CSRF cookie/header. The backend derives UID/email from verified Firebase claims, requires a recent password sign-in, and never accepts a client-selected role. Registration uses an insert-only profile upsert so retries cannot overwrite an existing profile. Preserve the incomplete-profile recovery path when changing registration.

Protected APIs use `readCookies`, `requireAuth`, and exact-role `requireRole` from `backend/src/common/middlewares/auth.middleware.js`. Every protected request verifies revocation and reloads the current MongoDB role. Staff and Admin do not inherit each other's access. Responses expose only the public profile `{ id, email, fullName, phone, role }`.

## Frontend architecture

The frontend uses App Router route groups:

- `app/(customer)/` supplies public storefront chrome, home/catalog, guest cart, and auth routes.
- `app/(workspace)/` supplies Staff/Admin dashboard routes without storefront chrome.
- Route pages/layouts stay as Server Components unless interaction requires a client boundary.
- `components/ui/` contains shared controls; `components/storefront/` contains storefront shell pieces; business logic and feature components live under `features/<feature>/`.

`AuthProvider` owns browser auth state and refreshes `/api/v1/auth/me` on mount/focus. `CartProvider` owns the in-memory guest cart; it is sample client state and resets on full reload. Catalog data is currently sample data, not a backend API.

Browser auth requests use relative `/api/v1/...` URLs. `frontend/next.config.ts` rewrites auth/staff/admin paths to `BACKEND_ORIGIN` (default `http://127.0.0.1:3001`). Workspace Server Components read the HttpOnly cookie with `next/headers`, call Express using the configured absolute backend origin, and redirect missing sessions to `/login` or wrong roles to `/forbidden`. Authorization must remain enforced by Express; client state and redirects are only UI behavior.

Next.js is version 16 with experimental cache/partial-prefetch features. Before changing framework behavior, read the relevant installed guide under `frontend/node_modules/next/dist/docs/` rather than relying on older Next.js conventions. Keep the generated Next.js blocks in `frontend/AGENTS.md`.

## Frontend design contract

Read `frontend/design.md` before any UI change. It is the source for Figma references, semantic tokens, role-specific theming, responsive behavior, accessibility constraints, and component boundaries. In particular:

- Use semantic tokens from `app/globals.css` rather than repeating hex values in JSX.
- Keep Admin brand overrides scoped to the Admin workspace; Customer/Staff use the shared blue brand.
- Preserve public access to `/`; do not invent authenticated customer data or backend-backed catalog/cart behavior.
- Reuse UI primitives only for common presentation/interaction. Feature validation, routing, and API calls stay in feature modules.

## Feature Implementation Workflow

Before implementing a requested feature, first classify the scope:

- **Small change:** a localized bug fix, copy/style adjustment, minor validation change, or another change whose behavior and implementation are already clear. Implement it directly and run the relevant tests; do not create process documents.
- **Larger feature:** work that introduces a new user flow, API/domain capability, data model, cross-layer behavior, significant architectural decision, or coordinated changes across multiple areas. Also use the larger-feature workflow whenever the user explicitly asks for a spec or plan.

For a larger feature:

1. Search `docs/specs/` and `docs/plan/` for an existing specification and implementation plan for the feature.
2. If both exist and still match the request and current codebase, implement and test from them immediately. Do not create duplicate documents.
3. If the specification is missing, create `docs/specs/<feature-name>.md`. Define the problem, scope, user-visible behavior, requirements, acceptance criteria, constraints, edge cases, and explicit non-goals. Resolve material ambiguities before treating the specification as ready.
4. If the implementation plan is missing, create `docs/plan/<feature-name>.md` from the specification. Identify the affected architecture and files, ordered implementation steps, migrations or compatibility concerns, and the verification strategy.
5. Implement the code in the plan's order, keeping the implementation, specification, and plan consistent when discoveries require scope changes.
6. Run the relevant focused tests during implementation, then the appropriate package-level test, lint, and build checks before declaring the feature complete.

Use stable, descriptive kebab-case names for matching spec and plan files. Keep these documents specific to the feature; do not create a spec or plan merely to document a trivial edit after the fact.
