# Admin backend implementation plan

Specification: `docs/specs/admin-backend.md`
UI it serves: `docs/specs/admin-workspace-ui.md` (complete on mock data in `frontend/features/admin/mock/`)

## How to use this plan

- Work through the phases in order. The phases depend on each other: categories feed products, products feed inventory, and inventory feeds reports.
- **Tick each item (`- [ ]` → `- [x]`) in this file as soon as it is implemented and its check passes.** Don't tick an item that is only partly done. If an item has to change, edit its text and tick it afterwards. Add a short note when the implementation differs from the plan.
- Every screen ends with a **🛑 Commit checkpoint**. Implementation stops there until the user commits manually. Never commit, stage, or push for the user.
- Before stopping at a checkpoint, run that screen's checks:
  - its focused backend test (`npm --prefix backend test -- tests/admin-<screen>.test.js`)
  - `npm --prefix frontend test` and `npm --prefix frontend run lint`
  - a browser check logged in as Admin, at 1440 and 320 px, with no console errors, no page-level horizontal scroll, and the `?state=` previews
- Run the full `npm --prefix backend test` and `npm --prefix frontend run build` at every checkpoint that adds routes or models.
- Preserve each file's line endings. Some teammate files use CRLF.
- If a step needs a change in another area (Customer orders, checkout, Staff), stop and tell the user before editing it. Those steps are marked **(cross-team)**.

## Architecture

**Backend**

- `src/routers/admin.router.js` is mounted at `/api/v1/admin` and applies `readCookies`, `requireAuth`, and `requireRole("admin")` once. Mutations add `protectMutation`. `/admin/dashboard` and `/admin/inventory` move here from `workspace.router.js`.
- `src/controllers/admin/<domain>.controller.js`: HTTP and orchestration, one file per domain.
- `src/validators/admin/<domain>.validator.js`: Zod schemas, plus a shared `list-query.js` for `page`/`pageSize`/`q`.
- `src/common/audit.js`: `recordAudit(request, { action, target, before, after, result })`.
- `src/common/search.js`: accent-insensitive regex built from user input.
- `src/common/admin-notify.js`: `notifyAdmins()`. Failures are logged, never thrown.
- New models: `MasterData`, `StockMovement`, `AdminNotification`, `Policy`. Changed models: `User`, `Category`, `Product`, `Order`, `Setting`, `AuditLog`.
- `src/scripts/migrate-admin.js` (`npm run migrate:admin`) is an idempotent migration of existing documents. `src/scripts/seed-admin.js` (`npm run seed:admin`, development and test only) adds Admin sample data on top of the existing seed. Neither one creates users.
- Tests: `tests/helpers/admin-app.js` builds the app with mocked Firebase and a mocked session for any role. Each domain gets `tests/admin-<domain>.test.js`.

**Frontend**

- `lib/api-client.ts`: the shared browser API instance that CLAUDE.md requires. It sends relative `/api/v1/...` requests, fetches and attaches the CSRF token on mutations, parses the `{ success, data | error }` envelope, and throws `ApiError { status, code, message }`.
- `lib/server-api.ts`: for Server Components. It forwards the session cookie to `BACKEND_ORIGIN` and maps 404 to `notFound()`, 401 to `/login`, and 403 to `/forbidden`.
- `features/admin/services/<domain>.ts`: one function per endpoint, API calls only.
- `features/admin/hooks/use-<screen>.ts`: state, loading and error, validation, and submit. The generic `use-admin-list.ts` handles filters, paging, and the `?state=` override.
- `features/admin/types.ts`: API data types. View components keep their props, so markup changes stay small.
- List screens fetch in client hooks. Detail and edit pages load on the server through `lib/server-api.ts`, inside the existing Suspense child, so `notFound()` keeps working.

---

## 0. Foundation

### Backend
- [x] Add `tests/helpers/admin-app.js`: `createApp(parseEnvironment({ NODE_ENV: "test" }))`, a mocked `getFirebaseAuth` (`verifySessionCookie`, `revokeRefreshTokens`, `getUser`), a configurable session role, and a `send(method, path, body)` that attaches the cookie, Origin, and CSRF pair
  - Note: `createAdminTestApp()` returns `{ app, auth, session, user, send }`. Set `session.role` to `null` for a guest. `send(..., { csrf: false })` omits the CSRF pair, and bodiless mutations send `{}`.
- [x] Create `src/routers/admin.router.js` with the shared middleware, and mount it in `app.js` before `workspaceRouter`. Move `GET /admin/dashboard` and `GET /admin/inventory` into it, keeping their responses.
  - Note: the middleware is applied with `router.use`, so any unknown `/api/v1/admin/*` path also needs an Admin session (a guest gets 401, not 404).
- [x] Add `src/validators/admin/list-query.js` (`page` ≥ 1, `pageSize` 1–100 with default 6, `q` trimmed to ≤ 100 characters) and a `paginate(model, filter, query)` / `pageDto()` helper
  - Note: `listQueryShape` is spread into domain schemas, and `parseQuery(schema, query)` throws 400 `VALIDATION_ERROR`. `paginate`/`pageDto` live in `src/common/pagination.js` and return `{ items, pagination: { page, pageSize, total, totalPages } }`, the shape the inventory list already uses.
- [x] Add `src/common/search.js`: `accentInsensitiveRegex(q)` escapes input and maps each Vietnamese base letter to its accented class, so "duc" matches "Đức". Unit tests mirror the frontend `matchesQuery` cases.
  - Note: like `matchesQuery`, the query is split into words. `accentInsensitiveRegex(token)` handles one word (digits also match across spaces), and `searchFilter(q, fields)` builds `{ $and: [{ $or: fields }] }` with one entry per word. Tests are in `tests/admin-foundation.test.js`.
- [x] `AuditLog`: add optional `ip`, `result` (`success`|`denied`, default `success`), and `summary` (short Vietnamese text). Add an index `{ at: -1 }`.
- [x] Add `src/common/audit.js` `recordAudit()`. It reads the actor from `request.user` and the IP from `request.ip`, strips secrets, and never throws into the caller's response (failures are logged).
- [x] `requireRole`: when the path starts with `/api/v1/admin` and the session is a non-admin user, record a `denied` audit entry before responding 403
  - Note: the entry is `action: "admin.access"`, target `{ collectionName: "routes", id: "<METHOD> <path>" }`. `requireRole` is now async. Express 5 forwards its rejection to the error handler.
- [x] Add the `AdminNotification` model, register it in `models/index.js`, and update the model list test and `models/README.md`
  - Note: `tests/seed.test.js` excludes `AdminNotification` from the models the base seed must cover, because its sample data belongs to `seed:admin` (phase 10).
