# Admin workspace UI implementation plan

Specification: `docs/specs/admin-workspace-ui.md`
Designs: `docs/designs/Admin/` (Auth designs excluded; authentication is already implemented)

## How to use this plan

- Tick each item (`- [x]`) as soon as it is implemented and checked.
- Every screen ends with a **🛑 Commit checkpoint**. Implementation stops there until you commit manually. Before stopping, run that screen's checks: the focused test, `npm --prefix frontend run lint`, and a visual check of the route.
- Run the full `npm --prefix frontend test` and `npm --prefix frontend run build` at each checkpoint where routes were added.
- Backend integration is a later feature. Keep every mock behind small typed accessor functions in `features/admin/` so they can be swapped for API calls without rewriting pages.

## Architecture

- `app/(workspace)/admin/layout.tsx`: a Server Component that calls `requireDashboardUser("admin")` once and wraps pages in `AuthProvider` and `AdminShell`.
- `features/workspace/components/workspace-ui.tsx`: shared presentation primitives extracted from `features/staff/components/staff-ui.tsx`. Staff re-exports them so it keeps working unchanged.
- `features/admin/components/`: the Admin shell and Admin-only components.
- `features/admin/mock/`: typed mock data split by domain, plus lookup and filter helpers.
- `features/admin/status.ts`: the central label-to-badge-tone mapping.
- Icons: use `lucide-react`. It matches `Icons.png` and is already imported by the catalog, but it is not declared in `frontend/package.json`, so it must be added there.

---

## 0. Foundation (shell + shared components)

- [x] Add `lucide-react` to `frontend/package.json` dependencies and update `frontend/package-lock.json`.
- [x] Check the Admin tokens in `app/globals.css` (`--brand` teal `#0F766E`, subtle `#EAF5F3`, hover) against the designs. The disabled-primary color in `Components.png` measures as brand teal at 40% opacity over white, so disabled primaries use `disabled:opacity-40` and no new hex token is added.
- [x] Extract `PageHeader`, `MetricCard`, `Badge`, `TableFrame`/`TableHead`/`Th`/`Td`, `ActionLink`, `BarChart`, and the button/control class names from `staff-ui.tsx` into `features/workspace/components/workspace-ui.tsx`. Re-export them from `staff-ui.tsx` so Staff imports and markup are unchanged.
- [x] Add the shared primitives the Admin designs need:
  - [x] `Breadcrumbs` ("Quản trị / … / …")
  - [x] `TabNav`: underline tabs with counts. Link variant for sub-pages, button variant for local filters.
  - [x] `Field`: label and control column. Filter rows compose `Field` items with the "Lọc dữ liệu" button.
  - [x] `Pagination` ("Hiển thị 1–6 / 348 bản ghi" plus page buttons)
  - [x] `InfoCallout`: the teal panel with an icon tile, title, and text
  - [x] `DetailList`: label/value rows used in the detail cards
  - [x] `ListState`: empty, loading (skeleton rows), and error panels, plus the `listStatePill` labels (Rỗng / Đang tải / Lỗi)
  - [x] `useListState()`: reads `?state=empty|loading|error` so designed states can be reviewed
  - [x] `DemoNotice`: a button that shows "chưa kết nối backend" feedback (generalizes the Staff `DemoAction`)
  - [x] `Switch` toggle, accessible with `role="switch"`
  - [x] `LineChart`: cumulative series with an accessible value table. `BarChart` is shared with Staff.
- [x] Create `features/admin/status.ts` with the label/tone mapping from the spec. `features/admin/components/admin-ui.tsx` adds `AdminPageHeader`, `KpiCard`, `StatusBadge`, and `Panel`.
- [x] Build `AdminShell`:
  - [x] Sidebar: logo, "KHÔNG GIAN QUẢN TRỊ / Pet Supplies", and the 11 nav items with lucide icons and an active state
  - [x] Footer pill "Hệ thống ổn định" and the version text
  - [x] Top bar (80px): "petly / admin", global search box (demo), "Thông báo" link, "Hỗ trợ", session user name with "Admin" and the logout menu (`AccountMenu` gains an optional `roleLabel`)
  - [x] Mobile: collapsible, keyboard-accessible navigation below `lg`, and no horizontal body scroll
