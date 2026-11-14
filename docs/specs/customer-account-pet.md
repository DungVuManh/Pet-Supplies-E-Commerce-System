# Customer Account & Pet Management Specification

## Problem

Customer users who sign in to Petly currently have no interface to view or manage their personal profile, saved shipping addresses, or pet profiles. As specified in `docs/SRS.md` (§7.1 UC05, UC06) and the Figma design tokens in `frontend/design.md`, customers need a cohesive, responsive account area to manage their personal details, addresses, and pets.

## Scope

Implement customer account features under the public storefront shell (`app/(customer)`), sharing `StorefrontHeader` and `StorefrontFooter`:

| Screen / Area | Route | Actor / Guard |
| --- | --- | --- |
| Account overview / Profile | `/account` and `/account/profile` | Authenticated Customer |
| Shipping addresses | `/account/addresses` | Authenticated Customer |
| Pet profiles | `/account/pets` | Authenticated Customer |

### 1. Customer Profile (UC05 / T-ACC-01)
- Display user full name, phone number, email address (read-only per SRS rule 9: email modifications require a separate procedure and are locked at v1), and account creation date.
- Allow editing `fullName` (2–100 characters) and `phone` (valid Vietnamese phone number format).
- Provide clear submit state, field-level inline validation, and confirmation message `MSG09` ("Thông tin của bạn đã được cập nhật." / "Your information has been updated.").

### 2. Shipping Address Management (UC06 / T-ACC-02)
- Display a list of saved shipping addresses using dedicated Address Cards.
- Address Card details:
  - Recipient name and contact phone number.
  - Full address breakdown (`street`, `ward`, `district`, `province`).
  - Blue pill status badge for "Mặc định" (Default address) as specified in `design.md` §3.1 / §5 (`Default Address xanh dương`).
  - Actions: "Đặt làm mặc định" (Set as default), "Chỉnh sửa" (Edit), "Xóa" (Delete with confirmation modal).
- Add/Edit Address modal dialog:
  - Accessible dialog with trap-focus, Escape to close, backdrop click.
  - Form fields: Recipient name, Phone number, Province/City, District, Ward, Street address, and "Đặt làm địa chỉ mặc định" checkbox.
  - Enforce at most one default address per customer (BR / CR-05).

### 2.1 Checkout Address
- When checkout loads, determine whether the customer is signed in using the existing auth state.
- For a signed-in customer, load their saved addresses through `GET /api/v1/account/addresses` and prefill the default address. If no address is marked default, use the first saved address.
- The signed-in customer can choose to change the checkout address by opening a form and entering a different delivery address. Save the new address to that customer's address book through `POST /api/v1/account/addresses`, then use the saved address for the current order. Do not replace or overwrite another saved address.
- If the signed-in customer has no saved addresses, show the address-entry form.
- If the visitor is a guest, show the address-entry form without requesting protected account endpoints. Preserve guest checkout; guest-entered addresses are used for the order but are not saved to an account address book.
- Show loading and API error states explicitly; do not silently replace failed requests with a placeholder address.
- Submit the selected or entered recipient, phone, street, ward, district, and province as the order's shipping address; do not use placeholder address fields.

### 3. Pet Profile Management (Customer/Pet)
- Display a list of registered pets using dedicated Pet Cards as specified in `design.md` §5 (`Card: Product, Category, Pet, Address...`).
- Pet Card details:
  - Pet name, species (Chó / Mèo), breed (Giống loài), date of birth / age formatted clearly.
  - Pet avatar badge or representative pet iconography.
  - Actions: "Chỉnh sửa" (Edit), "Xóa" (Delete with confirmation dialog).
- Add/Edit Pet modal dialog:
  - Form fields: Pet name, Species (Dog / Cat selection), Breed (optional text), Date of Birth (`dob`).
  - Form validation: Name and species are required.
- Empty state with clear illustration/iconography and a "Thêm thú cưng đầu tiên" call-to-action button.

### 4. Navigation & Account Shell
- Create an `AccountShell` providing unified navigation:
  - Sidebar on desktop (≥ 1024px) / Horizontal scrollable tab bar on mobile/tablet (< 1024px).
  - Navigation links:
    - 👤 Thông tin tài khoản (`/account/profile`)
    - 🐾 Thú cưng của tôi (`/account/pets`)
    - 📍 Sổ địa chỉ (`/account/addresses`)
- Update `frontend/features/auth/components/account-menu.tsx` for Customer role:
  - Include quick links to "Thông tin tài khoản", "Thú cưng của tôi", "Sổ địa chỉ" before the "Đăng xuất" action.
- Route protection:
  - Unauthenticated visitors attempting to access `/account/*` are redirected to `/login?redirect=/account`.

## Data and Behavior

- Customer identity is verified through Firebase session cookies via Express (`/api/v1/auth/me`).
- Backend REST endpoints under `/api/v1/account`:
  - `GET /api/v1/account/profile`: Returns current user's profile.
  - `PUT /api/v1/account/profile`: Updates `fullName` and `phone`.
  - `GET /api/v1/account/addresses`: Returns user's saved addresses.
  - `POST /api/v1/account/addresses`: Adds a new address.
  - `PUT /api/v1/account/addresses/:id`: Updates an existing address.
  - `DELETE /api/v1/account/addresses/:id`: Deletes an address.
  - `PATCH /api/v1/account/addresses/:id/default`: Sets address as default.
  - `GET /api/v1/account/pets`: Returns user's pet profiles.
  - `POST /api/v1/account/pets`: Adds a new pet profile.
  - `PUT /api/v1/account/pets/:id`: Updates a pet profile.
  - `DELETE /api/v1/account/pets/:id`: Deletes a pet profile.
- All endpoints enforce ownership (`userId: req.user._id`), role check (`requireAuth`), and CSRF protection on mutations.

## Visual Requirements (per `design.md`)

- **Palette**: Use semantic tokens `--color-brand` (`#2563EB`), `--color-brand-subtle` (`#EFF6FF`), `--color-ink` (`#172033`), `--color-muted` (`#64748B`), `--color-line` (`#E2E8F0`), `--color-surface` (`#FFFFFF`), `--color-canvas` (`#F8FAFC`).
- **Typography**: Inter font, Vietnamese locale, headings 20–24px/600, labels 14px/500, body 14px/400.
- **Controls**: 48px height controls, 8px radius for buttons/inputs, 12–16px radius for cards, 100px pill radius for status badges.
- **Responsive**: 320px, 768px, 1024px, 1440px without horizontal scroll on the viewport.
- **Accessibility**: Visible focus ring, keyboard navigation for dialogs, semantic HTML buttons/labels, ARIA dialog roles.

## Acceptance Criteria

1. Authenticated customers can view and update their full name and phone number, with validation and toast/inline feedback.
2. Saved addresses can be created, edited, deleted, and toggled as default (with at most 1 default).
3. Checkout prefills a signed-in customer's default saved address, saves a newly entered replacement address to their address book and uses it for the current order, and displays an entry form for guests or customers without saved addresses. Guest-entered addresses are not persisted.
4. Pet profiles can be created, edited, and deleted with species and breed options.
5. Non-authenticated users are redirected to `/login` for account routes; guest checkout remains available.
6. Visual hierarchy matches `design.md` with no raw hex colors scattered in JSX.
7. Frontend build, lint, and unit tests pass.
8. Backend tests for account endpoints pass with 100% assertions met.

## Non-goals

- Email address modification (out of scope for v1 per SRS rule 9).
- Integration with external pet microchip/pedigree registries.
- Advanced delivery carrier address auto-completion APIs.
