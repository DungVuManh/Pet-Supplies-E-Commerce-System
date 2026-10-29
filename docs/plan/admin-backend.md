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
- [ ] **🛑 Commit checkpoint: Admin API foundation**

## 1. Users

### 1a. User list: `/admin/users`
- [ ] `User`: add `status` (`active`|`locked`, default `active`), `lockedAt`, `lockedBy`, `lockReason`, and `adminNote` (≤ 1000 characters). Index `{ role: 1, status: 1, createdAt: -1 }`. Queries treat a missing `status` as active (`{ status: { $ne: "locked" } }`).
- [ ] Migration: set `status: "active"` where it is missing
- [ ] `validators/admin/user.validator.js`: list query (`tab`, `role`, `status`, `q`)
- [ ] `controllers/admin/user.controller.js` `listUsers`: Customer and Staff only, search by name, email, phone, or derived code. Returns rows `{ id, code, role, fullName, email, phone, joinedAt, status }` and `counts { all, customer, staff }`.
- [ ] Tests: Admin accounts are excluded, tab counts, filters, accent-insensitive search, paging, and the derived code format
- [ ] Frontend: `services/users.ts` `listUsers`, a `useUsersList` hook, and `users-list.tsx` on the hook. Real loading, error ("Thử lại"), and empty states, with `?state=` still working.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: User list**

### 1b. User detail and lock: `/admin/users/[id]`
- [ ] `requireAuth`: a `locked` user gets 403 `ACCOUNT_LOCKED` with "Tài khoản đang bị khóa." (MSG07). The session exchange (`POST /auth/session`) refuses locked users before setting the cookie.
- [ ] `getUser`: profile, default address, completed-order count and total spent (paid and completed), last sign-in from Firebase `getUser().metadata.lastSignInTime` (`null` on failure), and the 10 newest activity items merged from the user's orders and the audit entries that target the user. 404 for an unknown or Admin id.
- [ ] `POST /users/:id/lock` (reason required, 3–200 characters) and `POST /users/:id/unlock`. They refuse the caller's own account and Admin accounts, use a conditional update on the current status (409 `ALREADY_LOCKED`/`NOT_LOCKED`), call `revokeRefreshTokens(firebaseUid)`, and write an audit entry.
- [ ] Tests: lock blocks an existing session and the next sign-in, unlock restores access, self and Admin are refused, a revocation failure returns 503 without leaving the status half-changed (status is written after revoke succeeds), and the audit entry is written
- [ ] Frontend: the detail page loads through `lib/server-api.ts` (`notFound()` on 404). The lock button opens a confirmation with a reason field (CR-12), calls the service, and updates the badge from the response. The login form shows the `ACCOUNT_LOCKED` message.
- [ ] Browser check: lock, then sign in as that account in a second browser context and confirm it is refused, then unlock
- [ ] **🛑 Commit checkpoint: User detail + lock**

### 1c. Edit user: `/admin/users/[id]/edit`
- [ ] `PATCH /users/:id`: `fullName` (2–100), `phone` (VN format, same rule as account validation), `role` (`customer`|`staff`), `status`, and `adminNote`. Email is rejected if sent. The role change uses `updateOne` with `overwriteImmutable: true` and revokes sessions. Returns the updated detail and writes before/after to the audit log.
- [ ] Tests: role change customer ↔ staff, to or from `admin` refused (400), no-op detection ("Không có thay đổi nào để lưu."), validation messages per field, and a 409 when the user was changed concurrently (compare `updatedAt`)
- [ ] Frontend: move `validateUser` from `features/admin/validation.ts` into `hooks/use-user-edit.ts`. Server field errors map onto the form. Email and the default address are read-only. "Gửi đặt lại mật khẩu" keeps its demo notice (email sending is a non-goal).
- [ ] Browser check: validation errors and focus, save, role change visible in the list, Hủy
- [ ] **🛑 Commit checkpoint: Edit user**

### 1d. Roles & permissions: `/admin/users/roles`
- [ ] `GET /permissions`: the 9-row matrix from a constant in `common/permissions.js`, documented as mirroring the `requireRole` usage, plus the per-role account counts
- [ ] Test: the matrix's Staff rows agree with the routes guarded by `requireRole("staff")`
- [ ] Frontend: render the matrix read-only. Replace "Lưu phân quyền" with an `InfoCallout` explaining that permissions are fixed by the system for this release. Delete `mock/permissions.ts` and `mock/users.ts`.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Roles & permissions**