- [x] Add `app/(workspace)/admin/layout.tsx` with the role guard and shell. Until phase 1, `/admin/dashboard` is a header-only placeholder inside the shell. The unused `WorkspaceDashboard` was removed.
- [x] Add `tests/admin-mock.test.mjs` with the first invariants (status mapping covers every tone).
- [x] Visual check of the shell, logged in as Admin (confirmed by user)
- [x] **🛑 Commit checkpoint: Admin shell + shared workspace UI**

> Known blockers outside this plan, found during phase 0. They are not caused by this work and are left for their owners:
> - `npm --prefix frontend run build` fails type checking because `app/(customer)/listProduct/ProductCat/page.tsx` is an empty file (commit `50677e2`).
> - `npm --prefix frontend run lint` reports an error in `features/staff/components/orders-list.tsx:83` (setState inside an effect).
> - `npm --prefix frontend test` has 4 failing auth-validation and catalog tests.

## 1. Dashboard: `/admin/dashboard`

- [x] Mock: KPI values, cumulative revenue series 01–12/10 (`mock/overview.ts`), and stock levels shared with the inventory screens (`mock/inventory.ts`)
- [x] Page header with greeting from the session user's given name, and a date-range chip "01–12/10/2026"
- [x] 4 KPI cards. "Sản phẩm sắp hết" uses the warning variant.
- [x] "Doanh thu lũy kế" line chart with axis, legend, and the data table
- [x] "Cảnh báo tồn kho" card with the "8 sản phẩm dưới định mức" pill and the 3 below-threshold items (each links to its product), plus a "Xem kho hàng →" link to `/admin/inventory`
- [x] Recent-activity table with badges, "Chi tiết →" links, and pagination (shared `DataTable`/`Th`/`Td`/`Stack` added to `admin-ui.tsx`)
- [x] Replace the placeholder dashboard page
- [x] Tests: the chart ends at the net-revenue KPI, the stock alert lists only below-threshold items, and activity statuses and links are valid
- [x] Fix from the review: `Pagination` attaches `onClick` only when `onPage` is given, so Server Components can render it. `admin/layout.tsx` moves the session check into a Suspense-wrapped `AdminSession` child, so client navigations into `/admin` pass Cache Components validation.
- [x] Visual check against `Dashboard.png` (confirmed by user)
- [x] **🛑 Commit checkpoint: Dashboard**

## 2. Users

### 2a. User list: `/admin/users`
- [x] Mock: users (KH*/NV* codes, join date, contact, role, status). The 6 designed rows come first, followed by deterministic filler, so the tabs read 348 / 342 / 6 and pagination is real (`mock/users.ts`). Accent-insensitive search lives in `mock/text.ts`.
- [x] Header with "+ Thêm người dùng" (demo notice) and a secondary link to "Vai trò & phân quyền"
- [x] Tabs: Tất cả / Customer / Staff (immediate). Filters: search, role, status (applied by "Lọc dữ liệu"). Table and 6-row pagination with a page window (`Pagination` now shows the 3 pages around the current one).
- [x] Empty state with "Xóa bộ lọc", plus `?state=loading|error` review states
- [x] "Quyền truy cập được kiểm soát" callout
- [x] `tsconfig.json`: enable `allowImportingTsExtensions` (valid with `noEmit`) so mock modules can import each other with the `.ts` extension that `node --test` requires
- [x] Tests: tab counts, designed first page, unique IDs, phone format, accent-insensitive search, combined filters
- [x] Visual check against `User.png` row 1 col 1 (confirmed by user)
- [x] **🛑 Commit checkpoint: User list**

### 2b. User detail: `/admin/users/[id]`
- [x] Account info card with status badge and `DetailList` (`getUserDetail`: designed values for KH0001, deterministic values for the other accounts)
- [x] KPI cards "Đơn đã hoàn thành" and "Tổng chi tiêu", the "Địa chỉ mặc định" callout, and the lock-explanation text (Staff accounts get Staff wording)
- [x] "Khóa tài khoản" (shared `dangerButton`; toggles badge and button to "Mở khóa tài khoản" with a demo notice) and "Chỉnh sửa" (link)
- [x] Activity-history table
- [x] `notFound()` for an unknown id. `params` is read inside a Suspense-wrapped child so list → detail navigation passes Cache Components validation (the same pattern applies to every dynamic Admin route).
- [x] Browser check as Admin at 1440 and 320: matches `User.png`, no console errors, no horizontal scroll
- [x] **🛑 Commit checkpoint: User detail**

