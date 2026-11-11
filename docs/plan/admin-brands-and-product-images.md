# Admin brands page and product images implementation plan

Specification: `docs/specs/admin-brands-and-product-images.md`

## How to use this plan

- **Tick each bullet (`- [ ]` → `- [x]`) as soon as it is implemented and its check passes.** If a bullet has to change, edit it, tick it, and add a short note.
- Each **🛑 Commit checkpoint** ends a part. Run its checks, and if they pass, commit on `adminQT` without pushing. Stage files by name.
- Checks at every checkpoint: the part's focused tests, `npm --prefix backend test`, `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and a browser check at 1440 and 320 px on the temporary database `pet_supplies_admin_check`. Only failures beyond the Part 0 baseline block a commit.
- Shared files are avoided. The upload guard and upload client are new files, not edits to `auth.controller.js` or `lib/api-client.ts`.

## Decisions made

1. **Brands reuse the master data API.** No new routes; the brand pages call `/admin/master-data` with `kind=brand`.
2. **The other master data kinds lose their screen** but keep their data, which the product form still reads.
3. **Uploads go to Cloudinary first**, and the product stores the URLs when the form is saved, so a cancelled form changes nothing on the product.
4. **The upload guard is a new middleware**, `common/middlewares/upload-guard.js`. It repeats the Origin and CSRF checks of `protectMutation` for `multipart/form-data` and runs before `multer`.

## Part 0: Prepare

- [x] Merge `origin/dev` into `adminQT`. `git merge-tree` showed no conflicts on 2026-11-11, and none of its changes touch Admin code.
  - Merged as `433d75a` (Quang's customer voucher wallet, Dũng's storefront brand filter).
- [x] Run the checks and confirm the baseline is unchanged.
  - **New baseline after the merge (2026-11-11):** backend fails 18 tests: `app.test.js` 1, `seed.test.js` 13, `voucher-order.test.js` 3, and `models.test.js` 1, because Quang's new `CustomerVoucher` model is not in that test's list. Frontend tests 119/119. Lint shows 57 errors and 43 warnings, the increase coming from merged teammate code. **The build now passes.**
  - The user limited images to Admin pages on 2026-11-11; storefront and other roles stay with teammates.

## Part 1: Thương hiệu page

- [x] Add brand service functions and types, with list, get, create, update, and delete over the master data API with `kind=brand`.
- [x] Add `hooks/use-brands-list.ts` (search, status, paging, delete with confirmation) and `components/brands-list.tsx`, modelled on the category list.
- [x] Add `hooks/use-brand-form.ts`, `components/brand-form.tsx` (new and edit modes), and the pages `/admin/brands`, `/admin/brands/new`, and `/admin/brands/[code]/edit`, with a server fetch that shows not-found for an unknown code.
  - Note: `GET /admin/master-data/:kind/:code` now also returns `productCount` for brands and units, so the edit page shows the count directly.
- [x] Rename the sidebar entry to "Thương hiệu" at `/admin/brands`, and make `/admin/master-data` redirect there.
- [x] Remove the master data screen code: `master-data-view.tsx`, `master-data-dialog.tsx`, `use-master-data.ts`, and `use-master-data-form.ts`.
- [x] Browser check: create, search, edit, deactivate, a duplicate name, a brand in use that cannot be renamed or deleted, delete, the new brand in the product form, and the old URL redirecting.
  - Result (2026-11-11): 16 checks passed, at 1440 and 320 px. The only console error is the 409 that the duplicate test triggers on purpose.
- [x] 🛑 **Commit checkpoint:** `admin - brands page replaces master data`
  - Checks: backend 1025 passed with the same 18 baseline failures, frontend tests 119/119, lint at the baseline count, and the build passes.

## Part 2: Product photo upload

- [ ] Add `common/middlewares/upload-guard.js`: allowed Origin, `multipart/form-data`, and the CSRF pair, using `cookieSettings` from `auth.middleware.js`.
- [ ] Add `controllers/admin/upload.controller.js` and `POST /admin/uploads/product-images`: the guard, `multer` in memory (5 MB, 8 files), a first-bytes check for JPEG, PNG, and WebP, upload to `petjoy/products`, 503 without keys, and 400 for `multer` limit errors.
- [ ] Add `images` to the product create and patch schemas with the URL rule, to `updateProduct` and its audit, and to `createProduct`.
- [ ] Test in `backend/tests/admin-product-images.test.js`, with Cloudinary mocked: valid files, a renamed non-image, oversize, too many, no files, missing CSRF, wrong Origin, the wrong role, no keys, and a foreign URL refused on save.
- [ ] Add `lib/api-upload.ts`: a fresh CSRF token, `FormData`, no `Content-Type`, and the same response envelope as `api-client.ts`.
- [ ] Add `uploadProductImages` to `services/products.ts`, `hooks/use-product-images.ts` (upload, remove, make main, move, client checks for type, size, and count), and `components/product-images-field.tsx`.
- [ ] Use it on the product edit page in place of the "Tải ảnh lên" demo notice, sending `images` only when they changed.
- [ ] Browser check, with real Cloudinary: upload a photo of about 4 MB through the Next rewrite, make it main, remove another, save, and see it in the Admin and on the storefront. Then try a renamed text file and a file over 5 MB.
- [ ] 🛑 **Commit checkpoint:** `admin - upload and manage product photos`

## Part 3: Photos on the new product page

- [ ] Add the photo field to `product-create-form.tsx` and send `images` on create.
- [ ] Browser check: create a product with 2 photos and see the main one on its Admin detail page and storefront page.
- [ ] 🛑 **Commit checkpoint:** `admin - photos on new products`

## Compatibility

- No migration. `Product.images` already exists.
- `CLAUDE.md` gets one line on the upload route and the brand page in the final commit.
