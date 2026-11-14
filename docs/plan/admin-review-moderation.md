# Plan: Admin review moderation

Spec: [docs/specs/admin-review-moderation.md](../specs/admin-review-moderation.md). No schema change; only Admin files plus one new shared helper.

## Backend

- [x] `backend/src/common/product-rating.js`: `recomputeProductRating(productId)`, the same calculation as the private helper in `controllers/review.controller.js` (a copy, so the customer controller stays untouched).
- [x] `backend/src/validators/admin/review.validator.js`: list query (`listQueryShape` with `pageSize` default 10, `rating` `all`|`1`…`5`).
- [x] `backend/src/controllers/admin/review.controller.js`:
  - `listReviews`: search builds `$or` of comment regex, matching product ids (name), and matching user ids (full name); `product.sku` is the first variant's SKU, since Admin product pages are keyed by variant SKU; `paginate(Review, …)`; then loads the page's products (`sku name images`) and users (`fullName avatarUrl`) in two queries.
  - `deleteReview`: ObjectId check, `findById`, `deleteOne` (0 deleted → 404), recompute rating, `recordAudit("review.delete")` with the snapshot.
- [x] Mount `GET /reviews` and `DELETE /reviews/:id` in `routers/admin.router.js`.
- [x] `backend/tests/admin-reviews.test.js`: access, list row shape, search, star filter, avatar filtering, delete (+ rating recompute + audit), 404s.

## Frontend

- [x] `features/admin/types.ts`: `ReviewFilter`, `AdminReviewRow`.
- [x] `features/admin/services/reviews.ts`: `listReviews`, `deleteReview`.
- [x] `features/admin/hooks/use-reviews-list.ts`: `useAdminList` + delete confirmation (brands list pattern).
- [x] `features/admin/components/reviews-list.tsx`: filter form, `DataTable` with review and product columns, `AdminConfirmDialog`.
- [x] `app/(workspace)/admin/reviews/page.tsx` and the "Đánh giá" sidebar entry in `admin-shell.tsx`.

## Verification

- [x] `npm --prefix backend test`
- [x] `npm --prefix frontend test`, `run lint`, `run build`
- [x] Headless Chrome at 1440 and 320 with the Admin test account, on a copy of the database for the delete.

Result (2026-11-14): `admin-reviews.test.js` 18/18; the 18 failures in `app`, `models`, `seed`, and `voucher-order` tests occur without this change too. Frontend 118/118 tests and build pass; the remaining lint errors are in other screens. Browser check on a database copy: filter, search, delete with audit entry, and rating recalculation (4.5 from 4 and 5) all worked.
