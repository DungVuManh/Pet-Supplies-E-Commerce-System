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
- [ ] Visual check against `Dashboard.png` (you)
- [ ] **🛑 Commit checkpoint: Dashboard**

## 2. Users

### 2a. User list: `/admin/users`
- [ ] Mock: users (KH*/NV* codes, join date, contact, role, status). Counts must match the tabs: 348 / 342 / 6.
- [ ] Header with "+ Thêm người dùng" (demo notice) and a secondary link to "Vai trò & phân quyền"
- [ ] Tabs: Tất cả / Customer / Staff. Filters: search, role, status. Table and pagination.
- [ ] "Quyền truy cập được kiểm soát" callout
- [ ] **🛑 Commit checkpoint: User list**

### 2b. User detail: `/admin/users/[id]`
- [ ] Account info card with status badge and `DetailList`
- [ ] KPI cards "Đơn đã hoàn thành" and "Tổng chi tiêu", the "Địa chỉ mặc định" callout, and the lock-explanation text
- [ ] "Khóa tài khoản" (danger, toggles local status with a notice) and "Chỉnh sửa" (link)
- [ ] Activity-history table
- [ ] `notFound()` for an unknown id
- [ ] **🛑 Commit checkpoint: User detail**

### 2c. Edit user: `/admin/users/[id]/edit`
- [ ] Form: name*, account code (read-only), email*, phone*, role*, status, address, and an internal-note textarea
- [ ] Client validation with error styling from `Components.png`, and a mock save notice
- [ ] Side cards: "Quyền theo vai trò" (changes with the selected role), the "Bảo mật tài khoản" callout, and "Gửi đặt lại mật khẩu" (demo)
- [ ] Hủy / Lưu thay đổi
- [ ] **🛑 Commit checkpoint: Edit user**

### 2d. Roles & permissions: `/admin/users/roles`
- [ ] "Nguyên tắc phân quyền" callout
- [ ] Permission matrix: 9 functions × Customer/Staff/Admin with counts, using native checkboxes. The Admin column is always checked and disabled.
- [ ] "Lưu phân quyền" mock save and the legend
- [ ] **🛑 Commit checkpoint: Roles & permissions**

## 3. Products

### 3a. Product list: `/admin/products`
- [ ] Mock: products SP0001–SP0006 plus filler so the counts reach 124 / 118 / 6, with SKU, category, brand, price, and status
- [ ] Header: "Xuất danh sách" (demo) and "+ Thêm sản phẩm" (demo)
- [ ] Tabs: Tất cả / Đang bán / Đã ẩn. Filters: search, category, status. Table, pagination, and the VND footnote.
- [ ] **🛑 Commit checkpoint: Product list**

### 3b. Product detail: `/admin/products/[sku]`
- [ ] Image gallery: main image plus 3 thumbnails, using the repo product images
- [ ] Info card: status, sale price, cost, available stock, category, brand, unit, updated by
- [ ] Tabs: Mô tả sản phẩm / Thông tin bổ sung / Lịch sử thay đổi
- [ ] "Ẩn sản phẩm" (local toggle) and "Chỉnh sửa"
- [ ] `notFound()` for an unknown SKU
- [ ] **🛑 Commit checkpoint: Product detail**

### 3c. Edit product: `/admin/products/[sku]/edit`
- [ ] "Thông tin cơ bản": name*, SKU*, brand, category*, pet type, description
- [ ] "Giá bán & tồn kho": price*, cost, stock*, unit, warning threshold
- [ ] Side cards: image with "Tải ảnh lên" (demo) and the "Hiển thị" status select, "Ẩn sản phẩm", "Xóa sản phẩm" (blocked with the "đã có đơn hàng" message)
- [ ] Validation and mock save, Hủy / Lưu sản phẩm
- [ ] **🛑 Commit checkpoint: Edit product**

## 4. Categories

### 4a. Category tree: `/admin/categories`
- [ ] Mock: parent/child tree DM001–DM009 with product counts and status
- [ ] Filters: search and status. The tree table indents child rows with a folder or child-arrow icon. Each row has edit (link) and delete (demo, blocked when it has products) icon buttons with accessible names.
- [ ] Footnote and "+ Thêm danh mục" (demo)
- [ ] **🛑 Commit checkpoint: Category tree**

### 4b. Edit category: `/admin/categories/[code]/edit`
- [ ] Form: name*, code (read-only), parent, slug, description, display order, status
- [ ] "Thông tin liên kết" card, the "Không thể xóa danh mục" callout when linked products exist, and "Xóa danh mục"
- [ ] Mock save, Hủy / Lưu danh mục, and `notFound()`
- [ ] **🛑 Commit checkpoint: Edit category**

## 5. Master data: `/admin/master-data`

- [ ] Mock: pet types (5), breeds (24), brands (12), units (6), shipping methods (3)
- [ ] Tabs with counts switch the dataset. The "+ Thêm …" label follows the active tab (demo).
- [ ] Filters, table, and pagination. The "Dữ liệu liên quan" and "Quy ước vận hành" cards.
- [ ] **🛑 Commit checkpoint: Master data**

## 6. Orders: `/admin/orders`

- [ ] Mock: orders reusing the Staff order shape and IDs (`#PA261012018` …) so the two workspaces agree
- [ ] Tabs: Tất cả / Chờ xử lý / Đang giao / Hoàn thành / Đã hủy. Search and status select in the "Danh sách đơn hàng" card.
- [ ] Populated table: MÃ ĐƠN / KHÁCH HÀNG / TỔNG TIỀN / TRẠNG THÁI / THAO TÁC
- [ ] Empty state: "Không tìm thấy đơn hàng" with "Xóa bộ lọc". Loading state: skeleton, disabled export. Error state: "Thử lại".
- [ ] "Xuất đơn hàng" (demo) and the period footnote
- [ ] **🛑 Commit checkpoint: Orders**

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