- [x] Add `src/common/admin-notify.js` `notifyAdmins({ type, title, detail, targetHref, reference })`
- [x] Add `scripts/migrate-admin.js` and `scripts/seed-admin.js` skeletons, plus `migrate:admin` and `seed:admin` npm scripts. Both refuse to run when `NODE_ENV=production` (the seed only) or when MongoDB is unreachable.
  - Note: later phases append `{ name, run }` steps to `migrations` / `seedSteps`. Each `run()` resolves to the number of documents changed or ensured. Tests are in `tests/admin-scripts.test.js`.
- [x] Add `tests/admin-access.test.js`: it walks `admin.router.js`'s registered routes and asserts guest 401, Customer 403, and Staff 403 for every one, plus 403 without CSRF for every mutation. Every later phase extends it automatically.
  - Note: it also asserts the `denied` audit entry for each refusal. The CSRF case has no routes yet, because phase 0 adds no mutation.
- [x] `npm --prefix backend test` is green (20 files, 240 tests)

### Frontend
- [x] Move `features/workspace/components/*` to `components/workspace/` (shared by Staff and Admin, per the "features must not import each other" rule). Update the imports in `features/staff` and `features/admin`, with no visual change.
  - Note: `components/workspace/workspace-dashboard.tsx` is imported nowhere and itself imports from `features/auth`. It was moved as-is. Delete it or move it back to a feature when its owner confirms.
- [x] Add `lib/api-client.ts` (`apiGet`, `apiSend`, `ApiError`), reusing the CSRF flow from `features/auth/api.ts`, plus tests in `tests/api-client.test.mjs` (envelope parsing, CSRF header on mutations, error mapping)
  - Note: `ApiError.fields` carries per-field messages when the server sends `error.fields`, so later forms can map server errors onto fields. A caller's `AbortError` is rethrown unchanged.
- [x] Add `lib/server-api.ts` (`serverGet` with cookie forwarding and the 404/401/403 mapping)
  - Note: `PROFILE_INCOMPLETE` and `ACCOUNT_LOCKED` also redirect to `/login`.
- [x] Add `features/admin/types.ts` (`Page<T>`, `ListCounts`) and `features/admin/hooks/use-admin-list.ts`. It handles filters, applying filters, page, reload, `loading`/`error`/`empty`, and lets `useListState()` force a state for review.
  - Note: `useAdminList(load, initial)` takes a module-level service function `(query, signal) => Promise<Page>`. Loading is derived from the request key (no `setState` inside the effect body, per the React lint rule), and the previous page stays visible while the next one loads. The hook has no unit test, because the frontend runner cannot render hooks. Phase 1a exercises it in the browser.
- [x] Add `lib/format.ts` (`formatVnd`, `formatDate`, `formatDateTime` in Asia/Ho_Chi_Minh), replacing the copies in the mocks as each screen is wired
  - Note: tested in `tests/format.test.mjs`. The mock copies are replaced screen by screen.
- [x] `npm --prefix frontend test`, lint, and build are green, and the Staff and Admin screens are unchanged in the browser
  - Note: 98 tests pass and the build passes. Lint reports one error, in `features/catalog/components/product-discovery.tsx` (`setIsLoading` inside an effect). That file arrived with the `dev` merge and phase 0 does not touch it. Every file changed in this phase lints clean. In the browser check, all 18 Admin routes and the `?state=` previews render at 1440 and 320 px with no horizontal scroll, `/staff/*` still redirects Admin to `/forbidden`, and the only console errors are the expected 401 before login and 403 probes. The Staff screens were not opened (no Staff test account), so they are covered by the build and tests only.
- [x] **🛑 Commit checkpoint: Admin API foundation** (`00d2b45`)

## 1. Users

### 1a. User list: `/admin/users`
- [x] `User`: add `status` (`active`|`locked`, default `active`), `lockedAt`, `lockedBy`, `lockReason`, and `adminNote` (≤ 1000 characters). Index `{ role: 1, status: 1, createdAt: -1 }`. Queries treat a missing `status` as active (`{ status: { $ne: "locked" } }`).
  - Note: `lockReason` is also capped at 200 characters, matching the lock rule in 1b.
- [x] Migration: set `status: "active"` where it is missing
  - Note: the `users.status` step passes `timestamps: false`, so `updatedAt` stays usable for the conflict check in 1c. It has not been run on the shared database. The list works without it.
- [x] `validators/admin/user.validator.js`: list query (`tab`, `role`, `status`, `q`)
  - Note: `tab` and `role` accept `all`, `customer`, and `staff`, so `role=admin` is a 400.
- [x] `controllers/admin/user.controller.js` `listUsers`: Customer and Staff only, search by name, email, phone, or derived code. Returns rows `{ id, code, role, fullName, email, phone, joinedAt, status }` and `counts { all, customer, staff }`.
  - Note: `counts` ignores the filters, as the tabs did on mock data. The code is not stored, so `searchFilter(q, fields, computed)` gained a `computed` argument that matches aggregation expressions through `$expr`.
- [x] Tests: Admin accounts are excluded, tab counts, filters, accent-insensitive search, paging, and the derived code format
  - Note: `tests/admin-users.test.js` runs the filter on an in-memory stand-in, like the rest of the suite. The same queries and the migration (second run changes nothing, `updatedAt` kept) also passed once on a throwaway `mongod` 8.0, from a script that is not in the repo.
- [x] Frontend: `services/users.ts` `listUsers`, a `useUsersList` hook, and `users-list.tsx` on the hook. Real loading, error ("Thử lại"), and empty states, with `?state=` still working.
  - Note: changes beyond the item:
    - `useAdminList.reload` also drops a forced `?state=`.
    - `useAdminList` shows the loading state, not a blank table, when a load follows an empty result.
    - `apiGet` keeps its 15 s timeout when the caller passes a signal. It used to drop it, so a hung backend would have loaded forever.
    - `lib/format.ts` gained `formatPhone`, to match the designed `0912 345 678`.
  - **Until 1b, "Chi tiết" on a real row returns 404**, because rows link to the Mongo `_id` while `/admin/users/[id]` still reads the mock.
- [x] Browser check
  - Note: logged in as Admin at 1440 and 320 px: no page-level horizontal scroll, and the only console errors are the expected 401 before login and the 500 the check forces on purpose. The shared database has one non-Admin account, so paging, locked rows, and Staff rows were checked on a stubbed 13-row response. Real data covered the list, search (including the derived code), filters, and states.
  - Note: sign-in can fail here with 503 `AUTH_CLOCK_SKEW`. This machine's clock is about 2 s behind Google's, and the check in `auth.controller.js` allows no skew. The browser script holds `POST /auth/session` for 4 s to get past it. The auth code is unchanged.