## 2. Categories

### 2a. Category tree: `/admin/categories`
- [ ] `Category`: add `code` (unique, `DM###`), `parentId` (ref Category, default null), `description` (≤ 500), and `displayOrder` (integer ≥ 1). Index `{ parentId: 1, displayOrder: 1 }`.
- [ ] Migration: give existing categories codes `DM001…` in `createdAt` order and `displayOrder` by name. All stay roots.
- [ ] `GET /categories`: the tree in display order with `productCount` aggregated (including children) and the `q`/`status` filters. A matching child keeps its parent, flagged `context: true`, mirroring the mock's `filterCategories`.
- [ ] `DELETE /categories/:code`: 409 `CATEGORY_IN_USE` with the reason ("còn N sản phẩm liên kết" / "còn danh mục con"), otherwise delete and audit
- [ ] Tests: tree order, counts including children, filter keeps the parent, both delete blockers, and a successful delete
- [ ] Seed: a sample child category under "Dành cho chó" and one under "Dành cho mèo", so the tree has two levels
- [ ] Frontend: `services/categories.ts`, a `useCategoryTree` hook, and `categories-list.tsx` on the hook. The delete icon asks for confirmation, then calls the API and shows the server's reason.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Category tree**

### 2b. Edit category: `/admin/categories/[code]/edit`
- [ ] `GET /categories/:code` and `PATCH /categories/:code`: `name` (unique), `slug` (unique, `^[a-z0-9]+(-[a-z0-9]+)*$`), `parentCode` (a root, not itself; refused when the category has children), `description`, `displayOrder`, and `isActive`. 409 `DUPLICATE_VALUE` (MSG32) on duplicates. Audited.
- [ ] Tests: each validation rule, duplicate name and slug, parent rules, and deactivation
- [ ] **(cross-team)** Ask the catalog owner to hide products of inactive categories on the public storefront ("category state controls catalog visibility", UC28). Note the outcome here.
- [ ] Frontend: server load for the edit page, `hooks/use-category-edit.ts` (moving `validateCategory` into it), and server errors mapped to fields. The "+ Thêm danh mục" button stays a demo notice (no create design).
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Edit category**

## 3. Master data: `/admin/master-data`

- [ ] Add the `MasterData` model (`kind`, `code`, `name`, `description`, `petTypeCode`, `fee`, `isActive`), with a unique index `{ kind: 1, code: 1 }`, and register it
- [ ] Seed: the 5 pet types, the breeds, and the 6 units and 3 shipping methods from `mock/master-data.ts`. Brands come from the distinct `Product.brand` values, with the origins from the mock where a brand matches.
- [ ] `GET /master-data?kind=&q=&status=&page=`: rows with the computed metric, plus counts per kind. `GET /master-data/options`: active pet types, brands, and units for the product form.
- [ ] Tests: counts per kind, computed metrics (breeds per pet, products per brand and unit), filters, and options exclude inactive rows
- [ ] Frontend: `services/master-data.ts`, a `useMasterData` hook, and `master-data-view.tsx` on the hook. The "Dữ liệu liên quan" cards use the counts. "+ Thêm …" and "Chi tiết" keep their notices.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Master data**

## 4. Products

### 4a. Product list: `/admin/products`
- [ ] `Product`: add optional `unit`, `variants[].cost` (non-negative integer VND), and `variants[].lowStockThreshold`
- [ ] `GET /products`: one row per variant via `$unwind`, with category name and path, brand, price, available stock, threshold (variant value or `Setting.lowStockThreshold`), and the derived status (hidden, else `available ≤ threshold` → "Sắp hết hàng", else "Đang bán"). Filters: `tab`, `q` (SKU, name, brand), `category` (including children), `status`. Counts: all, on sale, hidden.
- [ ] Tests: one row per variant, threshold fallback, status derivation at the boundary (`available == threshold` is low), category scope including children, and counts
- [ ] Frontend: `services/products.ts`, a `useProductsList` hook, and `products-list.tsx` on the hook. Category options come from `GET /categories`. Change the UI's `<` to `≤` to match UC30, and update its test.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Product list**

