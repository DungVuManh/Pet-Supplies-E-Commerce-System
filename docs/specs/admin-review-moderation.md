# Admin review moderation

## Problem

Customers post product reviews (`Review` collection) after a completed order. Admin has no screen that shows them, so a review with offensive language stays on the product page until the customer removes it.

## Scope

A new Admin screen, **Đánh giá** (`/admin/reviews`), that lists every review newest first, similar to YouTube Studio's comment list: the review on the left, the reviewed product on the right. Admin can filter, search, and delete a review.

The database is not modified: no schema field, enum value, index, or migration.

## User-visible behavior

- Sidebar entry "Đánh giá", after "Đơn hàng".
- Each row shows:
  - the customer's avatar (or initial), name, and how long ago the review was posted, with "(đã sửa)" when it was edited later;
  - the star rating, the comment (or "Không có nội dung" when empty), and up to two photo thumbnails;
  - a delete button;
  - on the right, the product's first photo and name, linking to `/admin/products/<sku>`. A review whose product no longer exists shows "Sản phẩm đã bị xóa".
- Filters: a search box (comment text, customer name, or product name, accent-insensitive) and a star filter (all, or 1–5 stars). Ten rows per page.
- Delete asks for confirmation. After it succeeds, a notice confirms the deletion and the list reloads. If the review was already gone (the customer deleted it), the notice says so and the list reloads.
- Empty, loading, and error states follow the other Admin lists.

## Requirements

1. `GET /api/v1/admin/reviews` (Admin only): query `page`, `pageSize` (≤ 100, default 10), `q`, `rating` (`all` | `1`…`5`). Returns `{ items, pagination }`, newest first.
2. `DELETE /api/v1/admin/reviews/:id` (Admin only, `protectMutation`): hard-deletes the review, recomputes the product's `ratingAvg` and `ratingCount` the same way the customer flow does, and writes an audit entry `review.delete` whose `before` holds the full review (product, customer, rating, comment, images, dates).
3. An id that is not an ObjectId, or a review that no longer exists, is `404 REVIEW_NOT_FOUND`.
4. Customer avatars that are not an `http(s)` URL or a site path (for example base64 data) are not sent; the row shows the initial instead.

## Acceptance criteria

- Guests get 401; Customer and Staff get 403 on both endpoints.
- Search and star filter narrow the list; filters combine.
- Deleting a review removes it, updates the product rating, and records the audit snapshot.
- Deleting a missing review returns 404 and writes no audit entry.
- The screen works at 1440 px and 320 px: a card list, with the product above the review on narrow screens and no sideways scrolling.

## Decisions and non-goals

- **Silent moderation.** The customer is not notified.
- **No reply.** Admin manages reviews and does not talk to customers.
- **Re-review allowed.** The customer may post again while their 30-day window is open, because blocking it would need a schema change.
- Review photos stay on Cloudinary; nothing links to them after the delete.
- Customer self-deletes are not audited; only Admin actions are.
- No hide/restore, bulk delete, or export.
- No new index. The list sorts all reviews by `createdAt` and search uses regex, which is acceptable at this project's data size.
- The customer review controller and the storefront are not changed.