- [x] **🛑 Commit checkpoint: User list**

### 1b. User detail and lock: `/admin/users/[id]`
- [x] `requireAuth`: a `locked` user gets 403 `ACCOUNT_LOCKED` with "Tài khoản đang bị khóa." (MSG07). The session exchange (`POST /auth/session`) refuses locked users before setting the cookie.
  - Note: the check is in `sendSession`, so `POST /auth/register` refuses too. `requireAuth` also clears the cookie on `ACCOUNT_LOCKED`. In practice a locked user's old session gets 401, because its tokens are revoked first; the 403 covers a session created while the lock was being written. `AuthProvider` treats `ACCOUNT_LOCKED` as a guest, and `requireDashboardUser` redirects it to `/login`.
- [x] `getUser`: profile, default address, completed-order count and total spent (paid and completed), last sign-in from Firebase `getUser().metadata.lastSignInTime` (`null` on failure), and the 10 newest activity items merged from the user's orders and the audit entries that target the user. 404 for an unknown or Admin id.
  - Note: a Staff account's figures and orders are the sales it created (`createdByStaffId`). Legacy `delivered` orders, which exist in the data but not in the Order enum, count as completed, matching `salesMatch`.
- [x] `POST /users/:id/lock` (reason required, 3–200 characters) and `POST /users/:id/unlock`. They refuse the caller's own account and Admin accounts, use a conditional update on the current status (409 `ALREADY_LOCKED`/`NOT_LOCKED`), call `revokeRefreshTokens(firebaseUid)`, and write an audit entry.
  - Note: refusals are 403 `CANNOT_CHANGE_SELF` and `CANNOT_CHANGE_ADMIN`. `auth/user-not-found` from revocation is not a failure, so an account deleted from Firebase can still be locked (spec edge case).
- [x] Tests: lock blocks an existing session and the next sign-in, unlock restores access, self and Admin are refused, a revocation failure returns 503 without leaving the status half-changed (status is written after revoke succeeds), and the audit entry is written
  - Note: `tests/admin-user-detail.test.js`, on an in-memory stand-in for the conditional updates. It has not run against a throwaway `mongod`, but the browser check below used the real local database.
- [x] Frontend: the detail page loads through `lib/server-api.ts` (`notFound()` on 404). The lock button opens a confirmation with a reason field (CR-12), calls the service, and updates the badge from the response. The login form shows the `ACCOUNT_LOCKED` message.
  - Note: the load is in `services/users.server.ts`, because `services/users.ts` also runs in the browser. Unlock also asks for confirmation, without a reason. After either action the page refreshes so the activity table shows the new audit entry, and a 409 shows the server's message and the true status. The footer says "N hoạt động gần nhất" instead of pagination, because the API returns only the newest 10.
  - **Until 1c, "Chỉnh sửa" on a real user returns 404**, because `/admin/users/[id]/edit` still reads the mock.
- [x] Browser check: lock, then sign in as that account in a second browser context and confirm it is refused, then unlock
  - Note: logged in as Admin at 1440 and 320 px: no page-level horizontal scroll, and the only console errors are the expected 401, 403, and 409. The target was a throwaway customer registered through `/register`, so no real account was locked. Its Firebase account and MongoDB profile were deleted afterwards. Its 2 audit entries remain in the local database, because the audit log is append-only. Order rows were checked read-only on the existing customer; the Staff view, an address, and paging past 10 rows were not checked in the browser because the data has none.
- [x] **🛑 Commit checkpoint: User detail + lock**

### 1c. Edit user: `/admin/users/[id]/edit`
- [x] `PATCH /users/:id`: `fullName` (2–100), `phone` (VN format, same rule as account validation), `role` (`customer`|`staff`), `status`, and `adminNote`. Email is rejected if sent. The role change uses `updateOne` with `overwriteImmutable: true` and revokes sessions. Returns the updated detail and writes before/after to the audit log.
  - Note: changes beyond the item:
    - The body requires `expectedUpdatedAt`, and the detail response now includes `updatedAt`. A mismatch is 409 `STALE_USER`.
    - Setting `status: "locked"` requires `lockReason`, the same rule as the lock endpoint, and a status change revokes sessions too.
    - A no-op returns 200 with `changed: false` and writes nothing.
    - The shared `error.middleware.js` drops `fields`, so the controller sends this 400 itself. That keeps the change out of a file every role uses. If several Admin screens need it, teach the middleware to pass `AppError.fields` through, after checking with the team.
- [x] Tests: role change customer ↔ staff, to or from `admin` refused (400), no-op detection ("Không có thay đổi nào để lưu."), validation messages per field, and a 409 when the user was changed concurrently (compare `updatedAt`)
  - Note: `tests/admin-user-edit.test.js`. A change from `admin` cannot be requested, because editing an Admin account is refused with 403 `CANNOT_CHANGE_ADMIN` before the role is read.
- [x] Frontend: move `validateUser` from `features/admin/validation.ts` into `hooks/use-user-edit.ts`. Server field errors map onto the form. Email and the default address are read-only. "Gửi đặt lại mật khẩu" keeps its demo notice (email sending is a non-goal).
  - Note: `validateUser` stays in `validation.ts`, because the frontend runner cannot import a hook that uses `next/navigation`, and the rule needs a unit test. The hook owns the state and calls it. The phone rule now accepts `+84`, matching the server, so a stored `+84` number is not reported as invalid. Choosing "Đã khóa" reveals a required reason field. The list's filter ids became `users-filter-role` and `users-filter-status`, because Next keeps the previous route mounted and the duplicate ids could send the edit form's labels to the hidden filters.
- [x] Browser check: validation errors and focus, save, role change visible in the list, Hủy
  - Note: 1440 and 320 px on a throwaway customer, against the real local database, so `overwriteImmutable` is proven there: after customer → staff, the old session is refused, the list shows Staff, and the next sign-in has the new role. A stale tab shows the 409 and reloads the newest values. The only console errors are the expected 401 and 409. The throwaway's Firebase account and profile were deleted; its audit entries remain.
- [x] **🛑 Commit checkpoint: Edit user**

### 1d. Roles & permissions: `/admin/users/roles`
- [x] `GET /permissions`: the 9-row matrix from a constant in `common/permissions.js`, documented as mirroring the `requireRole` usage, plus the per-role account counts
  - Note: the matrix differs from the mock, because the spec says it follows the real rules. "Mua hàng và xem đơn của mình" is Customer only: `/orders/my-orders` is `requireRole("customer")`, and roles do not inherit. Rows for Admin screens not built yet (orders, cancellations, reports) already show Admin as allowed, because that is the planned access.
