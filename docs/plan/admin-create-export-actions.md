# Admin create and export actions implementation plan

Specification: `docs/specs/admin-create-export-actions.md`

## How to use this plan

- Work through the parts in order. Products depend on master data and categories, so those come first.
- **Tick each bullet (`- [ ]` → `- [x]`) as soon as it is implemented and its check passes.** Do not batch ticks at the end, and do not tick something partly done. If a bullet has to change, edit it, tick it, and add a short note saying what differed and why.
- Each **🛑 Commit checkpoint** ends a part. Run its checks, and if they pass, commit automatically on the `adminQT` branch, where we work on the Admin role with an assigned peer.
- **Commit rules:** stage only that part's files, by name. Include the ticked plan. Never stage `handoff.md` or `.env` files. Do not push unless the request says to.
- **Before each part:** run `git fetch` and `git log HEAD..origin/adminQT`. If the peer has pushed, merge it before starting and report any overlap.
- **⚠️ Shared code:** before a bullet marked ⚠️, stop and tell the user which files it changes, because other roles use them and teammates may be editing them. Run `git merge-tree --write-tree --name-only HEAD origin/dev` and report any conflict. Continue only after the user agrees.
- Preserve each file's line endings. `backend/src/routers/admin.router.js` differs between `adminQT` and `origin/dev` only in line endings, so check `git diff --stat` after editing it.

**Checks at every checkpoint**

1. The part's focused backend test: `npm --prefix backend test -- tests/<file>`
2. `npm --prefix backend test`
3. `npm --prefix frontend test` and `npm --prefix frontend run lint`
4. `npm --prefix frontend run build`
5. A browser check logged in as Admin, at 1440 and 320 px, with no console errors and no page-level horizontal scroll

A failure already in the Part 0 baseline does not block a commit. A new failure does.

**Browser checks** use a temporary copy of the database, with the backend started by plain `node src/server.js` (not `nodemon`), because these steps write data. The Admin test account is in the git-ignored `handoff.md`.

## Design summary

**Files**

| Area | Files |
| --- | --- |
| Admin API | `controllers/admin/{user,product,category,master-data,order}.controller.js` |
| Validation | `validators/admin/{user,product,category,master-data,order}.validator.js` |
| Routes | `routers/admin.router.js`, with `/export` routes registered before `/:sku` and `/:orderCode` |
| Admin UI | `features/admin/components`, `hooks`, `services`, `validation.ts`, `types.ts` |
| Admin routes | `app/(workspace)/admin/{users,products,categories}/new/page.tsx`, `app/(workspace)/admin/orders/[orderCode]/page.tsx` |
| Shared, ⚠️ | `controllers/catalog.controller.js`, `features/auth/firebase-client.ts`, `features/auth/auth-actions.ts`, `features/admin/utils/export-excel.ts` |

**Creating a Staff account**

```
Admin submits → POST /users
  1. Validate. A bad request stops here, before Firebase is touched.
  2. Firebase createUser with a random password.   Email exists → 409 on email.
  3. User.create with role staff.                  Failure → delete the Firebase account, then 503.
  4. Audit, then return the new account.
Browser → Firebase sendPasswordResetEmail          Failure → account stays; show "Gửi lại".
```

## Decisions made (change before starting if you disagree)

1. **"Thêm người dùng" creates Staff only,** as UC36 and UC37 describe. Customers register themselves.
2. **The Admin never sees a password.** A new Staff member sets one from a Firebase email. No backend mail service is needed.
3. **Pages for products, users, and categories, and a modal for master data.** The pages match the existing edit pages. Master data has few fields and should keep the Admin on the current tab.
4. **"Chi tiết →" on master data and orders, and "Gửi đặt lại mật khẩu", are included.** They are placeholders on these screens, and a record that cannot be corrected after creation is a trap.
5. **Master data stays reference data.** Adding "Hamster" does not add it to the product form or storefront, because the product validator and catalog use `dog`, `cat`, `all`. Changing that belongs with the storefront owner.
6. **Exports are built in the browser** from a JSON endpoint, reusing `downloadExcelCsv`, with a 5,000-row limit.
7. **The Admin order page is read-only.** Staff process orders, and cancellation approval is on the teammate's screen.
8. **Master data names have no unique index,** to avoid stopping the server on a database with existing duplicates. The controller checks them, and the small race is accepted.
9. **Image upload is out of this plan,** because someone else is building it. New products start with no images, and "Tải ảnh lên" on the edit page keeps its notice until that work lands.