### 2c. Edit user: `/admin/users/[id]/edit`
- [x] Form: name*, account code (read-only), email*, phone*, role*, status, address, and an internal-note textarea (reuses `components/ui/TextField`)
- [x] Client validation (`features/admin/validation.ts`) with error styling from `Components.png`. The first invalid field gets focus. Mock save notice, or "Không có thay đổi nào để lưu." when nothing changed (the button stays enabled, as designed).
- [x] Side cards: "Quyền theo vai trò" (changes with the selected role), the "Bảo mật tài khoản" callout, and "Gửi đặt lại mật khẩu" (demo)
- [x] Hủy (back to detail) / Lưu thay đổi (header button submits the form through `form=`)
- [x] Fix: `app/globals.css` `:focus-visible` and `::selection` read `--brand` directly, so focus rings are teal in Admin (they were blue). The source compiles correctly with Tailwind; the running dev server needs a restart to pick up the CSS change.
- [x] Browser check as Admin at 1440 and 320: error state, focus, role card, save notice, and Hủy navigation
- [x] **🛑 Commit checkpoint: Edit user**

### 2d. Roles & permissions: `/admin/users/roles`
- [x] "Nguyên tắc phân quyền" callout
- [x] Permission matrix (`mock/permissions.ts`): 9 functions × Customer/Staff/Admin with counts from the user data. Customer and Staff cells are native, labelled checkboxes. The fixed Admin column is a labelled teal check, because browsers paint disabled checkboxes grey, unlike the design.
- [x] "Lưu phân quyền" mock save and the legend
- [x] Tests: KH0001 detail values, every user resolves a detail, validation rules, permission toggling keeps Admin fixed and does not mutate defaults
- [x] Browser check as Admin at 1440 and 320
- [x] **🛑 Commit checkpoint: Roles & permissions**

## 3. Products

### 3a. Product list: `/admin/products`
- [x] Mock (`mock/products.ts`): products SP0001–SP0006 plus deterministic filler, so the counts reach 124 / 118 / 6. The 6 designed SKUs take their stock from `mock/inventory.ts`. Per-category totals match the categories design (24/14/10, 32/16/8, 20), and exactly 8 products are below threshold, matching the dashboard's `lowStockTotal`. The category tree base lives in `mock/categories.ts` (phase 4 extends it).
- [x] Header: "Xuất danh sách" (demo) and "+ Thêm sản phẩm" (demo)
- [x] Tabs: Tất cả / Đang bán / Đã ẩn. Filters: search, category (a parent includes its children), status. Table, pagination, and the VND footnote with a link to Kho hàng.
- [x] Status badge derived from data: Đã ẩn, otherwise Sắp hết hàng when stock < threshold, otherwise Đang bán. KG-CL-M and PT-HN-M therefore show "Sắp hết hàng", where `Product.png` shows "Đang bán", to stay consistent with the dashboard and inventory warnings.
- [x] Browser check: tabs, filters, empty state + reset, paging, 320px
- [x] **🛑 Commit checkpoint: Product list**