- [x] Test: the matrix's Staff rows agree with the routes guarded by `requireRole("staff")`
  - Note: `tests/admin-permissions.test.js` walks `workspace.router.js`. A new `/staff/*` route fails the test until a row lists it, so whoever adds one will see it. Every listed route is also requested as Customer and Admin and must return 403.
- [x] Frontend: render the matrix read-only. Replace "Lưu phân quyền" with an `InfoCallout` explaining that permissions are fixed by the system for this release. Delete `mock/permissions.ts` and `mock/users.ts`.
  - Note: the tests of those mocks left `tests/admin-mock.test.mjs`, and the check that report Staff names exist as mock users went with them. **Until phases 8 and 11c, the mock links `/admin/users/KH0004` on the dashboard and `/admin/users/KH…` in the audit log return 404**, because real users are addressed by id.
- [x] Browser check
  - Note: 1440 and 320 px: 9 rows, nothing editable, counts match the API, no page-level horizontal scroll. The only console error is the expected 401 before login.
- [x] **🛑 Commit checkpoint: Roles & permissions**

## 2. Categories

### 2a. Category tree: `/admin/categories`
- [x] `Category`: add `code` (unique, `DM###`), `parentId` (ref Category, default null), `description` (≤ 500), and `displayOrder` (integer ≥ 1). Index `{ parentId: 1, displayOrder: 1 }`.
  - Note: all optional, and `code` is `sparse`, so the teammates' seed and catalog keep working without them. Nothing else reads these fields, so the Customer catalog and Staff screens still list categories flat.
- [x] Migration: give existing categories codes `DM001…` in `createdAt` order and `displayOrder` by name. All stay roots.
  - Note: the `categories.tree` step passes `timestamps: false`. It has not been run on your local database; the browser check used a temporary copy.
- [x] `GET /categories`: the tree in display order with `productCount` aggregated (including children) and the `q`/`status` filters. A matching child keeps its parent, flagged `context: true`, mirroring the mock's `filterCategories`.
  - Note: `dev` gives a product several categories (`categoryIds`), and the agreed rule is to count it under each one, once per tree branch: a parent with the product in two children counts it once. Products that still have the older `categoryId` are counted too, because local databases hold both shapes. Rows carry `ref` (the code, or the id until the migration runs), which addresses them in URLs.
- [x] `DELETE /categories/:code`: 409 `CATEGORY_IN_USE` with the reason ("còn N sản phẩm liên kết" / "còn danh mục con"), otherwise delete and audit
- [x] Tests: tree order, counts including children, filter keeps the parent, both delete blockers, and a successful delete
  - Note: `tests/admin-categories.test.js`.
- [x] Seed: a sample child category under "Dành cho chó" and one under "Dành cho mèo", so the tree has two levels
  - Note: `dev`'s seed replaced those two categories with 42 flat ones. `seed-admin.js` instead nests the dry food and pate categories under the food category for each pet, without touching the shared `seed.js` or `categories.json`. It finds them by slug, because `seed.js` keeps the name of a category that already exists.
- [x] Frontend: `services/categories.ts`, a `useCategoryTree` hook, and `categories-list.tsx` on the hook. The delete icon asks for confirmation, then calls the API and shows the server's reason.
  - Note: the confirmation is a new shared `admin-confirm-dialog.tsx`, which `lock-user-dialog.tsx` now uses too, ready for product hide and cancellations.
- [x] Browser check
  - Note: run on a temporary copy of the local database with `npm run seed`, `migrate:admin`, and `seed:admin` applied, so old `categoryId` and new `categoryIds` products are both present. Your own database was not changed. 46 categories at 1440 and 320 px: tree order, search keeping the parent, empty state, Hủy, both delete refusals, a real delete, `?state=` previews, and no page-level horizontal scroll. The only console errors are the expected 401 and 409. The no-code fallback also rendered correctly on the unmigrated database. Run `npm --prefix backend run migrate:admin` on your database when you want codes to appear. Until 2b, the edit link still opens the mock.
- [x] **🛑 Commit checkpoint: Category tree**

### 2b. Edit category: `/admin/categories/[code]/edit`
- [x] `GET /categories/:code` and `PATCH /categories/:code`: `name` (unique), `slug` (unique, `^[a-z0-9]+(-[a-z0-9]+)*$`), `parentCode` (a root, not itself; refused when the category has children), `description`, `displayOrder`, and `isActive`. 409 `DUPLICATE_VALUE` (MSG32) on duplicates. Audited.
  - Note: `:code` and `parentCode` also accept the id of a category the migration has not reached. Added `expectedUpdatedAt` with 409 `STALE_CATEGORY`, as on the user form, so one Admin cannot silently overwrite another. The field-error helpers from 1c moved to `common/field-errors.js`. Changing a slug changes that category's public catalog links, because the catalog addresses categories by slug.
- [x] Tests: each validation rule, duplicate name and slug, parent rules, and deactivation
  - Note: `tests/admin-category-edit.test.js`.
- [ ] **(cross-team)** Ask the catalog owner to hide products of inactive categories on the public storefront ("category state controls catalog visibility", UC28). Note the outcome here.
- [x] Frontend: server load for the edit page, `hooks/use-category-edit.ts` (moving `validateCategory` into it), and server errors mapped to fields. The "+ Thêm danh mục" button stays a demo notice (no create design).
  - Note: `validateCategory` stays in `validation.ts` so it can be unit tested, as with `validateUser` in 1c. The list's filter ids became `category-filter-query` and `category-filter-status`, because they duplicated the form's ids while Next kept the list mounted. The delete button on this page now really deletes, after confirmation.
- [x] Browser check
  - Note: on the temporary database copy, at 1440 and 320 px: client and server errors with focus, a duplicate name on its field, saving a parent and status, a stale tab's 409, the parent lock, both delete outcomes, Hủy, and not-found. The only console errors are the expected 401 and 409.
- [x] **🛑 Commit checkpoint: Edit category**
  - Note: committed with the cross-team item above still open, because it needs the catalog owner.
  - Known issues from merging `origin/dev`, present on a clean checkout of `dev` too and left for their owners: `npm --prefix frontend run build` fails type checking (`account/profile/page.tsx` and a missing `cart-trust-banner` in `features/cart/index.tsx`), and two backend tests fail (`app.test.js`, because the rate limiter is commented out in `app.js`, and `order-status.test.js`). From here each checkpoint runs `tsc` and accepts only those 3 errors, in place of the build.

## 3. Master data: `/admin/master-data`

- [x] Add the `MasterData` model (`kind`, `code`, `name`, `description`, `petTypeCode`, `fee`, `isActive`), with a unique index `{ kind: 1, code: 1 }`, and register it
  - Note: one additive line each in the shared `models/index.js`, `tests/seed.test.js`, and `tests/models.test.js`, the same places `AdminNotification` uses.