## Part 0: Prepare

- [x] ⚠️ Merge `origin/dev` into `adminQT`. It brings the flat categories (no `parentId`), the SePay payment work, and the removal of `Order.shippingFee` from the total check. `git merge-tree` reported no file conflicts on 2026-11-05. Check that vouchers still work, because `common/order-pricing.js` and `createOrder` were written before that total check changed.
  - Note (2026-11-07): merged as `31b0450` with no conflicts, including Dũng's `a91bec0` and `ab12271` from 2026-11-05. Voucher ordering still works. 7 voucher tests fail only because they still expect a `shippingFee` field, which `dev` removed. The other 3 failures are a real change: Dũng's `684c266` made `GET /vouchers/public` list every active voucher, including private, expired, and used-up ones, and also return `_id`. This waits for the user and Dũng to decide. It is not fixed in this plan.
- [x] Run the four test, lint, and build commands, and record every existing failure here as the baseline.
  - **Baseline after the merge (2026-11-07):**
  - Backend: `app.test.js` (1 test, 429 rate limit; the limiter in `app.js` was already commented out before the merge). `seed.test.js` fails 13 tests even when run alone, because `scripts/seed.js` adds a 30.000 ₫ shipping fee to the order total, which the new total check in `order.model.js` from `dev` refuses. So `npm run seed` is broken on `dev`, but `seed:admin` is a separate script. `voucher-order.test.js` fails 10 tests, explained in the note above.
  - Frontend tests: 110 of 110 pass.
  - Lint: 40 errors and 34 warnings, none in the six screens of this plan. The Admin files with errors are the teammate's (`finance-report-view`, `sales-report-view`, `inventory-report-view`, `inventory-view`, `notifications-view`, `store-settings-view`).
  - Build: fails type checking with 3 errors, none in Admin code: `app/(workspace)/staff/orders/[id]/page.tsx:247`, `features/cart/services/cart.service.ts:100` (`shippingFee`), and `features/checkout/index.tsx:174` (`sepay`). Next stops at the first failing file, so check later builds for type errors in our own files with `npx tsc --noEmit`.
- [x] Mark `docs/specs/admin-backend.md` (Non-goals) and `docs/plan/admin-backend.md` (Decisions 7 and 10) as replaced by this plan for these actions.
- [x] Run `npm --prefix backend run seed:admin` against the temporary database, so Dữ liệu nền has rows. The local database shows 0 on every tab because it has not been seeded.
  - Note: moved to the start of Part 1's browser check, because the temporary database is created there. It is ticked here only to show that it was moved.
- [x] 🛑 **Commit checkpoint:** baseline recorded, merge committed. `chore - merge dev and record admin actions baseline`

## Part 1: Thêm danh mục

**Backend**

- [x] Add `categoryCreateSchema` to `validators/admin/category.validator.js`, sharing field rules with `categoryPatchSchema`. Add `petType` (`dog`, `cat`, `both`) to both schemas.
- [x] Add `createCategory` to `controllers/admin/category.controller.js`: next `DM###` code, retry on a code clash up to 3 times, default display order, reuse of the duplicate check, and audit `category.create`.
- [x] Add `POST /categories` to the router, and `petType` to `categoryDetail` and the edit PATCH.
- [x] Test in `backend/tests/admin-category-create.test.js`: success, field errors, duplicate name and slug, code clash retry, audit entry, and 401/403/CSRF.
  - Note: `admin-category-edit.test.js` also changed, because the detail now returns `petType`.

**Frontend**

- [x] Add `createCategory` to `services/categories.ts`, and a `slugFromName` helper with `đ → d` and accent removal to `validation.ts`, with a test in `frontend/tests/admin-create-forms.test.mjs`.
- [x] Split the shared fields out of `category-edit-form.tsx` into `category-form-fields.tsx`, adding the pet type select. The edit page must look the same apart from that select.
- [x] Add `hooks/use-category-create.ts`, `components/category-create-form.tsx`, and `app/(workspace)/admin/categories/new/page.tsx`. The slug follows the name until the Admin edits it. Success returns to the list with the new row visible.
- [x] Replace the `DemoNotice` in `admin/categories/page.tsx` with a link, and change the subtitle to "Tổ chức sản phẩm theo danh mục."
- [x] Make the temporary database copy, and run `npm --prefix backend run seed:admin` against it, so Dữ liệu nền has rows (moved from Part 0). Do not run `npm run seed`, which fails since the merge.
  - Note (2026-11-08): copied to `pet_supplies_admin_check`, which now has 43 master data rows. The local `pet_supplies` was not changed.
- [x] Browser check: create a category, see it in the list and audit log, try a duplicate, and pick it in the product edit form.
  - Result: 17 checks passed at 1440 and 320 px. They covered client and server errors, the slug following the name, the confirmation and new row, the pet type on the edit page, and the new category in the product form. The audit log page is the teammate's, so the `category.create` entries were checked in the database instead. Console: only the login page's expected 401 from `/auth/me`.
  - Found: the local database was never migrated, so its 5 older categories have no code or display order. A new category gets order 1 and sorts before them. `npm --prefix backend run migrate:admin` fixes this.
- [x] 🛑 **Commit checkpoint:** `admin - create categories`
  - Checks: backend 861 passed, with the same 24 baseline failures. Frontend tests 113/113. Lint and build show the same baseline problems, and none are in changed files.

## Part 2: Dữ liệu nền modal

**Backend**

- [x] Add create and patch schemas to `validators/admin/master-data.validator.js`. `petTypeCode` is only for breeds and `fee` only for shipping methods. Each is required there and refused elsewhere.
- [x] Add code generation to `controllers/admin/master-data.controller.js`, matching the seed's format, and move `codeFrom` from `scripts/seed-admin.js` to a shared helper. Retry on a clash.
  - Note: the generator lives in `common/master-data-code.js` with `codeFrom`, so the seed and the API share it.
- [x] Add `createMasterData`: name check per kind (and per pet type for breeds), active pet type check, and audit `masterData.create`.
- [x] Add `getMasterData`, returning the row plus `blocker` and `renameBlocked`, and return `petTypeCode` and `fee` in list rows.
  - Note: list rows were left unchanged. The modal loads the row from `GET /master-data/:kind/:code`, which already returns `petTypeCode` and `fee`, and the existing list test checks the exact row shape.
- [x] Add `updateMasterData`, conditional on `updatedAt` (409 `STALE_MASTER_DATA`), refusing changes to `code` and renames of a brand or unit in use (409 `MASTER_DATA_IN_USE`).
- [x] Add `deleteMasterData`, refused for a brand or unit with products and a pet type with breeds.
- [x] Add the 4 routes, with `/master-data/options` staying before `/:kind/:code`.
- [x] Test in `backend/tests/admin-master-data-edit.test.js`: all 5 kinds, generated codes, duplicates, in-use refusals, a stale edit, a deactivated value leaving `/options`, the audit entries, and 401/403/CSRF.
  - Note: the test for a deactivated value leaving `/options` already existed in `admin-master-data.test.js`, so it was not repeated.

**Frontend**

- [x] Add create, get, update, and delete calls to `services/master-data.ts`, and `validateMasterData` to `validation.ts`, with tests.
- [x] Add `hooks/use-master-data-form.ts`, for values, per-kind validation, submit, delete, and server field errors.
- [x] Add `components/master-data-dialog.tsx`, built on `AdminConfirmDialog` with its fields as `children`. Use the labels in the spec's table, the pet type select from `/master-data/options`, and the "not applied yet" note on the pet type and shipping tabs.
  - Note: the delete confirmation is a second `AdminConfirmDialog` that replaces the form, rather than a nested dialog. A brand or unit in use shows its name field disabled with the reason.
- [x] Wire `master-data-view.tsx`: each tab's add button opens the modal for that kind, and "Chi tiết →" opens it filled in, showing the read-only code and a delete button with a second confirmation. Remove the `DemoNotice` and `setNotice` placeholder. Save and delete reload the list and tab counts.
- [x] Browser check: all 5 tabs, keyboard focus and Esc, a 320 px modal, an in-use rename refused, and a new brand and unit appearing in the product form.
  - Result (2026-11-08): 28 checks passed. They covered creating on all 5 tabs, focus on the first error, Esc, edit and delete with confirmation, a brand in use with rename and delete disabled, the duplicate name error, the new brand in the product form, and the modal at 320 px. The only console error is the 409 that the duplicate test triggers on purpose.
  - Changed: the list shows 6 rows per page and puts new rows last, so a new row was off screen. After a create, the list now searches for the new code and the notice explains how to see all rows again.
