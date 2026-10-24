# Petjoy frontend

Next.js App Router, React, TypeScript, and Tailwind CSS. Implemented screens:
`Customer/Product/Home`, shared sign-in/registration, a mock-data Staff operations workspace, and the Admin dashboard shell.

Read [design.md](design.md) before changing UI. It defines the Figma-backed
design tokens, role-specific layouts, reusable component rules, responsive
behavior, accessibility constraints, and review checklist.

## Run

From the repository root:

```powershell
npm run dev:frontend
```

- `/`: public product home, accessible without an account or redirect to login.
- `/?q=thuc+an&category=cat`: shareable search/category filter on the home catalog.
- `/login`: shared customer/staff/admin sign-in UI.
- `/register`: customer registration UI.
- `/forgot-password`: email password recovery.
- `/staff/dashboard`: Staff-only operations overview with mock metrics, revenue and pending orders.
- `/staff/orders` and `/staff/orders/[id]`: mock order search, filtering and detail/status flow.
- Staff order detail now reads MongoDB and supports protected status updates through
  confirmation, preparation and manual shipping, with cancellation before preparation.
  Shipping details are optional; Staff cannot mark delivery complete. See the
  [status contract](../docs/specs/staff-order-status.md).

Optional status UI regression check after a production build:
`node frontend/tests/staff-order-status-browser.mjs` with `PLAYWRIGHT_MODULE_PATH`
pointing to an installed Playwright module. Ports 3023/3133 must be free. The test
uses only fixture APIs, checks confirmation, repeated submits, server refresh,
conflicts, manual shipping and lost responses, then requires compiled Tailwind CSS
for responsive checks. A Webpack fallback can verify interactions but cannot pass
the stylesheet gate because Tailwind is configured only for Turbopack.
- `/staff/products`: catalog and inventory list with physical, reserved and available quantities, stock alerts and filters; uses the Staff API with a local mock fallback.
- `/staff/products/[sku]`, `/staff/products/[sku]/edit`: real product detail and
  protected updates to physical stock, shared visibility and one description.
  Saving returns to detail; stale snapshots require reload. These pages do not
  fall back to mock data. See [product update contract](../docs/specs/staff-product-update.md).
- Optional edit UI regression: after building, run
  `node frontend/tests/staff-product-edit-browser.mjs` with `PLAYWRIGHT_MODULE_PATH`.
  It uses fixture APIs on ports 3024/3134, verifies validation/save/re-edit/conflicts/
  lost responses/error retry, then requires compiled Tailwind for responsive checks.
- `/staff/inventory`: redirects to `/staff/products`; inventory is managed from the product screen.
- `/staff/sales`, `/staff/performance`: mock reporting screens.
- `/admin/dashboard`: Admin only; public profile and workspace empty state.
- `/forbidden`: wrong-role access explanation and home link.

Optional product/inventory browser check after a production build:
`node frontend/tests/staff-products-browser.mjs` (set `PLAYWRIGHT_MODULE_PATH` to
an installed Playwright module). It uses isolated fixture data on ports 3131 and
3021, checks the old inventory redirect, quantities, stock filters and keyboard
reset, then verifies compiled styles and responsive layouts. Screenshots go to
`frontend/.next/staff-products-browser/`. The stylesheet check requires the
configured Turbopack build; the Webpack fallback does not run the Tailwind loader.

Home and the guest cart remain public. Authentication requires Firebase,
the Express backend and MongoDB. Follow [authentication setup](../docs/authentication.md)
to configure both environment files and enable Email/Password in Firebase.

## Structure

### Staff in-store sales

`/staff/orders/new` uses the existing Staff guard/shell and feature components in
`features/staff/orders/`. Its relative API calls use the existing Staff rewrite.
Customers and sellable SKUs come from protected backend lookups; there is no mock
fallback. Pending request IDs (UUID only, no contact/cart information) are kept in
sessionStorage so a reload can recover a committed receipt without creating twice.
Do not replace backend price/stock validation with frontend calculations.

The backend currently supports standalone MongoDB with sequential writes and
best-effort compensation; incomplete requests do not return successful receipts.
Process crashes or uncertain writes may require manual reconciliation. See the
[spec](../docs/specs/staff-order-create.md). The form currently supports CASH only,
immediate pickup, zero delivery charge and no promotions.

Optional browser check after a production build:

```powershell
# Supply an independently installed Playwright module; requires Chrome.
$env:PLAYWRIGHT_MODULE_PATH = '/absolute/path/to/playwright'
node frontend/tests/staff-sale-browser.mjs
```

Run from the repository root. The script starts a fixture API on 3001 and the
built frontend on 3020; both ports must be free. It uses fake data and a fake
session accepted only by that isolated fixture API, not production Firebase.
It checks both customer modes, empty/error/retry, reload recovery, keyboard and
320/768/1024/1440px layouts. Screenshots go to `.next/staff-sale-browser/`.