- [x] Seed: the 5 pet types, the breeds, and the 6 units and 3 shipping methods from `mock/master-data.ts`. Brands come from the distinct `Product.brand` values, with the origins from the mock where a brand matches.
  - Note: a `masterData` step in `seed-admin.js`, insert-only, with its data in `scripts/data/admin-master-data.js`. **Your local database has no master data until `npm --prefix backend run seed:admin` runs**, so this screen shows its empty state until then. With `dev`'s seed there are 191 brands.
- [x] `GET /master-data?kind=&q=&status=&page=`: rows with the computed metric, plus counts per kind. `GET /master-data/options`: active pet types, brands, and units for the product form.
  - Note: the unit metric stays 0 until `Product.unit` exists (phase 4a).
- [x] Tests: counts per kind, computed metrics (breeds per pet, products per brand and unit), filters, and options exclude inactive rows
  - Note: `tests/admin-master-data.test.js`. `tests/seed.test.js` (`dev`'s test, which seeds 1,111 products) failed once in a full run, then passed 3 times alone and again in a full run. The cause was not captured.
- [x] Frontend: `services/master-data.ts`, a `useMasterData` hook, and `master-data-view.tsx` on the hook. The "Dữ liệu liên quan" cards use the counts. "+ Thêm …" and "Chi tiết" keep their notices.
- [x] Browser check
  - Note: on the temporary database copy, at 1440 and 320 px: every tab's metric, paging, filters, empty state, `?state=` previews, and no page-level horizontal scroll. A server-rendering error appeared once, caused by the dev server holding an old `status.ts`, and did not return after a restart. The only other console error is the expected 401.
- [x] **🛑 Commit checkpoint: Master data**

## 4. Products

### 4a. Product list: `/admin/products`
- [x] `Product`: add optional `unit`, `variants[].cost` (non-negative integer VND), and `variants[].lowStockThreshold`
  - Note: `cost` has `select: false`, because `catalog.controller.js` and `product.controller.js` return `variants` as stored and customers must not see it. Tried on real MongoDB: plain `find` hides it, `doc.save()` and positional updates keep it, and `.select("+variants.cost")` returns it. An explicit `.select("variants")`, `populate`, or an aggregation still includes it, so a future query of that kind must not return raw variants. The ones existing today map to specific fields.
- [x] `GET /products`: one row per variant via `$unwind`, with category name and path, brand, price, available stock, threshold (variant value or `Setting.lowStockThreshold`), and the derived status (hidden, else `available ≤ threshold` → "Sắp hết hàng", else "Đang bán"). Filters: `tab`, `q` (SKU, name, brand), `category` (including children), `status`. Counts: all, on sale, hidden.
  - Note: built in code instead of `$unwind`, so the threshold and status rules exist once in `product.helpers.js` and the detail screen can share them. It loads about 1,100 products per request, which is fine at this size; revisit if the catalog grows a lot. A row carries every category (`dev` allows several), `q` also matches the derived code, and products with the older `categoryId` are handled.
- [x] Tests: one row per variant, threshold fallback, status derivation at the boundary (`available == threshold` is low), category scope including children, and counts
  - Note: `tests/admin-products.test.js`.
- [x] Frontend: `services/products.ts`, a `useProductsList` hook, and `products-list.tsx` on the hook. Category options come from `GET /categories`. Change the UI's `<` to `≤` to match UC30, and update its test.
  - Note: the `≤` rule now lives on the server and is tested in `tests/admin-products.test.js`. The mock's `<` and its test go away with `mock/products.ts` in 4c. A row with several categories shows the first and "+N". The filter's ids became `product-filter-category` and `product-filter-status`, so they cannot collide with the edit form. **Until 4b, "Chi tiết" on a real row returns 404.**
- [x] Browser check
  - Note: on a temporary database copy with `dev`'s seed (1,390 variants), at 1440 and 320 px: counts, paging, parent category scope, status, search, empty state, `?state=` previews, and no page-level horizontal scroll. A cost was written on the temporary products, and five public catalog and product URLs returned no cost. A hydration warning appeared once in that run, and did not reproduce when each Admin route was loaded fresh. The run also passes through `/login` and the storefront from `dev`, so it most likely comes from there, but this is unconfirmed.
- [x] **🛑 Commit checkpoint: Product list**

### 4b. Product detail: `/admin/products/[sku]`
- [x] `GET /products/:sku`: product and variant fields, category path, images, the last update (from the audit log: actor name and time), and a history tab built from the audit entries plus `StockMovement` rows for the SKU. 404 for an unknown SKU.
  - Note: the history has audit entries only here, because `StockMovement` arrives in 4c, which adds its rows. **Staff edits do not appear in it**, because `updateStaffProduct` writes no audit entry (cross-team follow-up for the Staff owner).
- [x] `POST /products/:sku/hide` and `/show`: toggle `Product.isActive`, conditional and audited
  - Note: a repeat returns 409 `ALREADY_HIDDEN` or `ALREADY_VISIBLE`. Visibility is product-level, so it applies to all of a product's variants.
- [x] Tests: the detail shape, unknown SKU, the hide/show toggle and audit, and that a hidden product disappears from `GET /api/v1/products` (public)
  - Note: `tests/admin-product-detail.test.js`.
- [x] Frontend: server load and the hide/show button on the API (with confirmation for hide)
  - Note: fields the mock invented and the data does not have (weight, description title, ingredients) are gone; "Phân loại" shows the variant label. Pet type shows Chó, Mèo, or Tất cả for the stored `dog`, `cat`, and `all`. Until 4c, "Chỉnh sửa" on a real product returns 404.
- [x] Browser check
  - Note: on the temporary database, at 1440 and 320 px: the real cost through `select: false`, tabs, hide with Hủy and confirm, a stale tab's 409, show, the audit history, not-found, and no page-level horizontal scroll. A guest's public catalog returned 404 while hidden and 200 after showing. The automated image check ran before the external image finished loading; the screenshot shows real images loaded. The only console errors are the expected 401 and 409.
- [x] **🛑 Commit checkpoint: Product detail**

### 4c. Edit product: `/admin/products/[sku]/edit`
- [x] Add the `StockMovement` model and register it. The model list test now really includes it, replacing the reverted phantom entry.
  - Note: one additive line each in the shared `models/index.js`, `tests/seed.test.js`, and `tests/models.test.js`. The product history tab from 4b now includes movements.
- [x] `PATCH /products/:sku`: product fields (`name`, `brand`, `petType`, `categoryCode` (leaf or root without children), `description`, `unit`, `isActive`) and variant fields (`price`, `cost`, `stock`, `lowStockThreshold`). A stock change requires `expectedStock` and writes conditionally (`variants.stock: expectedStock`, 409 `STALE_STOCK`). It never goes below `reservedStock` and records an `adjust` movement. A SKU rename is refused when orders reference the old SKU. Audited, with a low-stock notification when the new stock is at or below the threshold.
  - Note: differences from the item, each agreed or forced by the merged code:
    - `categoryCodes` is a list and writes `categoryIds`, because `dev` allows several categories and you chose "show all, edit all". Any existing category may be chosen, because `dev`'s data links products to both parents and children.
    - `petType` stays `dog`, `cat`, or `all`, as you chose, because the Customer catalog filters on those values.
    - A rename is also refused while a cart holds the SKU (409 `SKU_IN_USE`), because carts store it too. A duplicate SKU is 409 `DUPLICATE_VALUE`.
    - Only the changed fields are sent, and a SKU is checked only when it changes, because 162 of `dev`'s 1,379 SKUs contain `--` and break the rule. Those products can still be edited.
    - No conditional write on non-stock fields, because orders update `updatedAt` constantly and would cause false conflicts on a price edit.
    - **No notification call:** Quang's `049abff` removed `notifyAdmins()` and `AdminNotification`, and his notifications are computed live from product stock, so low stock appears without one. His screen reads only the global threshold, so it does not yet honor `lowStockThreshold` on a variant.
- [x] `DELETE /products/:sku`: 409 `PRODUCT_HAS_ORDERS` when `Order.exists({ "items.productId" })`. Otherwise delete the product and audit.
  - Note: it deletes the whole product with all of its variants, because orders reference the product. Customer cart and wishlist code already skip a missing product.
- [x] Tests: field validation, stale stock, stock below reserved, the movement recorded, both delete outcomes, and the notification created
  - Note: `tests/admin-product-edit.test.js`, without the notification case, for the reason above.
- [x] Frontend: `hooks/use-product-edit.ts` (moving `validateProduct`/`parseAmount` into it). Pet type and unit options come from `GET /master-data/options`. Server errors map to fields. "Tải ảnh lên" stays a demo (no uploads).
  - Note: `validateProduct` and `parseAmount` stay in `validation.ts` so they can be unit tested, as in 1c and 2b. Brand and unit options come from master data, and a current value that is not in the list stays selectable, so the form works before `seed:admin` runs. Pet type is a fixed Chó, Mèo, or Tất cả, saving `dog`, `cat`, or `all`. The designed single category select became a checkbox list with a "Đã chọn" summary, because a product can have several (`frontend/design.md` is updated in phase 12). The SKU field is locked when the product has orders, and the delete button really deletes, after confirmation.
- [x] Delete `mock/products.ts` and `mock/categories.ts` once no screen imports them
  - Note: `mock/master-data.ts` went too, because only the product form still used it. Their tests left `tests/admin-mock.test.mjs`; the form validators keep theirs.
- [x] Browser check
  - Note: on the temporary database, at 1440 and 320 px: every field saved on real MongoDB, a cleared cost, a stock movement and audit entry in the history, the new price in the Customer catalog, a stale tab's 409, a SKU rename moving the URL, delete, and not-found. On a product with orders (`RC-C02`): SKU locked, rename refused by the server (409 `SKU_IN_USE`), delete refused. On reserved stock (`WH-T01`, 6 of 95): below reserved refused, with the message on the field. The only console errors are the expected 401, 400, and 409.
- [x] **🛑 Commit checkpoint: Edit product**

## 5. Orders: `/admin/orders`

- [x] `GET /orders`: all channels, `creationState` not `pending`. Tabs: all, processing (pending, confirmed, processing), shipping, completed, cancelled. `q` matches the order code (a leading `#` is ignored), customer or guest name, and phone, reusing `buildOrderSearchFilter`. Rows `{ orderCode, customerName, phone, createdAt, total, paymentMethod, status }`, where processing shows "Đang đóng gói".
  - Note: `buildOrderSearchFilter` only reads names on the order, so `q` also matches registered accounts by name and phone. A name comes from the guest, then the recipient, then the account, then "Khách lẻ", and the literal text `"null"` that checkout stores for an empty address field counts as missing. Legacy `delivered` orders count as completed. `counts` holds each tab and ignores the filters.
- [x] Tests: tab grouping covers every status, search by code with `#`, guest and customer names, and that pending staff sales are hidden
  - Note: `tests/admin-orders.test.js`. It caught a real bug: text with no searchable word, such as `(`, made an empty account filter that matched every account.
- [x] Frontend: `services/orders.ts`, a `useOrdersList` hook, and `orders-view.tsx` on the hook. `?q=` still pre-fills the search. Delete `mock/orders.ts`, which also removes the cross-feature import of `features/staff/mock-data.ts`.
  - Note: search waits for a 300 ms pause while typing, because each change now calls the server. A new `?q=` link replaces the search even though Next keeps the route mounted. The status filter's "Chờ xử lý" covers pending and confirmed, matching the badge. The mock's fixed reporting period line is gone, because the list is no longer limited to a period. Tabs now show counts. Other mocks stay until their phases.
- [x] Browser check, including the dashboard and user-activity links that open `?q=`
  - Note: read-only on the local database (9 orders), at 1440 and 320 px: tabs add up to the total, paging, `#code` and accent-free search, one request for 42 typed keys, status filter, empty state, `?state=` previews, and no page-level horizontal scroll. A real user-activity link opened that order, and a second link replaced the search. Dashboard links still carry mock codes until phase 8, so they open the list with an empty result. The only console error is the expected 401.
- [x] **🛑 Commit checkpoint: Orders**

## 6. Cancellation requests: `/admin/cancellations`

> **Dropped on 2026-11-11.** The user and their teammate decided that Staff handle cancellation requests, so Admin has no cancellations screen. The mock screen, its route, its sidebar entry, and `mock/cancellations.ts` were removed, and the bullets below will not be done.

> **Voucher note:** approving a cancellation must also call `releaseVoucher(orderId)` from `common/voucher-redemption.js`, or the order's voucher use is never returned. See `docs/plan/voucher-system.md`.

- [ ] `Order`: add the `cancellationRequest` subdocument (see the spec) and an index `{ "cancellationRequest.status": 1, "cancellationRequest.requestedAt": -1 }`
- [ ] `GET /cancellations`: tabs (pending, approved, rejected), `q` (order code, customer), and status. Rows `{ orderCode, customer, requesterRole, reason, value, requestedAt, status, note }`.
- [ ] `POST /cancellations/:orderCode/approve`: a conditional update on `cancellationRequest.status: "pending"`, then the order is set to `cancelled` with `statusHistory`, the order's stock is given back (release reserved or add back deducted), `StockMovement` rows are recorded (source `cancellation`), and the action is audited. A paid order gets `refundStatus: "pending"` for follow-up. 409 `ALREADY_DECIDED` on a repeat.
- [ ] `POST /cancellations/:orderCode/reject`: note required (3–500), order status unchanged, audited
- [ ] Tests: stock restored exactly once under a double approve, reject leaves stock and status alone, an already-shipped order cannot be approved (409), and the audit entries
- [ ] **(cross-team)** Agree with the Customer orders owner that `PATCH /api/v1/orders/:id/cancel` cancels immediately while the order is `pending`, and otherwise opens a `cancellationRequest` plus an Admin notification. The same change should add the missing ownership check and `protectMutation` (the security gap reported on 28/10/2026). Record who implements it here before continuing.
- [ ] Seed: 3 pending, 1 approved, and 1 rejected request on the sample orders
- [ ] Frontend: `services/cancellations.ts`, a `useCancellations` hook, and `cancellations-view.tsx` on the hook. Approve and reject open a confirmation (reject with a note field). The row moves tabs after the server responds. Delete `mock/cancellations.ts`.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Cancellation requests**

## 7. Inventory: `/admin/inventory`

- [ ] Refactor `inventory.controller.js` into `controllers/admin/inventory.controller.js` with a Zod `validators/admin/inventory.validator.js` (replacing the hand-written parser). Add category name, unit, and per-variant threshold. Keep `tests/inventory.test.js` passing, then rename it to `admin-inventory.test.js`.
- [ ] `GET /inventory/movements`: history rows `{ sku, productName, type, quantity, at, actorName, note, source }` with `q`, `type`, and paging
- [ ] `POST /inventory/receipts`: note plus 1–50 unique `{ sku, quantity }` lines. Every SKU is validated first, then each line gets `$inc` and an `in` movement sharing the receipt code. A partial failure returns 207-style details of the applied lines. Audited, with low-stock notifications cleared or created as needed.
- [ ] Tests: receipt validation (duplicates, unknown SKU, quantity ≤ 0), movements recorded, the history filter, and the low-stock status updating after a receipt
- [ ] **(cross-team)** Ask the Staff sale and checkout owners to record `out` movements when they deduct stock, so the history tab is complete. Until then the history shows Admin receipts, adjustments, and cancellations only, and the tab says so.
- [ ] Frontend: move `inventory-view.tsx`'s inline `fetch` into `services/inventory.ts` and `hooks/use-inventory.ts` (CLAUDE.md rule). The "Lịch sử nhập xuất" tab lists movements. "+ Tạo phiếu nhập" opens a receipt form (SKU lookup, quantity, note) with validation. Delete `mock/inventory.ts`.
- [ ] Browser check: create a receipt, see it in the history and in the product's stock
- [ ] **🛑 Commit checkpoint: Inventory**

## 8. Dashboard: `/admin/dashboard`

- [x] `validators/admin/period.validator.js`: `from`/`to` (ISO dates, `from` ≤ `to`, at most 366 days), default the current month to date in Asia/Ho_Chi_Minh, and presets `this-month`, `last-month`, `this-quarter`
- [x] `GET /overview`: net revenue (reusing `salesMatch`), growth against the previous equal-length period, orders in the period, new customers, the low-stock count, the cumulative daily revenue series, the top 3 stock alerts, and recent activity (the newest audit entries, orders, and sign-ups, as `{ time, title, detail, value, status, href }`). Each metric is computed independently and becomes `null` on failure (UC40 2a).
  - Note: net revenue follows the finance report so the two screens agree: `completed` paid orders minus `cancelled` paid orders, summing `total`. It narrows `salesMatch`, which alone would add legacy `delivered` orders and leave out refunds. Low stock follows the Admin product list's rule (own or global threshold, hidden products excluded), so it can differ from `/admin/inventory` until phase 7 adds per-variant thresholds there. Recent activity shows up to 6 rows, the newest 2 of each type with spare rows going to the newest of the rest, because a plain newest-first list was filled by a single type (the user's choice, 2026-11-03). The cumulative daily series was removed afterwards, along with the dashboard's chart, because it duplicated the finance report (agreed with Quang, 2026-11-03); the revenue, orders, and low-stock cards link to the matching report for the same period instead.
