# Admin brands page and product images specification

## Problem

- The "Dữ liệu nền" screen manages five kinds of reference data, but the store only needs brands. Admins should manage brands the same way they manage categories: a list, a create page, and an edit page with delete.
- Admin product pages cannot add or change photos. "Tải ảnh lên" on the edit page is a demo notice, and new products start with no image. The Cloudinary keys are now in `backend/.env`.

## Scope

| Screen | Change |
| --- | --- |
| Sidebar | "Dữ liệu nền" becomes "Thương hiệu", at `/admin/brands`. `/admin/master-data` redirects there. |
| `/admin/brands` | List with search, status filter, paging, product count, edit, and delete with confirmation. "Thêm thương hiệu" opens the new page. |
| `/admin/brands/new` | Name, origin, status. The code is generated. |
| `/admin/brands/[code]/edit` | Same fields, read-only code, linked product count, delete. |
| `/admin/products/[sku]/edit` | Manage the product's photos: upload, remove, reorder, choose the main photo. |
| `/admin/products/new` | The same photo control. |

The only Admin screens that show images are the product detail and edit pages, so product photos are the only images in scope. The storefront shows brands as text, so brands get no logo.

## Requirements

### Brands

- Brands are `MasterData` rows of kind `brand`. The page uses the existing master data API with `kind=brand`, so no new routes or data are needed.
- Codes are generated from the name (`BRD-<NAME>`) and never change.
- Names are unique, ignoring case. A brand used by products cannot be renamed or deleted (409 `MASTER_DATA_IN_USE`), because products store the brand name; it can be set to inactive.
- An inactive brand leaves the product form's brand list. Products that already use it keep it.
- Edits are refused with 409 if the brand changed after the page loaded it.
- Pet types, breeds, units, and shipping methods stay in the database and keep feeding the product form, but have no screen. That is accepted.

### Product photos

- `POST /api/v1/admin/uploads/product-images` takes `multipart/form-data` with 1–8 files in the `images` field. Each file is JPEG, PNG, or WebP, checked by its first bytes, and at most 5 MB. It returns the uploaded HTTPS URLs.
- The route requires an Admin session, an allowed `Origin`, and the CSRF cookie and header pair, checked before the file is read. Upload errors return 400 with a clear message. Missing Cloudinary keys return 503 `UPLOAD_UNAVAILABLE`.
- Files go to the `petjoy/products` folder of the configured Cloudinary account.
- `images` (0–8 URLs) is accepted on product create and edit. Each URL must be on this project's Cloudinary account (`https://res.cloudinary.com/<cloud_name>/`) or an existing `/images/products/` path. The first image is the main photo. Images belong to the product, so they apply to every variant.
- An image change is audited like any other product field.
- A photo is saved only when the Admin saves the form. Removed or abandoned uploads stay on Cloudinary. That is accepted.

## Acceptance criteria

1. The sidebar shows "Thương hiệu". Brands can be listed, searched, created, edited, set inactive, and deleted unless in use, and each change is audited.
2. On the product edit page, an Admin can upload a photo, make it the main photo, remove one, and save. The new main photo shows in the Admin and on the storefront.
3. A new product can be created with photos.
4. A non-image file, a file over 5 MB, or more than 8 files is refused with a clear message, and nothing is saved.
5. Guests get 401, Customer and Staff sessions get 403, and a missing CSRF token or wrong Origin gets 403, on the upload route.
6. Backend tests, frontend tests, lint, and build show no new failures beyond the baseline.

## Non-goals

- Screens for pet types, breeds, units, or shipping methods.
- Brand logos.
- Deleting files from Cloudinary.
- Image cropping or resizing in the browser.
