# Admin workspace UI specification

## Problem

Admin currently has only the placeholder `WorkspaceDashboard`. Implement the Admin screens supplied in `docs/designs/Admin/` as a frontend-first workspace backed by typed mock data, so the UI can be reviewed and navigated before the Admin domain APIs exist. Backend integration is a later, separate feature.

## Scope

Implement these authenticated Admin routes:

| Area | Screen | Route | Design source |
| --- | --- | --- | --- |
| Overview | Business dashboard | `/admin/dashboard` | `Dashboard.png` |
| Users | User list | `/admin/users` | `User.png` (row 1, col 1) |
| Users | User detail | `/admin/users/[id]` | `User.png` (row 1, col 2) |
| Users | Edit user | `/admin/users/[id]/edit` | `User.png` (row 1, col 3) |
| Users | Roles & permissions | `/admin/users/roles` | `User.png` (row 2, col 1) |
| Products | Product list | `/admin/products` | `Product.png` (col 1) |
| Products | Product detail | `/admin/products/[sku]` | `Product.png` (col 2) |
| Products | Edit product | `/admin/products/[sku]/edit` | `Product.png` (col 3) |
| Categories | Category tree | `/admin/categories` | `Category.png` (col 1) |
| Categories | Edit category | `/admin/categories/[code]/edit` | `Category.png` (col 2) |
| Master data | Pet types, breeds, brands, units, shipping | `/admin/master-data` | `MasterData.png` |
| Orders | Order list | `/admin/orders` | `Order.png` (row 1) |
| Cancellations | Cancellation requests | `/admin/cancellations` | `Order.png` (row 2) |
| Inventory | Stock list | `/admin/inventory` | `Inventory.png` |
| Reports | Financial report | `/admin/reports/finance` | `Report.png` (col 1) |
| Reports | Sales report | `/admin/reports/sales` | `Report.png` (col 2) |
| Reports | Inventory report | `/admin/reports/inventory` | `Report.png` (col 3) |
| Notifications | Notification center | `/admin/notifications` | `Notification.png` |
| System | Store configuration | `/admin/system/settings` | `System.png` (col 1) |
| System | Store policies | `/admin/system/policies` | `System.png` (col 2) |
| System | Audit log | `/admin/system/audit-log` | `System.png` (col 3) |

`Components.png` and `Icons.png` define the shared controls, badges, tabs, navbar states, and the 24px icon set.

## Data and behavior

- Admin identity comes from the authenticated session through `requireDashboardUser("admin")`. The top bar and account area show the real session user, never the design's sample name "Lê Hoàng Nam".
- All business data (users, products, categories, master data, orders, cancellation requests, inventory, reports, notifications, settings, policies, audit log) is typed frontend mock data under `features/admin/`. Values that appear on several screens, such as revenue, low-stock count, and product SKUs, come from one source.
- Product images reuse `frontend/public/images/products/`.
- Tabs, search, and select filters update the visible mock rows locally. "Lọc dữ liệu" applies the filter controls. Pagination shows the design's page controls over the mock rows.
- Detail and edit links use valid mock identifiers. Unknown `[id]`, `[sku]`, or `[code]` values call `notFound()`.
- Edit forms (user, product, category, settings, policies, permission matrix) validate required fields on the client, update local state only, and show an explicit mock success notice. "Hủy" returns to the previous detail or list page.
- Create, export, upload, lock or unlock, hide, delete, approve or reject, and "send password reset" actions show a clear demo notice or change local mock state. They must not imply persistence or produce real files.
- The orders, cancellations, inventory, and notifications designs show only the empty, loading, and error states. Implement those states exactly, plus a populated state built from the same table columns. Every list screen has a review switch through `?state=empty|loading|error` so each designed state can be checked without a backend.
- Sections with several screens (Users, Reports, System) expose their sibling screens through a secondary tab-style link row under the page header, because the sidebar has one entry per section.
- Charts (cumulative revenue line, daily sales bars) use semantic SVG with accessible labels and expose their values as text.

## Visual requirements

- Follow the 1440×1024 designs: 224px sidebar, 80px top bar, Admin teal brand scoped by `[data-workspace="admin"]`, a white or canvas surface, 8px card radius, Inter typography, and Vietnamese copy as designed.
- Use the semantic tokens in `app/globals.css`. Do not put hex values in JSX. Add any missing token, such as a disabled-primary color, before using it.
- Status badges come from one central mapping: Hoạt động, Đang bán, Hiển thị, Thành công, Hoàn thành, Đã đối soát, and Đủ hàng use success. Chờ xử lý, Sắp hết hàng, and Chờ đối soát use warning. Đã khóa, Bị từ chối, and Lỗi use danger. Đã ẩn, Tạm ngưng, and Rỗng use neutral.
- Tables scroll horizontally inside their own region. The page itself never scrolls horizontally at 320, 768, 1024, or 1440px.
- Below desktop width the sidebar becomes an accessible, keyboard-operable navigation toggle, as in the Staff shell.
- Use native links, buttons, inputs, selects, textareas, checkboxes, tables, and status regions. Toggles are `button role="switch"` or checkbox inputs with labels.

## Acceptance criteria

1. Every route in the scope table renders inside one Admin shell, and direct URLs are protected by the existing exact-role Admin check.
2. Every sidebar item, secondary link, and primary list, detail, or edit action has a working navigation target or explicit mock-only feedback.
3. List filters, tabs, and search visibly change the mock rows. The empty state offers "Xóa bộ lọc", which restores the rows.
4. The loading, empty, and error states match the designs and can be reached with `?state=`.
5. Dynamic routes return not-found for unknown identifiers.
6. Chart values can be read without color and without hover.
7. Layouts match the desktop designs and remain usable at 320, 768, 1024, and 1440px.
8. `npm --prefix frontend test`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build` pass.

## Non-goals

- The Admin login and logout-confirmation designs (`Admin/Auth/`). Authentication is already implemented; the existing login and logout flow is kept.
- Backend APIs, persistence, real exports or downloads, image uploads, rich-text editing beyond a plain textarea with a formatting toolbar mock, email sending, and server pagination.
- Order detail, user creation, and product creation screens, which have no supplied design. Their entry points show demo feedback.
- Changes to the Staff or Customer screens beyond extracting shared workspace primitives without visual change.