```text
app/
  layout.tsx                   Vietnamese locale, local Inter font, metadata
  globals.css                  Semantic color and typography tokens
  (customer)/layout.tsx        Shared storefront header and footer
  (customer)/page.tsx          Public product home
  (customer)/(auth)/layout.tsx Shared auth layout and welcome panel
  (customer)/(auth)/login/     Thin login route
  (customer)/(auth)/register/  Thin registration route
components/
  storefront/                 Storefront header and footer
  ui/                         Button, TextField, Checkbox
features/
  auth/                       Firebase actions, session API/provider, forms and validation
  catalog/                    Sample products, filtering, hero/category/product cards
  cart/                       In-memory guest cart, provider, accessible preview dialog
lib/                          Shared currency formatting
public/
  images/                     Original companion photo from Figma
  icons/                      Original search and benefit SVGs from Figma
app/fonts/                    Self-hosted Inter and its OFL license
```

Route groups organize code without adding segments to URLs. Keep shared UI
independent of auth-specific validation. Pages and layouts remain Server
Components; interactive forms, account controls and providers use the client boundary.
Add future customer pages under `(customer)` to reuse storefront chrome; put
shared controls in `components/ui` and feature-specific behavior in `features`.

## Frontend behavior

- Inline field errors, required fields, focus on the first invalid field, and
  accessible feedback. Errors update while correcting a submitted form.
- Sign-in accepts email/password. Registration validates name,
  phone, email, the password guidance in Figma, confirmation, and consent.
- Firebase handles credentials. Express exchanges the ID token for an HttpOnly
  session cookie; the client SDK uses memory-only persistence and signs out after
  that exchange. Passwords and tokens are not saved in browser storage.
- Successful sign-in/registration returns to home. The header shows the customer
  name, role-specific dashboard link for Staff/Admin, and sign-out action. Reload/focus reads `/api/v1/auth/me`; connection
  failures offer retry instead of pretending the user is signed out.
- Remember-me stores the session cookie for 14 days. Otherwise it is a browser
  session cookie whose signed token expires after 24 hours.
- Registration/profile-save retries are safe; existing profiles cannot be
  overwritten. Sign-in prompts for a missing profile if Firebase account creation
  previously succeeded without MongoDB persistence.
- Forgot-password requests a Firebase reset email and uses a generic confirmation.
  Email verification is not required in this iteration.
- Home uses a guest greeting and generic categories, with no invented customer
  name, pets, notifications, or prefilled cart count.
- Search ignores Vietnamese accents and case. Category filters combine with the
  search query; filters live in the URL and empty results offer a reset link.
- Header search works from auth pages too and returns to the public catalog.
- Guests can add/remove sample products and view quantities and totals in the
  cart dialog. Cart state survives client-side navigation within the customer
  layout, resets on a full reload, and is not stored or sent to a backend.
- Product details, checkout, offers, and policy pages are not implemented. There
  is no fake checkout or payment action. Auth links work between both forms.
- Desktop preserves Figma's two-column layout. Below 1024px the welcome panel is
  hidden and the form becomes a single column; mobile navigation scrolls within
  its own row. The footer stays below the content rather than covering it.

Client validation is for user feedback. Express validates profile data and derives
identity from verified Firebase tokens. Dashboard Server Components check the
session and exact role through Express before rendering, with a Suspense boundary
for request-time access. Staff/Admin shells are outside the storefront layout;
Admin uses scoped teal brand tokens. Staff domain screens currently share typed frontend mock data; only identity and role checks use Express. Missing sessions redirect to `/login`, wrong
roles to `/forbidden`, and service failures offer retry. Next rewrites auth/staff/admin/cart/catalog/order requests to
`BACKEND_ORIGIN` (default `http://127.0.0.1:3001`); private credentials belong only
in the backend. Analytics, phone OTP, Google sign-in and checkout are not included.

## Checks

Use Node.js 24+ (also required by the backend):

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Validation tests use Node's built-in test runner without additional dependencies.
Optional browser smoke checks run with `node tests/rbac-browser.mjs` against the
running frontend (`TEST_BASE_URL`, default `http://localhost:3000`). They require
Playwright and Chrome; `PLAYWRIGHT_MODULE_PATH` can point to an existing Playwright
installation without adding a project dependency. The script uses isolated browser
contexts and only mocks `/auth/me` in the browser: it verifies role-specific menu
links, keyboard access, responsive layout and that fabricated client roles cannot
bypass server redirects. Screenshots go to `.next/rbac-browser/screenshots`.
It does not replace live authorized-dashboard checks with Firebase/MongoDB.
Manually verify all routes at 320, 768, 1024, and 1440px, plus blank submission,
invalid email/phone, password mismatch, missing consent, auth navigation, public
home access, accent-insensitive search, category/empty results, repeated cart
adds, item removal, and dialog focus/Escape behavior.

The home layout follows the screenshot supplied on 2026-10-21 because the live
Figma MCP read was rate limited. Original product photos/icons were downloaded
from asset URLs obtained during the earlier successful Figma read.

Design source: https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP
