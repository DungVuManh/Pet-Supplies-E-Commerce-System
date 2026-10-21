# Staff workspace UI implementation plan

Specification: `docs/specs/staff-workspace-ui.md`

## Architecture

1. Add typed Staff mock data under `frontend/features/staff/` for products, orders, inventory, revenue, performance, and shared format/lookup helpers. Keep cross-screen values in one source.
2. Add a server-side Staff layout under `app/(workspace)/staff/` that calls `requireDashboardUser("staff")` once and wraps all Staff pages in the authenticated provider and shared shell.
3. Build a responsive client shell with pathname-driven active navigation, desktop sidebar, mobile disclosure navigation, top bar, shift summary, and existing account/logout behavior.
4. Build reusable Staff presentation components: page header, KPI card, status badge, table frame, demo action feedback, and accessible single-series bar chart with textual data table.
5. Replace the placeholder Staff dashboard and add list/detail/edit pages for orders and products plus inventory, sales, and performance pages.
6. Use client components only where controls mutate mock view state. Keep detail pages and route entry points as Server Components where possible.

## Route implementation order

1. `/staff/dashboard`: metrics, revenue chart, inventory attention, pending-order links.
2. `/staff/orders`: tab/search/status filters and links; `/staff/orders/[id]`: detail and local status demo action.
3. `/staff/products`: search/category/status/stock filters; `/staff/products/[sku]`: detail; `/staff/products/[sku]/edit`: local form and success feedback.
4. `/staff/inventory`: search/category/stock filters and product-detail links.
5. `/staff/sales`: mock period/granularity controls, shared revenue values, best sellers.
6. `/staff/performance`: mock period/scope controls, performance chart, quality metrics, recent activity.

## Constraints and behavior

- Keep authorization in the Staff server layout; do not replace it with mock identity or client-only checks.
- Unknown dynamic identifiers call `notFound()`.
- `#PA261012018` uses group label “Chờ xử lý” in lists and step label “Chờ xác nhận” in detail.
- Catalog visibility and inventory availability remain separate: an item can be “Đang bán” with zero stock or “Tạm ẩn” with stock.
- Cancellation sidebar navigation reuses `/staff/orders?status=cancelled` until a sourced cancellation design exists.
- Export/create actions produce explicit demo feedback. No download or persistent mutation is implied.
- Tables scroll inside their containers on narrow screens. The shell changes from fixed sidebar to mobile header/navigation.

## Verification

1. Add/update frontend Node tests for mock lookups, derived inventory values, filter behavior, and linked data invariants.
2. Run focused frontend tests during implementation.
3. Run `npm --prefix frontend test`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build`.
4. Start the frontend and backend as needed, open all nine routes in a browser, test navigation/filter/edit flows, and inspect desktop plus narrow viewports. Because routes are role-protected, use an authorized live session or a browser-level mock only if the existing smoke-test approach supports it; state any untested live-auth limitation.
