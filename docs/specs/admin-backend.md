# Admin backend specification

## Problem

Every Admin screen in `docs/specs/admin-workspace-ui.md` is built, but it reads typed mock modules in `frontend/features/admin/mock/`, and every create, save, lock, approve, or delete action only changes local state. The only Admin APIs are `GET /api/v1/admin/dashboard` (session check) and `GET /api/v1/admin/inventory` (stock list). This feature replaces the mocks with Express + MongoDB endpoints, screen by screen, so the Admin workspace manages real data.

## Scope

| Screen | Route | APIs (all under `/api/v1/admin`) | SRS |
| --- | --- | --- | --- |
| Dashboard | `/admin/dashboard` | `GET /overview` | UC40, BR-28 |
| User list | `/admin/users` | `GET /users` | UC36, UC37 |
| User detail | `/admin/users/[id]` | `GET /users/:id`, `POST /users/:id/lock`, `POST /users/:id/unlock` | UC36, UC37, CR-11 |
| Edit user | `/admin/users/[id]/edit` | `PATCH /users/:id` | UC36, UC37 |
| Roles & permissions | `/admin/users/roles` | `GET /permissions` (read-only) | BR-03, BR-23 |
| Product list | `/admin/products` | `GET /products` | T-ADM-01, BR-04 |
| Product detail | `/admin/products/[sku]` | `GET /products/:sku`, `POST /products/:sku/hide`, `POST /products/:sku/show` | T-ADM-01 |
| Edit product | `/admin/products/[sku]/edit` | `PATCH /products/:sku`, `DELETE /products/:sku` | T-ADM-01, CR-10 |
| Category tree | `/admin/categories` | `GET /categories`, `DELETE /categories/:code` | UC28 |
| Edit category | `/admin/categories/[code]/edit` | `GET /categories/:code`, `PATCH /categories/:code` | UC28, MSG32 |
| Master data | `/admin/master-data` | `GET /master-data`, `GET /master-data/options` | — |
| Orders | `/admin/orders` | `GET /orders` | UC31 (Admin view) |
| Cancellations | `/admin/cancellations` | `GET /cancellations`, `POST /cancellations/:orderCode/approve`, `POST /cancellations/:orderCode/reject` | UC25, BR-20 |
| Inventory | `/admin/inventory` | `GET /inventory`, `GET /inventory/movements`, `POST /inventory/receipts` | UC29, UC30, BR-26 |
| Finance report | `/admin/reports/finance` | `GET /reports/finance` | UC41, BR-28 |
| Sales report | `/admin/reports/sales` | `GET /reports/sales` | UC40 |
| Inventory report | `/admin/reports/inventory` | `GET /reports/inventory` | BR-26 |
| Notifications | `/admin/notifications` | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `POST /notifications/:id/save` | CR-13 |
| Store configuration | `/admin/system/settings` | `GET /settings`, `PUT /settings` | — |
| Store policies | `/admin/system/policies` | `GET /policies`, `PUT /policies/:code` | — |
| Audit log | `/admin/system/audit-log` | `GET /audit-logs` | CR-11, T-ADM-06 |

## Requirements

### Security and API conventions

- One `admin.router.js` mounted at `/api/v1/admin` applies `readCookies`, `requireAuth`, and `requireRole("admin")` to every route. Every mutation also uses `protectMutation` (JSON, allowed Origin, CSRF).
- Guests get 401, and Customer and Staff sessions get 403 on every Admin route (CR-05). A test enumerates every registered Admin route to prove it.
- Every request body and query is validated with Zod in `validators/admin/*.validator.js` (CR-01). Validation failures return 400 `VALIDATION_ERROR` with field paths. Duplicate codes or names return 409 with code `DUPLICATE_VALUE` (MSG32).
- Lists accept `page` (≥ 1), `pageSize` (1–100, default 6 as in the designs), `q`, and screen-specific filters. They return `{ items, pagination: { page, pageSize, total, totalPages }, counts }`, where `counts` holds the tab counts.
- Text search is accent- and case-insensitive for Vietnamese, matching the frontend `matchesQuery` behavior ("duc" finds "Đức"). User input is regex-escaped.
- Every Admin mutation writes an `AuditLog` entry with actor, action, target, before/after (secrets removed), request IP, and result (CR-11). A Customer or Staff session refused on an Admin route is logged with result `denied`.
- Responses never expose `firebaseUid`, `creationRequestHash`, payment `rawResult`, or other users' unrelated data (CR-08).

### Users (UC36, UC37)