### 4b. Product detail: `/admin/products/[sku]`
- [ ] `GET /products/:sku`: product and variant fields, category path, images, the last update (from the audit log: actor name and time), and a history tab built from the audit entries plus `StockMovement` rows for the SKU. 404 for an unknown SKU.
- [ ] `POST /products/:sku/hide` and `/show`: toggle `Product.isActive`, conditional and audited
- [ ] Tests: the detail shape, unknown SKU, the hide/show toggle and audit, and that a hidden product disappears from `GET /api/v1/products` (public)
- [ ] Frontend: server load and the hide/show button on the API (with confirmation for hide)
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Product detail**

### 4c. Edit product: `/admin/products/[sku]/edit`
- [ ] Add the `StockMovement` model and register it. The model list test now really includes it, replacing the reverted phantom entry.
- [ ] `PATCH /products/:sku`: product fields (`name`, `brand`, `petType`, `categoryCode` (leaf or root without children), `description`, `unit`, `isActive`) and variant fields (`price`, `cost`, `stock`, `lowStockThreshold`). A stock change requires `expectedStock` and writes conditionally (`variants.stock: expectedStock`, 409 `STALE_STOCK`). It never goes below `reservedStock` and records an `adjust` movement. A SKU rename is refused when orders reference the old SKU. Audited, with a low-stock notification when the new stock is at or below the threshold.
- [ ] `DELETE /products/:sku`: 409 `PRODUCT_HAS_ORDERS` when `Order.exists({ "items.productId" })`. Otherwise delete the product and audit.
- [ ] Tests: field validation, stale stock, stock below reserved, the movement recorded, both delete outcomes, and the notification created
- [ ] Frontend: `hooks/use-product-edit.ts` (moving `validateProduct`/`parseAmount` into it). Pet type and unit options come from `GET /master-data/options`. Server errors map to fields. "Tải ảnh lên" stays a demo (no uploads).
- [ ] Delete `mock/products.ts` and `mock/categories.ts` once no screen imports them
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Edit product**

## 5. Orders: `/admin/orders`

- [ ] `GET /orders`: all channels, `creationState` not `pending`. Tabs: all, processing (pending, confirmed, processing), shipping, completed, cancelled. `q` matches the order code (a leading `#` is ignored), customer or guest name, and phone, reusing `buildOrderSearchFilter`. Rows `{ orderCode, customerName, phone, createdAt, total, paymentMethod, status }`, where processing shows "Đang đóng gói".
- [ ] Tests: tab grouping covers every status, search by code with `#`, guest and customer names, and that pending staff sales are hidden
- [ ] Frontend: `services/orders.ts`, a `useOrdersList` hook, and `orders-view.tsx` on the hook. `?q=` still pre-fills the search. Delete `mock/orders.ts`, which also removes the cross-feature import of `features/staff/mock-data.ts`.
- [ ] Browser check, including the dashboard and user-activity links that open `?q=`
- [ ] **🛑 Commit checkpoint: Orders**

## 6. Cancellation requests: `/admin/cancellations`

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

- [ ] `validators/admin/period.validator.js`: `from`/`to` (ISO dates, `from` ≤ `to`, at most 366 days), default the current month to date in Asia/Ho_Chi_Minh, and presets `this-month`, `last-month`, `this-quarter`
- [ ] `GET /overview`: net revenue (reusing `salesMatch`), growth against the previous equal-length period, orders in the period, new customers, the low-stock count, the cumulative daily revenue series, the top 3 stock alerts, and recent activity (the newest audit entries, orders, and sign-ups, as `{ time, title, detail, value, status, href }`). Each metric is computed independently and becomes `null` on failure (UC40 2a).
- [ ] Tests: revenue includes only paid and completed orders, the series ends at the net revenue, growth with a zero previous period is shown as "—", and one failing metric doesn't fail the response
- [ ] Frontend: `services/overview.ts`, and the dashboard on server-loaded data with a preset period select in place of the fixed chip. `null` metrics show "Không có dữ liệu". Delete `mock/overview.ts`.
- [ ] Browser check
- [ ] **🛑 Commit checkpoint: Dashboard**

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
7. **Master data is one collection with a `kind` field.** Products keep storing brand, pet type, and unit as names. Master data is read-only until a create/edit screen is designed.
8. **Users are addressed by MongoDB `_id`** in URLs. The `KH`/`NV` code is derived for display, not stored.
9. **Reports default to the current month** and offer presets (this month, last month, this quarter). Revenue counts paid and completed orders only. Profit is never shown.
10. **Creating users and products, uploads, exports, email sending, and promotions remain out of scope.** Their buttons keep the demo notice.