- [x] Tests: revenue includes only paid and completed orders, the series ends at the net revenue, growth with a zero previous period is shown as "—", and one failing metric doesn't fail the response
- [x] Frontend: `services/overview.ts`, and the dashboard on server-loaded data with a preset period select in place of the fixed chip. `null` metrics show "Không có dữ liệu". Delete `mock/overview.ts`.
  - Note: the service is `services/overview.server.ts`, matching the other server-loaded screens. The period is in the URL as `?period=`, and an unknown value falls back to this month. The dashboard has no `?state=` previews, because it is server-loaded rather than a list screen.
- [x] Browser check
  - Note: read-only on the local database, at 1440 and 320 px. All three presets work; October's net revenue is 1.740.000 ₫ on both the dashboard and the finance API; the low-stock count equals the product list's; there is no page-level horizontal scroll, and the only console errors are the expected 401s on `/login`. Failed metrics, empty results, and order and sign-up rows were checked through a temporary proxy that changed the `/overview` response, because the local data doesn't produce them. `next build` is blocked by type errors that are also on `HEAD` (`account/profile/page.tsx`, `features/cart/index.tsx`), so `tsc` was used to confirm the dashboard has none.
- [x] **🛑 Commit checkpoint: Dashboard**

## 9. Reports

### 9a. Financial report: `/admin/reports/finance`
- [ ] `GET /reports/finance?from&to`: gross revenue and order count, refunds (approved cancellations of paid orders: amount and count), net revenue, pending reconciliation (online payments `pending`: amount and count), the daily net series, and per-channel rows for COD, ONLINE, and CASH with income, refund, transactions, net, and "Đã đối soát" / "Chờ đối soát". No profit.
- [ ] Tests: the channel totals add up to the KPIs, unpaid or non-completed orders are excluded, and an empty period gives zeros
- [ ] Frontend: service and hook, the channel names updated to the real methods ("Thanh toán online (VNPay/QR)", "Thanh toán khi nhận hàng", "Tiền mặt tại quầy"), and the period select. "Xuất Excel" stays a demo.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Financial report**

