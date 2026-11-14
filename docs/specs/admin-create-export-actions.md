# Admin create and export actions specification

## Problem

The first six Admin sidebar screens read real data, but the main action buttons only show "chưa kết nối backend". An Admin cannot add a user, product, category, or master data value, and cannot export products or orders. Some row and form actions on these screens are also placeholders.

## Scope

Only the first six sidebar screens are in scope. Vouchers are already done. The other screens belong to a teammate.

| Screen | Control | Result | API (under `/api/v1/admin`) |
| --- | --- | --- | --- |
| Tổng quan | None | Nothing to build: every action is already a working link | None |
| Người dùng | Thêm người dùng | Page `/admin/users/new` | `POST /users` |
| Người dùng (edit page) | Gửi đặt lại mật khẩu | Sends the Firebase reset email | Firebase client SDK |
| Sản phẩm | Thêm sản phẩm | Page `/admin/products/new` | `POST /products` |
| Sản phẩm | Xuất danh sách | Downloads a CSV of the filtered list | `GET /products/export` |
| Danh mục | Thêm danh mục | Page `/admin/categories/new` | `POST /categories` |
| Dữ liệu nền | Thêm loài, Thêm giống, Thêm thương hiệu, Thêm đơn vị, Thêm phương thức | Modal for the current tab | `POST /master-data` |
| Dữ liệu nền | Chi tiết → | The same modal, to edit or delete | `GET`, `PATCH`, `DELETE /master-data/:kind/:code` |
| Đơn hàng | Xuất đơn hàng | Downloads a CSV of the filtered list | `GET /orders/export` |
| Đơn hàng | Chi tiết → | Read-only page `/admin/orders/[orderCode]` | `GET /orders/:orderCode` |

## Requirements

### All actions

- Routes use the existing Admin router: Admin session required, and `protectMutation` on JSON mutations.
- Forms validate on the client and again with Zod on the server. Field errors use the existing `VALIDATION_ERROR` shape, and duplicates return 409 `DUPLICATE_VALUE`.
- Every create, update, delete, and export writes an audit entry without secrets.
- Screens reuse existing tokens and workspace components, and work at 1440 and 320 px with no page-level horizontal scroll.

### Users (UC36, UC37)

- "Thêm người dùng" creates **Staff accounts only**. Customers register themselves (UC36 has no creation step), and an existing customer can still become Staff on the edit page.
- Fields: full name, email, phone, and an optional internal note.
- The server creates the Firebase account with a random password that is never stored, returned, or logged, then inserts the MongoDB profile with role `staff`.
- If the profile insert fails, the server deletes the new Firebase account. An email already in Firebase returns 409 on the `email` field and never links to or changes that account.
- After creation, the browser asks Firebase to send a password-setup email and shows whether it was sent. A failed send can be retried without creating the account again.
- "Gửi đặt lại mật khẩu" on the edit page sends the same email, and is disabled while the account is locked. Firebase sends it from the browser, as the public forgot-password page does, so it has no audit entry.

### Categories (UC28)

- Fields: name, slug, pet type (`dog`, `cat`, or `both`), description, display order, and status. Pet type also becomes editable on the edit page.
- The slug is suggested from the name, with Vietnamese accents removed, and can be edited.
- The code is the next `DM###` from the server. Display order defaults to the highest value plus 1.
- Categories are flat, following `origin/dev`, which removed `parentId`. The list's "cha – con" subtitle changes to match.

### Master data

- One modal adapts to the current tab:

| Tab | Fields | Generated code |
| --- | --- | --- |
| Loài thú cưng | Name, description, status | `PET-<NAME>` |
| Giống | Pet type (required, active), name, description, status | `BR-###` |
| Thương hiệu | Name, origin (stored as description), status | `BRD-<NAME>` |
| Đơn vị | Name, usage (stored as description), status | `UNIT-<NAME>` |
| Vận chuyển | Name, description, fee (VND, 0 or more), status | `SHIP-<NAME>` |