- The list contains Customer and Staff accounts. Admin accounts never appear and cannot be edited, locked, or re-roled through these APIs.
- Users are addressed by MongoDB `_id`. The displayed account code is derived (`KH`/`NV` plus the last 6 characters of the id, uppercase). No sequential code is stored.
- `User.status` is `active` or `locked` (missing means `active`). Locking requires a reason, sets `lockedAt`/`lockedBy`, revokes the user's Firebase refresh tokens, and makes `requireAuth` reject that user's sessions with 403 `ACCOUNT_LOCKED` (MSG07). The session exchange at login also refuses locked accounts. Unlocking clears the lock fields. An Admin cannot lock themselves.
- Edit accepts full name, phone, role (`customer` ↔ `staff` only), status, and an internal note. Email is owned by Firebase and stays read-only (SRS §11.9). A role change revokes the user's sessions so the new role applies at the next sign-in.
- Detail returns the profile, the default address (read-only), completed-order count, total spent (paid and completed orders), last sign-in from Firebase (`null` when unavailable, never invented), and recent activity merged from the user's orders and the audit entries that target the user.
- The permission matrix is served read-only from the authorization rules in code. Changing permissions at runtime (dynamic RBAC) is out of scope, so "Lưu phân quyền" is replaced by a note.

### Categories (UC28)

- Categories form a tree at most 2 levels deep: `parentId` is null or points to a root. New fields are `code` (unique, `DM###`), `parentId`, `description`, and `displayOrder`. `name` and `slug` stay unique.
- Product counts are aggregated, including child categories, and never stored.
- A category cannot become its own parent or a child of a child. A category with children cannot get a parent.
- Delete returns 409 `CATEGORY_IN_USE` while products or child categories are linked. Deactivating a category is allowed.
- Existing flat categories become roots. A one-time migration assigns codes in creation order.

### Products (T-ADM-01)

- The Admin product row is one variant: the URL key is the variant SKU. Product-level fields (name, brand, pet type, category, description, unit, visibility) apply to every variant of that product. Variant-level fields are price, cost, stock, and low-stock threshold.
- New optional fields: `Product.unit`, `variants[].cost`, and `variants[].lowStockThreshold`. When a threshold is missing, the global `Setting.lowStockThreshold` applies.
- The status badge is derived: hidden (`isActive: false`), else "Sắp hết hàng" when available stock (stock − reserved) is at or below the threshold, else "Đang bán". The UI test that uses `<` changes to `≤` to match UC30.
- Changing stock in the edit form records an adjustment `StockMovement`. Stock cannot go below `reservedStock`, and the write is conditional on the stock value read, so a concurrent change returns 409 `STALE_STOCK`.
- Delete returns 409 `PRODUCT_HAS_ORDERS` when any order item references the product (CR-10). Otherwise the product is deleted. Hide and show toggle `isActive`.
- "Cost" is optional. Without it, margins and profit are not shown (BR-28).

### Master data

- One `MasterData` collection holds the 5 kinds: `petType`, `breed` (with `petTypeCode`), `brand`, `unit`, and `shippingMethod` (with `fee`). Each kind has a unique `code`, a `name`, a `description`, and `isActive`.
- Metrics are computed: breed count per pet type, pet type per breed, product count per brand and per unit (matched by name), and fee per shipping method.
- `GET /master-data/options` serves the active pet types, brands, and units to the product edit form.
- The screen has no create or edit design, so its APIs are read-only in this feature.

### Orders and cancellations (UC25, BR-20)

- The Admin order list shows every channel and every non-`pending` creation state. Tabs group statuses: "Chờ xử lý" = pending, confirmed, and processing (processing shows "Đang đóng gói"). `q` matches the order code (with or without `#`), customer name, or phone.
- A cancellation request is embedded on the order as `cancellationRequest { status: pending|approved|rejected, reason, requestedBy, requesterRole, requestedAt, decidedBy, decidedAt, decisionNote }`. There is at most one open request per order.
- Approve cancels the order, appends `statusHistory`, and gives back exactly what the order held: it releases `reservedStock` for reserved items or adds back `stock` for deducted items, and records `StockMovement` rows. Approval is conditional on `cancellationRequest.status: "pending"`, so a repeated or concurrent approval does nothing (409 `ALREADY_DECIDED`). A paid order is marked for refund follow-up, but no money is moved (SRS §11.3).
- Reject requires a note, keeps the order status, and does not touch stock.
- Who creates requests: the customer cancel flow (owned by the Customer area) opens a request when the order is past the immediate-cancel stage. This is coordinated with that owner (see the plan).

### Inventory (UC29, UC30, BR-26)

- The stock list keeps Quang's endpoint and response, refactored into the layered structure with a Zod validator. It adds category name, unit, and per-variant threshold.
- `StockMovement { productId, sku, type: in|out|adjust, quantity, stockBefore, stockAfter, reason, source: { kind: receipt|adjustment|cancellation|order, id }, actorId, at }` is the import/export history.
- A stock receipt (`POST /inventory/receipts`) takes a note and 1–50 `{ sku, quantity > 0 }` lines with no duplicate SKUs. Every SKU is validated before any write. Each line is applied with `$inc` and recorded as an `in` movement sharing one receipt code. A failure partway reports which lines were applied.