### 9b. Sales report: `/admin/reports/sales`
- [ ] `GET /reports/sales?from&to&groupBy=product|category|staff|time&page`: KPIs (quantity sold, orders, average order value), the daily quantity series, and grouped rows. Staff rows come from offline orders by `createdByStaffId` with the staff name. Reuse the Staff analytics pipelines where they fit.
- [ ] Tests: each grouping's totals equal the KPI totals, and category grouping rolls children up to the tree names
- [ ] Frontend: service and hook. The tabs switch `groupBy` on the server.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Sales report**

### 9c. Inventory report: `/admin/reports/inventory`
- [ ] `GET /reports/inventory?from&to&q&category&page`: per-SKU opening, in, out, closing, threshold, and warning, using the formula in the spec. KPIs: closing total, SKU count, in total and receipt count, out total and order count, and the low-stock count.
- [ ] Tests: `closing = opening + in − out` for every row (property-style over random movements and orders), movements after the period are excluded correctly, and the KPI totals equal the row sums
- [ ] Frontend: service and hook. Delete `mock/reports.ts`.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Inventory report**

## 10. Notifications: `/admin/notifications`

- [ ] `GET /notifications?tab=unread|all|saved&type&q&page`: rows with `read` and `saved` computed for the current Admin, plus `unreadCount`
- [ ] `POST /notifications/:id/read`, `POST /notifications/read-all`, and `POST /notifications/:id/save` (toggle), using `$addToSet`/`$pull` on the current Admin's id
- [ ] Tests: read and saved state are per Admin, the tab filters, `unreadCount`, and that a notification failure in `notifyAdmins` does not fail the triggering request (checked from a receipt test)
- [ ] Seed: a few order, stock, and system notifications
- [ ] Frontend: `services/notifications.ts`, a `useNotifications` hook, and `notifications-view.tsx` on the hook. Add an unread badge on the top-bar "Thông báo" link (small server fetch in the shell). Delete `mock/notifications.ts`.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Notifications**