- The code never changes after creation. A repeated code gets a numeric suffix.
- Names are unique per kind, and per pet type for breeds, ignoring case.
- A brand or unit used by products cannot be renamed or deleted (409 `MASTER_DATA_IN_USE`), because products store its name. It can be deactivated.
- A pet type with breeds cannot be deleted. It can be deactivated.
- An edit is refused with 409 `STALE_MASTER_DATA` if the row changed after the modal loaded it.
- Master data stays reference data. A new pet type does not reach the product form, which stays `dog`, `cat`, `all`, and a new shipping method does not reach checkout. The modal says so on those two tabs.

### Products (T-ADM-01)

- Fields: the product fields of the edit form, without images, and 1–20 variants. Each variant has a label, SKU, price, optional cost, starting stock, and optional low-stock threshold.
- SKUs must be distinct in the request and across all products. A clash that only the database catches also returns 409 on that SKU.
- A variant with starting stock above 0 records an `adjust` stock movement with the reason "Tồn kho ban đầu", so inventory reports add up.
- Image upload is built separately by someone else. A new product starts with no images, and "Tải ảnh lên" on the edit page keeps its notice until that work lands.
- A product with no images shows a neutral placeholder on the storefront, never a broken image or another product's photo.

### Exports

- An export contains every row matching the current tab, filters, and search, not only the current page, up to 5,000 rows. Beyond that the file has the first 5,000 and the screen says so.
- Files are UTF-8 CSV with a BOM, using the existing `downloadExcelCsv`.
- Text cells that start with `=`, `+`, `-`, `@`, a tab, or a carriage return are neutralized, so customer-entered text cannot run as a spreadsheet formula.
- Product columns: SKU, product code, name, brand, categories, unit, price, available stock, threshold, status. Cost is left out.
- Order columns: order code, created at, channel, customer, phone, payment method, payment status, subtotal, discount, total, voucher code, order status.

### Order detail

- Read-only, because Staff process orders and cancellation requests are on the teammate's screen.
- Shows items, amounts, voucher, payment, customer, address, shipping, and status history with actor names.
- A shipping fee appears only when above 0, because `origin/dev` removed it and only older orders have one.
- An unknown code, or an order still being created, shows not-found.
- Raw payment results and `firebaseUid` are never returned.

## Acceptance criteria

1. No in-scope control in the Scope table shows a demo notice, and each does what the table says.
2. Each new record appears in its list without a manual reload, and in the audit log.
3. Each form shows server errors on the right field, including duplicates, and keeps what the Admin typed.
4. A new Staff member can set a password from the email, sign in, and reach `/staff/dashboard`, not `/admin`.
5. Guests get 401, and Customer and Staff sessions get 403, on every new route. Mutations reject a missing CSRF token or a wrong Origin.
6. A new product appears in the storefront catalog unless it is hidden, and its starting stock appears in the inventory report.
7. An exported file opens in Excel with correct Vietnamese text and matches the filtered list.
8. Backend tests, frontend tests, lint, and build show no failures beyond the baseline recorded in the plan's Part 0.

## Edge cases

- Firebase is unavailable: nothing is created, and the Admin sees a message to retry.
- Firebase succeeds, then both the profile insert and the clean-up fail: the Admin sees an error, and a retry returns the duplicate-email error until the Firebase account is removed by hand. The failure is logged without personal data.
- Two Admins create the same code or SKU: the unique index decides, and the loser gets 409 or a regenerated code.
- Two Admins create the same master data name: this can produce a duplicate, because the name check has no unique index. A new unique index could stop the server starting on a database that already has duplicates, and this risk is small enough to accept.
- A filter matching no rows: the export button shows a notice and creates no file.

## Non-goals

- The other Admin screens, and the header's global search, which spans all screens.
- Creating Customer or Admin accounts.
- Adding or removing variants on an existing product, or editing a variant's label.
- Changing an order's status, or cancelling, from the Admin order page.
- Applying master data to checkout, the catalog filters, or the product pet type list.
- Image upload, on both the new and edit product pages, because someone else is building it.
- Sending email from the backend.
- Excel `.xlsx` files, background export jobs, and importing data.