- [x] 🛑 **Commit checkpoint:** `admin - add, edit and delete master data`
  - Checks: backend 930 passed, with the same 24 baseline failures. Frontend tests 114/114. Lint and build show only the baseline problems.

## Part 3: Sản phẩm

### 3a. Thêm sản phẩm

- [ ] Add `productCreateSchema` to `validators/admin/product.validator.js`, sharing field rules with `productPatchSchema`: 1–20 variants, and distinct SKUs reported on the repeated row, as `variants.<index>.sku`.
- [ ] Add `createProduct` to `controllers/admin/product.controller.js`: resolve categories, check SKUs, map a duplicate-key error to the right SKU, record an `adjust` movement per variant with stock above 0, and audit `product.create`. A failed movement is logged and does not undo the product, as in `recordMovement`.
- [ ] Add `POST /products` to the router.
- [ ] Test in `backend/tests/admin-product-create.test.js`: one and several variants, duplicates in the request and in the database, an unknown category, the movements, the audit entry, and 401/403/CSRF.
- [ ] Check with `npm --prefix backend test -- tests/admin-inventory-report.test.js`, and add a case showing starting stock keeps closing = opening + in − out.
- [ ] Split the shared sections out of `product-edit-form.tsx` into `product-form-fields.tsx`, leaving its image section and "Tải ảnh lên" notice in place. The edit page must look the same.
- [ ] Add `validateProductCreate`, `hooks/use-product-create.ts`, `components/product-create-form.tsx`, `components/product-variants-field.tsx` (add and remove rows, stacked at 320 px), and `app/(workspace)/admin/products/new/page.tsx`. The new page has no image section. Success opens the first variant's detail page.
- [ ] ⚠️ Fix the storefront fallback for a product with no images. `controllers/catalog.controller.js` uses `/images/products/default.png` on lists, and that file does not exist, so the image breaks. On the product page it falls back to the Royal Canin photo, showing the wrong product. Add a neutral `default.png`, and use it on the product page too (lines 265 and 269).
- [ ] Replace the "Thêm sản phẩm" `DemoNotice` in `admin/products/page.tsx` with a link.
- [ ] Browser check: create a product with 2 variants, then see 2 list rows, its storefront page with no broken image, and its stock in the inventory report. Then repeat a SKU.
- [ ] 🛑 **Commit checkpoint:** `admin - create products`

### 3b. Xuất danh sách

- [ ] ⚠️ In `features/admin/utils/export-excel.ts`, used by the teammate's reports, extract a pure `buildCsv`, add the formula guard for text cells only, and make `period` optional. Test in `frontend/tests/admin-create-forms.test.mjs`, including that numbers and a `+84` phone formatted by `formatPhone` stay readable.
- [ ] Move the filtering out of `listProducts` into a shared function, and add `exportProducts` plus `GET /products/export` before `/products/:sku`, with the 5,000 limit, `truncated`, and audit `product.export`.
- [ ] Test in `backend/tests/admin-exports.test.js`: filters apply, all pages are included, the limit, no `cost` in the response, the route is not taken for a SKU, and 401/403.
- [ ] Move the page header's actions into `ProductsList`, because the filter state lives in that client component. Add `hooks/use-export.ts`, with the pending state and the empty and truncated notices, and replace the "Xuất danh sách" `DemoNotice`.
- [ ] Browser check: export with a filter, then open the file and compare it with the list.
- [ ] 🛑 **Commit checkpoint:** `admin - export products`

## Part 4: Người dùng