### Dashboard and reports (UC40, UC41, BR-28)

- Every report takes `from` and `to` dates (Asia/Ho_Chi_Minh). The default is the current month to date. The UI's date chip becomes a preset select: this month, last month, this quarter.
- Revenue counts only orders that are `paymentStatus: paid` and `orderStatus: completed` (UC41), with `creationState` not `pending`, reusing `salesMatch` from the Staff analytics helpers.
- Dashboard: net revenue and growth against the previous equal-length period, orders in period, new customers, the low-stock count, the cumulative daily revenue series, the top 3 stock alerts, and recent activity. A metric that fails to load returns `null`, which shows "Không có dữ liệu", never a fabricated value.
- Finance: gross revenue, refunds (approved cancellations of paid orders, recorded but not executed), net revenue, and pending reconciliation (online payments still `pending`). The per-channel table uses the real payment methods: COD, ONLINE (VNPay/QR), and CASH (in store). Profit is never shown.
- Sales: grouped by product, category, staff (offline orders by `createdByStaffId`), or time bucket, plus the daily quantity series.
- Inventory report per SKU: `in` = receipt and positive adjustment movements in the period; `out` = items of non-cancelled orders in the period plus negative adjustments; `closing` = current stock − in(after period) + out(after period); `opening` = closing − in + out. A test enforces closing = opening + in − out.

### Notifications

- `AdminNotification { type: order|stock|system, title, detail, targetHref, reference, readBy[], savedBy[] }` stores read and saved state per Admin.
- `notifyAdmins()` creates them when a cancellation request is opened, when an Admin stock change leaves a SKU at or below its threshold (only if the low-stock alert setting is on), and when an Admin setting or policy is published. Hooks in flows owned by other areas (new online order, Staff stock changes) are follow-ups listed in the plan.
- A notification failure never rolls back the operation that triggered it (CR-13).

### System

- `Setting` (`_id: "global"`) gains the store information, shipping toggles, free-shipping threshold, payment-method toggles, account holder, and notification toggles shown in `System.png`. Timezone and currency are fixed and read-only. Saving validates every field, records before/after in the audit log, and returns the saved document.
- These toggles are stored for the Admin screen. Applying them to checkout (hiding a disabled payment method, free shipping) belongs to the checkout owner and is a follow-up.
- `Policy { code: return|cancel|refund|privacy, title, content (plain text, ≤ 20 000 chars), status: draft|published|suspended, effectiveAt, updatedBy }`. Save-and-publish sets the status to `published`.
- The audit log is read-only: search, an action filter, a period filter, pagination, actor name, IP, result, and a link to the target record.

## Acceptance criteria

1. Every Admin screen loads its data from `/api/v1/admin/*`. `frontend/features/admin/mock/` is deleted, and no Admin component imports from another feature.
2. Every list keeps the designed loading, empty, and error states, now driven by real request state. `?state=empty|loading|error` still forces them for review.
3. Detail and edit routes return not-found for unknown ids, SKUs, or codes.
4. Every route rejects guests (401) and Customer or Staff sessions (403). Every mutation enforces CSRF and Origin.
5. A locked user cannot use an existing session or sign in again until unlocked.
6. Category and product deletes are refused while linked, with the designed message.
7. Approving a cancellation restores stock exactly once. Rejecting changes nothing but the request.
8. Report figures come from recorded data only, and the inventory formula holds for every row.
9. Every mutation appears in the audit log with actor, action, target, IP, and result.
10. `npm --prefix backend test`, `npm --prefix frontend test`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build` pass, and a browser check as Admin covers every screen.

## Edge cases

- An empty database: every list shows its empty state, and reports show zero, not errors.
- Legacy documents without the new fields: no `status` means active, no `code` until the migration runs (the API falls back to `_id`), and no threshold means the global threshold applies.
- Concurrent edits: stock, cancellation decisions, and settings use conditional writes and return 409 on conflict.
- A user deleted from Firebase but still in MongoDB: the detail page shows last sign-in as unknown, and locking still sets the MongoDB status.
- An Admin who loses the Admin role mid-session: the next request returns 403, because `requireAuth` reloads the role.

## Non-goals

- Creating users, creating products, image uploads, CSV/Excel exports, email sending (including "Gửi đặt lại mật khẩu"), and the policy preview. Their buttons keep the demo notice.
- Dynamic, database-driven permissions.
- Create and edit forms for master data (no design).
- Changing checkout, catalog, or Staff behavior beyond the coordinated hooks listed in the plan.
- Promotions (UC39): no Admin screen is designed for them.
- Real refunds and payment-provider reconciliation.
- Reproducing the mock numbers (348 users, 124 products). Cross-screen consistency now comes from computing every figure from the same database.
