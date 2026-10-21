# Staff workspace UI specification

## Problem

Staff currently has only a placeholder dashboard. Implement the nine frontend screens supplied in `StaffScreen` so the workspace can be reviewed and navigated before backend domain APIs exist.

## Scope

Implement these authenticated Staff routes:

| Screen | Route |
| --- | --- |
| Dashboard | `/staff/dashboard` |
| Order list | `/staff/orders` |
| Order detail | `/staff/orders/[id]` |
| Product list | `/staff/products` |
| Product detail | `/staff/products/[sku]` |
| Edit product | `/staff/products/[sku]/edit` |
| Inventory list | `/staff/inventory` |
| Sales statistics | `/staff/sales` |
| Personal performance | `/staff/performance` |

Use one responsive Staff shell with sidebar, top bar, current shift information, active navigation, and authenticated account controls. Preserve the exact-role server authorization already used by the Staff dashboard.

## Data and behavior

- Staff identity comes from the authenticated session. Do not mock identity or bypass `requireDashboardUser("staff")`.
- Orders, products, inventory, metrics, charts, and activity are typed frontend mock data.
- Product images reuse repository assets under `frontend/public/images/products/`.
- List search, tabs, and filters update visible mock rows without backend requests.
- List/detail/edit links use Next.js navigation and valid mock identifiers.
- The edit-product form updates local component state only and displays an explicit mock success notice. Cancel returns to product detail.
- Export/create/update-status actions that have no backend capability display a clear demo notice or update local mock state; they must not imply persistence.
- The sidebar cancellation item routes to the order list filtered to cancellation-related data; no separate cancellation screen is invented because no supplied design exists.
- Charts use semantic HTML/SVG, keyboard-focusable bars with accessible labels/tooltips, and an adjacent data table or list so values do not depend on color or hover.

## Visual requirements

- Follow the supplied 1440×1024 designs: 232px desktop sidebar, 72px top bar, blue Staff brand, white surface, subtle borders, compact cards/tables, and role-neutral Inter typography.
- Reuse semantic tokens from `app/globals.css`. Add semantic success/warning/status tokens instead of scattering hex colors through JSX.
- Desktop tables may scroll horizontally within their own region. The page must not create global horizontal scrolling.
- Under desktop width, replace the fixed sidebar with an accessible mobile navigation control and let cards/tables reflow.
- Use native links, buttons, inputs, selects, tables, headings, labels, and status regions.

## Acceptance criteria

1. All nine routes render within the same Staff shell and direct URLs are protected by the existing Staff role check.
2. Every sidebar item and primary list/detail/edit action has a working navigation target or explicit mock-only feedback.
3. Order/product/inventory list controls visibly filter the mock rows.
4. Dynamic detail routes handle unknown IDs/SKUs with a not-found response.
5. Charts remain understandable by keyboard and without color; their source values are available textually.
6. Layouts match the supplied desktop hierarchy and remain usable at 320, 768, 1024, and 1440px.
7. Frontend tests, lint, and production build pass, and the routes are exercised in a browser.

## Non-goals

- Backend order, product, inventory, cancellation, analytics, export, or offline-order APIs.
- Persistent mutations, server pagination, uploads, or real report downloads.
- A cancellation-request screen not represented by the supplied designs.
- Admin workspace changes.