## 11. System

### 11a. Store configuration: `/admin/system/settings`
- [ ] `Setting`: add the store fields from the spec with defaults equal to `defaultStoreSettings` in `mock/system.ts`
- [ ] `GET /settings` and `PUT /settings`: full validation (store name 2–100, email, hotline, address, `freeShippingThreshold` as a non-negative integer, booleans, and at least one payment method on). Requires `expectedUpdatedAt` (409 `STALE_SETTINGS`). Audited with before/after, plus a system notification.
- [ ] Tests: validation per field, the at-least-one-payment rule, the stale write, and the audit diff
- [ ] **(cross-team)** Tell the checkout owner that the payment toggles and free-shipping threshold now exist and are not yet applied at checkout
- [ ] Frontend: server load and `hooks/use-store-settings.ts`, with server errors mapped to fields
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Store configuration**

### 11b. Store policies: `/admin/system/policies`
- [ ] Add the `Policy` model and register it. Seed the 4 policies from `defaultPolicies`.
- [ ] `GET /policies` and `PUT /policies/:code`: title, content (plain text, ≤ 20 000 characters, stored as typed, rendered as text, never HTML), status, and `effectiveAt`. Save and publish sets `published`. Audited.
- [ ] Tests: validation, unknown code 404, and publish sets the status and `updatedBy`
- [ ] Frontend: service and hook. "Xem trước" stays a demo.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Store policies**

### 11c. Audit log: `/admin/system/audit-log`
- [ ] `GET /audit-logs?q&action&from&to&page`: rows with actor name and role, action, summary, IP, target, `targetHref` (computed for users, products, categories, orders, settings, and policies), and result. Read-only: the router registers no mutation.
- [ ] Tests: filters, actor join, `targetHref` per collection, denied entries listed, and a test that no write route exists under `/audit-logs`
- [ ] Frontend: service and hook. Delete `mock/system.ts` and `mock/text.ts` if nothing else imports them. "Xuất nhật ký" stays a demo.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Audit log**

## 12. Seed, migration and final verification

- [ ] `npm run migrate:admin` runs twice against a development database with no changes on the second run
- [ ] `npm run seed:admin` runs twice with no duplicates, and every Admin screen has populated, non-empty data afterwards
- [ ] `frontend/features/admin/mock/` is gone. `tests/admin-mock.test.mjs` is replaced by tests for the services and data mapping. `grep` finds no Admin import of `features/staff` or another feature.
- [ ] `backend/src/models/README.md` documents the new fields and models. `CLAUDE.md` mentions `admin.router.js` and the Admin layers. `frontend/design.md` is updated if any UI changed (period select, read-only permissions, receipt form).
- [ ] Full checks: `npm --prefix backend test`, `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend exec -- tsc --noEmit`, `npm --prefix frontend run build`
- [ ] Browser pass as Admin:
  - [ ] every route
  - [ ] every `?state=` variant
  - [ ] widths 320 / 768 / 1024 / 1440
  - [ ] keyboard navigation
  - [ ] no console errors
- [ ] Security pass:
  - [ ] a Staff session gets 403 on every `/api/v1/admin/*` and `/forbidden` on every `/admin/*`
  - [ ] a mutation without CSRF is refused
  - [ ] a locked account is refused
  - [ ] the audit log shows each of these
- [ ] Update the git-ignored root `handoff.md`, including the open cross-team items
- [ ] **🛑 Commit checkpoint: Admin backend complete**

## Decisions made (change before starting if you disagree)

1. **Real data replaces the mock numbers.** The backend does not reproduce 348 users or 124 products, because users need Firebase accounts and the seed never creates users. Cross-screen consistency comes from computing every figure from the same database, so `tests/admin-mock.test.mjs` is retired with the mocks.
2. **One Admin product row per variant SKU.** Every seeded product has one variant today. Product-level fields apply to all of its variants.
3. **Account lock** is a new `User.status` checked in `requireAuth` and at sign-in, plus Firebase refresh-token revocation. Role changes are limited to customer ↔ staff, using `overwriteImmutable` (supported by the installed Mongoose 9.11.2).
4. **The permission matrix is read-only.** Authorization stays in code (`requireRole`). Dynamic RBAC is out of scope.
5. **Cancellation requests are embedded on the order**, not a new collection. Stock is given back only on approval and exactly once. Opening requests from the customer side needs the Customer orders owner (phase 6).
6. **Stock history is a new `StockMovement` collection.** The inventory report's "out" uses order items, so it is complete even before the Staff and checkout flows record movements.
7. **Master data is one collection with a `kind` field.** Products keep storing brand, pet type, and unit as names. Master data is read-only until a create/edit screen is designed. Replaced on 2026-11-07 by `docs/specs/admin-create-export-actions.md` for the first six Admin screens, except image upload.
8. **Users are addressed by MongoDB `_id`** in URLs. The `KH`/`NV` code is derived for display, not stored.
9. **Reports default to the current month** and offer presets (this month, last month, this quarter). Revenue counts paid and completed orders only. Profit is never shown.
10. **Creating users and products, uploads, exports, email sending, and promotions remain out of scope.** Their buttons keep the demo notice. Replaced on 2026-11-07 by `docs/specs/admin-create-export-actions.md` for the first six Admin screens, except image upload.