- [ ] ⚠️ Move `features/auth/firebase-client.ts` to `lib/`, and add `lib/password-reset.ts` holding `sendPasswordReset`. Update the imports in `features/auth`, which keeps exporting it. This keeps `features/admin` from importing another feature. `frontend/tests/auth-api.test.mjs` must pass unchanged.
- [ ] Add `userCreateSchema` to `validators/admin/user.validator.js`, sharing the name, phone, and note rules with `userPatchSchema`, plus a lowercase email. Unknown keys such as `role` are refused.
- [ ] Add `createUser` to `controllers/admin/user.controller.js`, following the flow in the design summary. Map `auth/email-already-exists` to 409 on `email`, `auth/invalid-email` to a field error, and anything else to 503 `AUTH_UNAVAILABLE`. Set `termsAcceptedAt` to the creation time, because the schema requires it. Audit `user.create`, with no password.
- [ ] Add `POST /users` to the router.
- [ ] Test in `backend/tests/admin-user-create.test.js`, with Firebase mocked: success with role `staff` whatever the body says, the password absent from the response and audit entry, a duplicate email, the Firebase account deleted when the insert fails, Firebase unavailable, and 401/403/CSRF.
- [ ] Add `createUser` to `services/users.ts`, `validateUserCreate`, `hooks/use-user-create.ts`, `components/user-create-form.tsx`, and `app/(workspace)/admin/users/new/page.tsx`. After creation, show a panel with the account code, whether the email was sent, "Gửi lại", and a link to the account.
- [ ] Replace the "Thêm người dùng" `DemoNotice` in `admin/users/page.tsx` with a link.
- [ ] Wire "Gửi đặt lại mật khẩu" in `user-edit-form.tsx` to `lib/password-reset.ts`, with pending and error states, disabled while the account is locked.
- [ ] Browser check, which creates a real Firebase account: use an address at `example.com`, confirm the screen states, a duplicate email, and the 320 px layout, then delete the account from Firebase and the temporary database. Ask the user for a real inbox to confirm the password email and Staff sign-in (acceptance criterion 4).
- [ ] 🛑 **Commit checkpoint:** `admin - create staff accounts and send password reset`

## Part 5: Đơn hàng

### 5a. Xuất đơn hàng

- [ ] Move the filter building out of `listOrders` into a shared function, and add `exportOrders` plus `GET /orders/export`, with the columns in the spec, the 5,000 limit, `truncated`, and audit `order.export`, because the file holds customer data.
- [ ] Add cases to `backend/tests/admin-exports.test.js`: tab, status, and search apply, orders still being created are left out, customer names resolve as in the list, and 401/403.
- [ ] Add `exportOrders` to `services/orders.ts`, and replace the "Xuất đơn hàng" `DemoNotice` in `orders-view.tsx` using `use-export.ts`.
- [ ] Browser check: export a filtered tab, and confirm the Vietnamese text and formula guard in the file.
- [ ] 🛑 **Commit checkpoint:** `admin - export orders`

### 5b. Order detail page

- [ ] Add a code validator to `validators/admin/order.validator.js`, and `getOrder` plus `GET /orders/:orderCode` to `controllers/admin/order.controller.js`, after the export route. Include the fields in the spec, with `paidAmount` and `needsReview` from the merged SePay work. Do not reuse `getStaffOrderDetail`, because it returns live stock and next statuses.
- [ ] Test in `backend/tests/admin-order-detail.test.js`: online, offline, and guest orders, an older order with a shipping fee, unknown and still-being-created orders giving 404, no raw payment data or `firebaseUid`, and 401/403.
- [ ] Add `services/orders.server.ts`, `components/order-detail-view.tsx`, and `app/(workspace)/admin/orders/[orderCode]/page.tsx`, calling `notFound()` for an unknown code. Link the customer to `/admin/users/:id` when the order has an account.
- [ ] Change "Chi tiết →" in `orders-view.tsx` to a link, and remove the `notice` state it was the last user of. Point `orderActivity.href` in `user.controller.js` at the new page, and update `tests/admin-user-detail.test.js`.
- [ ] Browser check: open an online and an offline order at both widths, and an unknown code.
- [ ] 🛑 **Commit checkpoint:** `admin - order detail page`

## Part 6: Finish

- [ ] Confirm that `DemoNotice` no longer appears in the in-scope screens: `users`, `products`, `categories`, `master-data-view`, `orders-view`, and `user-edit-form`. The only one left in `product-edit-form` is "Tải ảnh lên".
- [ ] Add the new routes to `CLAUDE.md`'s description of the Admin domain.
- [ ] Walk through acceptance criteria 1–8 in the browser, and record the results here.
- [ ] Check merges with `git merge-tree --write-tree --name-only HEAD origin/dev` and against `origin/adminQT`, and report any conflict.
- [ ] 🛑 **Commit checkpoint:** `docs - admin create and export actions results`

## Compatibility

- **No migration.** New documents use existing fields, and no index is added.
- **Teammate's screens:** only the `export-excel.ts` change touches their code, and existing reports should produce the same files apart from the formula guard.
- **Staff and Customer:** the Firebase client move must not change behavior. Their existing tests prove this.
- **Image upload owner:** `protectMutation` accepts only JSON, so an upload route needs its own Origin and CSRF check. The Next rewrite with a 5 MB file also has no test. Pass this on to them.
