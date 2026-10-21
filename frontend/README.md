# Petly frontend

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
- `/staff/products`, `/staff/products/[sku]`, `/staff/products/[sku]/edit`: mock catalog list, detail and local edit flow.
- `/staff/inventory`, `/staff/sales`, `/staff/performance`: mock inventory and reporting screens.
- `/admin/dashboard`: Admin only; public profile and workspace empty state.
- `/forbidden`: wrong-role access explanation and home link.

Home and the guest cart remain public. Authentication requires Firebase,
the Express backend and MongoDB. Follow [authentication setup](../docs/authentication.md)
to configure both environment files and enable Email/Password in Firebase.

## Structure

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
roles to `/forbidden`, and service failures offer retry. Next rewrites auth/staff/admin requests to
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
