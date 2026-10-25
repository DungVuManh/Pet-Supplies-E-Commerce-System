# Customer Account & Pet Implementation Plan

## Overview

This plan details the implementation of Customer Profile, Shipping Addresses, and Pet Profiles (`Customer/Account` and `Customer/Pet`) across both backend and frontend.

## Affected Architecture & Files

### Backend
1. **`backend/src/validators/account.validator.js`**: Zod schemas for profile update, address CRUD, and pet profile CRUD.
2. **`backend/src/controllers/account.controller.js`**: Handlers for profile, address, and pet endpoints.
3. **`backend/src/routers/account.router.js`**: Express router mounting `/api/v1/account/*` with `readCookies`, `requireAuth`, `protectMutation`.
4. **`backend/src/app.js`**: Mount `/api/v1/account` router before 404 handler.
5. **`backend/tests/account.test.js`**: Integration tests verifying auth, ownership, validation, and error states.

### Frontend
1. **`frontend/next.config.ts`**: Add `"account"` to proxy rewrites.
2. **`frontend/features/account/types.ts`**: TypeScript definitions for Profile, Address, and PetProfile.
3. **`frontend/features/account/api.ts`**: Frontend API client with CSRF protection and error handling.
4. **`frontend/features/account/components/`**:
   - `account-shell.tsx`: Navigation sidebar & mobile tabs.
   - `profile-form.tsx`: Full name and phone number editing with feedback.
   - `address-card.tsx`: Address item presentation with default badge.
   - `address-modal.tsx`: Modal for adding/editing addresses.
   - `pet-card.tsx`: Pet profile presentation card with species icon and age.
   - `pet-modal.tsx`: Modal for adding/editing pets.
   - `confirm-dialog.tsx`: Accessible dialog for destructive actions.
5. **`frontend/app/(customer)/account/`**:
   - `layout.tsx`: Layout with client-side Auth guard and AccountShell.
   - `page.tsx`: Redirect or default to `/account/profile`.
   - `profile/page.tsx`: Customer profile page.
   - `addresses/page.tsx`: Shipping addresses page.
   - `pets/page.tsx`: Customer pets page.
6. **`frontend/features/auth/components/account-menu.tsx`**: Add Customer links to account pages.
7. **`frontend/tests/account.test.mjs`**: Frontend test suite for account validation and formatters.

## Implementation Steps

### Phase 1: Backend API & Verification
1. Create `backend/src/validators/account.validator.js` with Zod schemas:
   - Profile: `fullName` (2–100 chars), `phone` (regex VN phone).
   - Address: `recipientName`, `phone`, `province`, `district`, `ward`, `street`, `isDefault`.
   - Pet: `name`, `species` (`dog` | `cat`), `breed` (optional), `dob` (optional date).
2. Create `backend/src/controllers/account.controller.js` handling:
   - `getProfile`, `updateProfile`
   - `listAddresses`, `createAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`
   - `listPets`, `createPet`, `updatePet`, `deletePet`
3. Create `backend/src/routers/account.router.js` and mount in `backend/src/app.js`.
4. Create and run `backend/tests/account.test.js` to ensure 100% test coverage for all endpoints.

### Phase 2: Frontend API Client & Next.js Proxy
1. Update `frontend/next.config.ts` rewrite rules.
2. Create `frontend/features/account/types.ts` and `frontend/features/account/api.ts`.

### Phase 3: Frontend Components & Pages
1. Build `AccountShell` with responsive sidebar and tab bar.
2. Build `ProfileForm` with validation and success toasts (`MSG09`).
3. Build `AddressCard`, `AddressModal`, and `ConfirmDialog`.
4. Build `PetCard` and `PetModal`.
5. Assemble pages under `frontend/app/(customer)/account/`.
6. Update `AccountMenu` in the header for easy customer navigation.

### Phase 4: Verification & Quality Gate
1. Run backend tests: `npm --prefix backend test`.
2. Run frontend tests: `npm --prefix frontend test`.
3. Run TypeScript check: `npm --prefix frontend exec -- tsc --noEmit`.
4. Run ESLint: `npm --prefix frontend run lint`.
5. Run build: `npm --prefix frontend run build`.