### 3b. Product detail: `/admin/products/[sku]`
- [x] Image card: main image plus its thumbnail. The repo has one photo per product (none for Petkit and Whiskas, which get a "Chưa có ảnh" tile), so the design's 3 thumbnails can't be filled with real images.
- [x] Info card: status, sale price, cost, available stock, category path, brand, unit / weight, updated by
- [x] Tabs: Mô tả sản phẩm / Thông tin bổ sung / Lịch sử thay đổi (the last edit plus that SKU's movements from `stockHistory`)
- [x] "Ẩn sản phẩm" / "Hiện sản phẩm" (local toggle with notice) and "Chỉnh sửa"
- [x] `notFound()` for an unknown SKU (params read inside Suspense)
- [x] Browser check: hide toggle, tabs, 1440 and 320
- [x] **🛑 Commit checkpoint: Product detail**

### 3c. Edit product: `/admin/products/[sku]/edit`
- [x] "Thông tin cơ bản": name*, SKU*, brand, category* (leaf categories only), pet type, description
- [x] "Giá bán & tồn kho": price*, cost, stock*, unit, warning threshold. Money fields reformat to "450.000" on blur.
- [x] Side cards: image with "Tải ảnh lên" (demo) and the "Hiển thị" status select, "Ẩn sản phẩm", "Xóa sản phẩm" (blocked with the "đã có đơn hàng" message, or a demo notice for products without orders)
- [x] Validation (`validateProduct`, `parseAmount` in `validation.ts`) with focus on the first error, mock save, Hủy / Lưu sản phẩm
- [x] Tests: tab counts, designed first page, statuses, inventory/dashboard/category/report consistency, filters, validation
- [x] Browser check: errors + focus, formatting, delete blocked, save, Hủy, 1440 and 320
- [x] **🛑 Commit checkpoint: Edit product**

## 4. Categories

### 4a. Category tree: `/admin/categories`
- [x] Mock (`mock/categories.ts`): parent/child tree DM001–DM009 with slug, description, display order, and status. Product counts are derived from the product data (`categoryProductCount`, including children: 48/24/14/10, 56/32/16/8, 20).
- [x] Filters: search and status. A matching child keeps its parent row (shown muted) so the hierarchy stays readable. The tree table indents child rows with a child-arrow icon and marks roots with a folder. Each row has edit (link) and delete icon buttons with accessible names. Delete is refused with the reason (`categoryDeleteBlocker`: linked products or child categories).
- [x] Footnote and "+ Thêm danh mục" (demo). Names stay on one line, so at 320px the table scrolls inside its card.
- [x] Browser check: search, empty state + reset, delete blocked, 1440 and 320
- [x] **🛑 Commit checkpoint: Category tree**

### 4b. Edit category: `/admin/categories/[code]/edit`
- [x] Form: name*, code (read-only), parent (root categories only; locked with a hint when the category has children), slug, description, display order, status. `validateCategory` checks the name, slug format, and order ≥ 1.
- [x] "Thông tin liên kết" card (Danh mục con / gốc badge and parent follow the selection), the "Không thể xóa danh mục" callout when something blocks deletion, and "Xóa danh mục"
- [x] Mock save, Hủy (back to the tree) / Lưu danh mục, and `notFound()` (params read inside Suspense)
- [x] Shared `control` gains a disabled look (canvas background, muted text), matching `TextField`
- [x] Tests: tree order, derived counts, slugs, filter keeps the parent, delete blockers, validation
- [x] Browser check: parent ↔ side card, slug error + focus, save, delete blocked, Hủy, locked parent, 1440 and 320
- [x] **🛑 Commit checkpoint: Edit category**

## 5. Master data: `/admin/master-data`

- [x] Mock (`mock/master-data.ts`): pet types (5), breeds (24; each pet type's breed count comes from the breed list: 12/8/2/2/0), brands (12, taken from the products; filler brands were narrowed so the catalog uses exactly 12), units (6), shipping methods (3; fees as in `System.png`). Brand and unit product counts are derived from the product data. The product edit form now reads pet types (active only, so not "Cá cảnh") and units from master data.
- [x] Tabs with counts switch the dataset and reset the filters. The "+ Thêm …" label and column headers follow the active tab (demo).
- [x] Filters, table, and pagination. "Chi tiết →" explains that no detail screen is designed yet instead of linking to a 404. The "Dữ liệu liên quan" and "Quy ước vận hành" cards are built from the data.
- [x] Fixes: `matchesQuery` ignores spaces only for all-digit tokens (phone numbers); "ca canh" had matched "thucANHat". `TabNav` labels no longer wrap, so the tab bar scrolls at 320px.
- [x] Tests: tab counts, pet/breed and brand/unit consistency with products, unique codes, filters
- [x] Browser check: every tab, filters, empty state + reset, paging, Chi tiết notice, product edit options, 1440 and 320
- [x] **🛑 Commit checkpoint: Master data**

## 6. Orders: `/admin/orders`

- [x] Mock (`mock/orders.ts`): every Staff order (same objects and IDs, `#PA261012018` …) plus 9 earlier orders in the period, so all 17 period orders are covered, including `#PA261002031` linked from user KH0001's activity. Every cancellation request's order exists. Packing orders show "Đang đóng gói" (new info tone) but belong to the "Chờ xử lý" tab.
- [x] Tabs (no counts, as designed): Tất cả đơn / Chờ xử lý / Đang giao / Hoàn thành / Đã hủy. Search (order ID with or without #, customer, phone) and status select in the "Danh sách đơn hàng" card apply as you type. `?q=` pre-fills the search, so dashboard and user-activity links open the right order.
- [x] Populated table: MÃ ĐƠN / KHÁCH HÀNG / TỔNG TIỀN / TRẠNG THÁI / THAO TÁC, with pagination and a count pill. "Chi tiết →" explains that there is no admin order-detail screen.
- [x] Empty state: "Không tìm thấy đơn hàng" with "Xóa bộ lọc". Loading state: skeleton, disabled export and filters. Error state: "Thử lại". Each has its designed card footer and footnote.
- [x] "Xuất đơn hàng" (demo) and the period footnote
- [x] Shared fix: `Badge` never wraps ("Đang đóng gói" broke onto two lines)
- [x] Tests: Staff orders shared, linked orders exist, tab grouping covers every order, filters
- [x] Browser check: all 4 states vs `Order.png`, tabs/status/search, empty + reset, dashboard and user links, 1440 and 320
- [x] **🛑 Commit checkpoint: Orders**

## 7. Cancellation requests: `/admin/cancellations`

- [x] Mock: requests linked to existing order IDs, with reason, value, and requester
- [x] Tabs: Chờ duyệt / Đã chấp nhận / Đã từ chối. Search and status.
- [x] Populated table with approve/reject actions that move the row between tabs locally and show a notice
- [x] Empty state ("Chưa có yêu cầu chờ duyệt", "Xem tất cả yêu cầu"), plus loading and error states
- [ ] **🛑 Commit checkpoint: Cancellation requests**


## 8. Inventory: `/admin/inventory`

- [x] Mock: stock per SKU with threshold, available quantity, and warning, plus import/export history entries
- [x] Tabs: Tất cả sản phẩm / Sắp hết hàng / Lịch sử nhập xuất
- [x] Populated table: SKU / NGƯỠNG, SẢN PHẨM, KHẢ DỤNG, CẢNH BÁO, THAO TÁC (links to the product detail)
- [x] Empty state (RC-ZERO example), plus loading and error states. "+ Tạo phiếu nhập" (demo).
- [ ] **🛑 Commit checkpoint: Inventory**


## 9. Reports

- [x] Secondary links: Tài chính / Bán hàng / Tồn kho. `/admin/reports` redirects to finance.

### 9a. Financial report: `/admin/reports/finance`
- [x] KPI cards: gross, refunds, net, and pending reconciliation (warning). The net-revenue line chart.
- [x] Payment-channel table (BANK / VNPAY / COD) with reconciliation badges. Date chip and "Xuất Excel" (demo).
- [ ] **🛑 Commit checkpoint: Financial report**


### 9b. Sales report: `/admin/reports/sales`
- [x] Tabs: Theo sản phẩm / danh mục / nhân viên / thời gian (each re-groups the mock data)
- [x] 3 KPI cards, the "Số lượng bán theo ngày" bar chart, and the best-seller table with pagination
- [ ] **🛑 Commit checkpoint: Sales report**


### 9c. Inventory report: `/admin/reports/inventory`
- [x] 4 KPI cards. Filters: search, category, period.
- [x] Table: opening / in / out / closing / threshold / warning. Footnote formula "Tồn cuối = Tồn đầu + Nhập − Xuất", enforced by a test.
- [ ] **🛑 Commit checkpoint: Inventory report**


## 10. Notifications: `/admin/notifications`

- [x] Mock: notifications of type order, stock, and system, with read/saved flags
- [x] Tabs: Chưa đọc (n) / Tất cả thông báo / Đã lưu. Filters: search, type, status. An unread-count pill.
- [x] Populated list: mark read and save locally
- [x] Empty state ("Bạn đã đọc hết thông báo", "Xem tất cả thông báo"), loading skeleton, and error ("Lỗi kết nối", "Thử lại")
- [x] "Cài đặt thông báo" links to `/admin/system/settings`. The top-bar "Thông báo" link points here.
- [ ] **🛑 Commit checkpoint: Notifications**


## 11. System

- [x] Secondary links: Cấu hình / Chính sách / Nhật ký. `/admin/system` redirects to settings.

### 11a. Store configuration: `/admin/system/settings`
- [x] "Thông tin cửa hàng" form (currency read-only), the "Vận chuyển" toggles and free-shipping threshold
- [x] "Phương thức thanh toán" toggles and account holder, "Thông báo" toggles
- [x] "Lưu cấu hình" with validation and a mock save
- [ ] **🛑 Commit checkpoint: Store configuration**


### 11b. Store policies: `/admin/system/policies`
- [x] Policy list (đổi trả / hủy đơn / hoàn tiền / bảo mật) with a selected state and status badges
- [x] Editor: status, effective date, formatting-toolbar mock, and the content textarea. "Xem trước" (demo) and "Lưu & công bố" (mock).
- [ ] **🛑 Commit checkpoint: Store policies**


### 11c. Audit log: `/admin/system/audit-log`
- [x] Mock: log entries (time, actor, action, detail, IP, target, result)
- [x] Filters: search, action, period. Table with Thành công / Bị từ chối badges and pagination.
- [x] "Nhật ký chỉ đọc" callout and "Xuất nhật ký" (demo)
- [ ] **🛑 Commit checkpoint: Audit log**


## Review of phases 7–11 (teammate screens)

- [x] Browser review as Admin of every route at 1440 and 320, plus the `?state=` previews: no console errors, no page-level horizontal scroll, and `/admin/reports` and `/admin/system` redirect correctly
- [x] Search: cancellations, inventory, inventory history, inventory report, notifications, and audit log used a local `normalize()` that deleted "đ/Đ", so "Vũ Đức Long" could not be found as "duc" or "Đức". They now use the shared `matchesQuery`.
- [x] Data consistency: inventory and report categories use the category tree names (Vệ sinh & cát mèo, Đồ chơi cho chó, Phụ kiện cho chó), the Catsan sales unit is "bao" like its product, and "Lê Văn Nam" (not a staff account) is replaced by NV0003 Hoàng Gia Bảo
- [x] Audit log: pagination showed "/ 1.842 bản ghi" with a single page, so it now counts the shown rows. "Chi tiết" linked back to the same page with an unused `?id=` and now opens the affected record (`auditTargetHref`). The target column no longer uses a monospace font.
- [x] Cancellations: the order ID links to `/admin/orders?q=…`. Approve and reject buttons and the timestamps no longer wrap, and the headers are uppercase as in `Order.png` (inventory headers too).
- [x] Store settings: the browser's native `required` check blocked the Vietnamese error, so the form is now `noValidate`, with inline errors, `aria-invalid`, and focus for the store name and the contact email format
- [x] Header buttons on notifications, settings, and policies are 48px like the other Admin headers
- [x] Tests: đ/accent search on the teammate filters, audit link targets resolve, and report and inventory categories, units, and staff agree with products and users

## 12. Final verification

- [ ] Extend `tests/admin-mock.test.mjs`:
  - [ ] tab counts match the rows
  - [ ] lookups and `notFound` inputs
  - [ ] filter functions
  - [ ] inventory formula
  - [ ] cross-screen values agree (dashboard KPIs = reports, low-stock count = inventory)
- [ ] `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend exec -- tsc --noEmit`, `npm --prefix frontend run build`
- [ ] Browser pass logged in as an Admin:
  - [ ] every route
  - [ ] every `?state=` variant
  - [ ] widths 320 / 768 / 1024 / 1440
  - [ ] keyboard navigation
  - [ ] no console errors
- [ ] Confirm that a Staff session gets `/forbidden` on `/admin/*`, and that the Staff screens are visually unchanged
- [ ] Update `frontend/design.md` (Admin shell now implemented; SCOPE-01) if anything changed
- [ ] **🛑 Commit checkpoint: Admin UI complete**

## Decisions made (change before starting if you disagree)

1. Screens with no design (order detail, create user, create product) are **not invented**. Their buttons show a demo notice.
2. Users, Reports, and System use a **secondary link row** for their sub-screens, because the sidebar has one entry per section.
3. The populated tables for Orders, Cancellations, Inventory, and Notifications are **derived from the designed column headers**, because the designs only show empty, loading, and error states.
4. `?state=empty|loading|error` stays in the code after backend integration as the hook point for real loading and error states.
