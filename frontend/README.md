# Petly frontend

Next.js App Router, React, TypeScript, and Tailwind CSS. Implemented screens:
`Customer/Product/Home`, `Customer/Auth/Login`, and `Customer/Auth/Register`.

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
- `/login`: customer sign-in UI.
- `/register`: customer registration UI.

These pages run independently of the backend and MongoDB.

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
  auth/                       Auth components, form hook, validation
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
Components; only the interactive forms and their hook use the client boundary.
Add future customer pages under `(customer)` to reuse storefront chrome; put
shared controls in `components/ui` and feature-specific behavior in `features`.

## Frontend behavior

- Inline field errors, required fields, focus on the first invalid field, and
  accessible feedback. Errors update while correcting a submitted form.
- Sign-in accepts email or Vietnamese phone numbers. Registration validates name,
  phone, email, the password guidance in Figma, confirmation, and consent.
- Valid submission shows an availability notice. It does **not** authenticate,
  create an account, call an API, or save credentials or the remember-me choice.
- Forgot-password displays the support contact; no reset request is sent.
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

When integrating authentication later, replace the preview notice branch in
`use-auth-form.ts` with the API flow and server validation. Client validation is
for user feedback only and must not be used as a security boundary.

## Checks

Use Node.js 24+ (also required by the backend):

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Validation tests use Node's built-in test runner without additional dependencies.
Manually verify all routes at 320, 768, 1024, and 1440px, plus blank submission,
invalid email/phone, password mismatch, missing consent, auth navigation, public
home access, accent-insensitive search, category/empty results, repeated cart
adds, item removal, and dialog focus/Escape behavior.

The home layout follows the screenshot supplied on 2026-10-21 because the live
Figma MCP read was rate limited. Original product photos/icons were downloaded
from asset URLs obtained during the earlier successful Figma read.

Design source: https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP
