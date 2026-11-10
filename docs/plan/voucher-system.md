# Voucher system implementation plan

Specification: `docs/specs/voucher-system.md`

## How to use this plan

- Work through the steps in order. Later steps depend on earlier ones.
- **Tick each bullet (`- [ ]` → `- [x]`) as soon as it is implemented and its check passes.** Do not batch ticks at the end, and do not tick something partly done. If a bullet has to change, edit it, tick it, and add a short note saying what differed and why.
- Each **🛑 Commit checkpoint** ends a part. Run its checks, then stop for the user to commit, unless the request says to commit.
- **⚠️ Shared code:** before a step marked ⚠️, stop and tell the user which files it changes, because other roles use them and teammates may be editing them. Run `git fetch`, then `git merge-tree --write-tree --name-only HEAD origin/dev`, and report any conflicts. Continue only after the user agrees.
- Preserve each file's line endings. Some teammate files use CRLF.
- Do browser checks on a temporary copy of the database, with the backend started by plain `node src/server.js` (not `nodemon`), because these steps write data. The Admin test account is in the git-ignored `handoff.md`.

**Known failures from `dev`, not caused by this work:** `app.test.js`, `order-status.test.js`, 3 frontend type errors, and the production build. `seed.test.js` can time out under a full run, so rerun it alone.

## Design summary

**Why the existing `Promotion` model:** the SRS, the seed, and `Order.promotionCode` already use it. "Voucher" is the name in the API and on screen, and the model name stays, to avoid a pointless migration.

**Applying a voucher to an order** (no transactions, because MongoDB is standalone):

```
POST /orders { items, promotionCode, expectedDiscount, ... }
  1. Price the items from the database (already done today).
  2. Evaluate the voucher. Refuse with 409 if it fails or the amount differs from expectedDiscount.
  3. Reserve a use: conditional $inc of usedCount.      No slot left → 409, nothing to undo.
  4. Insert a PromotionRedemption.                      Unique index enforces once per customer.
                                                        Duplicate → undo step 3, then 409.
  5. Create the order.                                  Failure → undo steps 4 and 3.

Cancel: flip the redemption from active to released with a conditional update.
        Only the request that flips it decrements usedCount, so a repeat does nothing.
```

**Files**

| Area | Files |
| --- | --- |
| Rules, no database access | `backend/src/common/voucher-rules.js` |
| Reserve and release | `backend/src/common/voucher-redemption.js` |
| Admin API | `controllers/admin/voucher.controller.js`, `validators/admin/voucher.validator.js` |
| Public API | `controllers/voucher.controller.js`, `validators/voucher.validator.js`, `routers/voucher.router.js` |
| Data | `models/promotion.model.js` (changed), `models/promotion-redemption.model.js` (new) |
| Admin UI | `features/admin/{services/vouchers.ts, services/vouchers.server.ts, hooks/use-vouchers-list.ts, hooks/use-voucher-form.ts, components/vouchers-list.tsx, components/voucher-form.tsx}` |
| Admin routes | `app/(workspace)/admin/vouchers/{page.tsx, new/page.tsx, [code]/edit/page.tsx}` |
| Shared customer UI | `lib/voucher.ts` (API calls and remembered code), `components/storefront/promo-code-card.tsx` (moved from `features/cart`), because features must not import each other |

## Decisions made (change before starting if you disagree)

1. **Applies to goods only, never shipping.** Free-shipping vouchers are out of scope, so `FREESHIP` leaves the homepage.
2. **One voucher per order.**
3. **Cancelling gives the use back.** A customer who cancels can use the voucher again, even if it was once per customer.
4. **Guests can use vouchers,** as UC18 says. A guest is identified by phone number, so a guest using another number can reuse a once-per-customer voucher. This is accepted for now.
5. **Once per customer is a yes/no setting, on by default,** not a number. A yes/no can be enforced exactly by a unique index, while "N times" could be exceeded by concurrent orders.
6. **Percent values are whole numbers from 1 to 100,** with an optional cap (`maxDiscount`), for example "10%, up to 50.000 ₫". The existing model allows decimals, and the new Admin validator does not.
7. **Discounts round down to whole VND.**
8. **After the first use, code, type, and value lock.** Limits, dates, and the name stay editable. Orders are unaffected either way, because each order stores its own discount.
9. **Delete only if never used;** otherwise turn it off, so reports and orders keep a meaningful code.
10. **An end date means the end of that day in Vietnam time.**
11. **Online orders only.** The Staff in-store sale screen stays as it is.
12. **If a voucher changes before the order is placed, the order is refused,** not placed at a different price. A customer never pays an amount they did not see.
13. **The page title is "Quản Lí Voucher",** as requested, and the sidebar label is "Voucher". Other Admin text spells it "Quản lý", so tell me if you want that spelling instead.
14. **There is no Figma design for this page,** so it reuses the Admin list and edit patterns, like the product and category screens.

## 0. Preparation

- [x] Merge `origin/dev` into the working branch. A trial merge on 03/11/2026 showed no conflicts, but `order.controller.js` and `order.router.js` differ, and those are the files this feature changes. Merged on 03/11/2026 at `5128cc4`, with no conflicts. Baseline after the merge: backend fails only `app.test.js` (`seed.test.js` passes alone, `order-status.test.js` now passes), and all 95 frontend tests pass. `tsc --noEmit` must run from `frontend/`, and currently reports one error, in the generated `.next/dev/types/validator.ts`.
- [x] Tell the owners of the order and checkout code (Vũ Mạnh Dũng and quangoku) that steps 5 and 6 change `createOrder`, `cancelOrder`, the cart page, and the checkout page. Record who agreed here. The working-branch owner approved all shared steps on 03/11/2026 and will tell Dũng and quangoku. Their own agreement is not recorded yet. Nothing is pushed until the owner chooses to.
- [x] Decide with them what shipping is meant to do. The cart displays 30.000 ₫, but checkout sends none and orders store 0. This plan keeps what is charged today, 0, and stops trusting the client. Record the answer here. Answer from the working-branch owner on 03/11/2026: keep charging 0. The cart's 30.000 ₫ display stays as it is and is reported to the owners in step 7.
- [x] Confirm whether `updateStaffOrderStatus` can move an order to `cancelled`, and list every path that can. Step 5 must release the voucher on all of them. It can, from `pending` or `confirmed`. The two paths are `cancelOrder` (`PATCH /orders/:id/cancel` and `DELETE /orders/:id`, which has no status check, so it can also cancel a shipping or completed order) and `updateStaffOrderStatus` in `order-status.controller.js`. Admin's approve-cancellation is not built yet (see step 5).

## 1. Data ⚠️

Changes `models/promotion.model.js`, `models/index.js`, `scripts/migrate-admin.js`, `scripts/seed-admin.js`, `tests/seed.test.js`, `tests/models.test.js`, and `tests/admin-scripts.test.js`. `scripts/seed.js` did not need a change.

- [x] `Promotion`: add `name` (≤ 100), `maxDiscount` (optional, integer ≥ 1), `usageLimit` (optional, integer ≥ 1, empty means unlimited), `usedCount` (integer ≥ 0, default 0), `oncePerCustomer` (default true), and `isPublic` (default false). Every new field is optional or defaulted, so seeded and existing documents stay valid.
- [x] Add `PromotionRedemption` (`promotionRedemptions`): `promotionId`, `code`, `orderId`, `customerKey` (`user:<id>` or `guest:<phone>`), `discount`, `status` (`active` or `released`), `oncePerCustomer`, `releasedAt`.
- [x] Indexes: unique `{ orderId: 1 }`; unique partial `{ promotionId: 1, customerKey: 1 }` where `status: "active"` and `oncePerCustomer: true`; `{ promotionId: 1, status: 1 }`. Register the model.
- [x] Add a `promotions.usage` step to `migrate-admin.js` that sets a missing `usedCount` to 0, with `timestamps: false`. It must change nothing on a second run.
- [x] Add a `vouchers` step to `seed-admin.js` with public samples: a percent voucher with a cap, a fixed voucher with a minimum order, and one with a usage limit of 1. Do not change the 4 shared seed codes.
- [x] Update `models/README.md`.
- [x] Tests: new field rules, and both unique indexes declared. Exclude `PromotionRedemption` from the base seed test, like the other Admin-only models.

## 2. Voucher rules

Plain functions with no database access, so every rule can be tested directly.

- [x] `voucher-rules.js`: `voucherState(voucher, now)` returns `active`, `scheduled`, `expired`, `disabled`, or `exhausted`, treating a missing `usedCount` as 0. The list's "Đã kết thúc" tab joins `expired` and `exhausted`.
- [x] `calculateDiscount(voucher, subtotal)`: the percent and fixed formulas from the spec, with the cap and subtotal limits.
- [x] `evaluateVoucher(voucher, { subtotal, now })` returns `{ applies, discount, reason }`. `reason` stays server-side, except a `below_minimum` reason with the minimum amount. A discount that rounds to 0 is refused as `no_discount`, so it cannot spend a use.
- [x] `customerKey({ userId, phone })`, using the same rule as the account validator, so `0912 345 678` and `0912345678` match. The account validator keeps its inline rule, because that file is shared; `voucher-rules.js` also maps `+84` to `0`, so those two spellings are one guest.
- [x] Tests, in `tests/voucher-rules.test.js`:
  - [x] Percent rounding down (10% of 99.999 is 9.999), the cap, and fixed larger than subtotal.
  - [x] Exact boundaries: `now == startAt` applies, `now == endAt` does not, `subtotal == minOrderAmount` applies.
  - [x] Every state, and a document with no `usedCount`.
  - [x] Over random subtotals, the discount is always a whole number from 0 to the subtotal.

## 3. Admin API

Only touches `admin.router.js` and new files.

- [x] `validators/admin/voucher.validator.js`: list query, plus create and update with per-field messages using `common/field-errors.js`. Code is `^[A-Z0-9-]{3,30}$` after trimming and uppercasing. Percent is 1–100, fixed is ≥ 1, `maxDiscount` only with percent, `endAt` after `startAt`.
- [x] `GET /vouchers`: tabs by derived state, `q` on code and name (accent-insensitive), paging, tab counts, and rows with total discount given, summed from active redemptions.
- [x] `GET /vouchers/:code`: the form's data, plus `used` and `lockedFields`. 404 when unknown.
- [x] `POST /vouchers`: create. A duplicate code is 409 `DUPLICATE_VALUE` (MSG32), including a race caught by the unique index.
- [x] `PATCH /vouchers/:code`: `expectedUpdatedAt` required (409 `STALE_VOUCHER`). Changing a locked field after first use is 400 on that field. `usageLimit` below `usedCount` is 400. A no-op writes nothing.
- [x] `POST /vouchers/:code/enable` and `/disable`: conditional on the current value, with 409 on a repeat.
- [x] `DELETE /vouchers/:code`: 409 `VOUCHER_IN_USE` when any redemption or order references it, otherwise delete.
- [x] Every mutation uses `protectMutation` and `recordAudit` (`voucher.create`, `.update`, `.enable`, `.disable`, `.delete`), with before and after showing only what changed.
- [x] Add a "Quản lý voucher" row to `common/permissions.js`, Admin only, and update the row count in `tests/admin-permissions.test.js`.
- [x] Tests, in `tests/admin-vouchers.test.js`: each validation message, duplicate code, locked fields, stale edit, usage limit below used, both delete outcomes, enable/disable repeats, and audit entries. `tests/admin-access.test.js` covers guest, Customer, Staff, and CSRF automatically, because it walks the router.

## 4. Admin page: Quản Lí Voucher

Only touches `features/admin`, `app/(workspace)/admin`, and `admin-shell.tsx`. Read `frontend/design.md` first.

- [x] Add a "Voucher" sidebar entry to `admin-shell.tsx`, with a `TicketPercent` icon, after "Đơn hàng".
- [x] Add voucher types to `features/admin/types.ts`, and state labels and tones to `status.ts`.
- [x] Add `services/vouchers.ts`, `services/vouchers.server.ts`, and `hooks/use-vouchers-list.ts` on `useAdminList`.
- [x] `/admin/vouchers`, titled "Quản Lí Voucher": tabs with counts, search, a table (code and name, value as "Giảm 10%, tối đa 50.000 ₫", validity, uses as "12 / 100", discount given, status, actions), paging, the designed loading, empty, and error states, and `?state=` previews.
- [x] Row actions: edit, turn on or off, and delete, using `AdminConfirmDialog`. Delete shows the server's reason when refused. Turning off also asks for confirmation.
- [x] `/admin/vouchers/new` and `/admin/vouchers/[code]/edit` with one shared `voucher-form.tsx`: a type switch that changes the value field (% or ₫), a cap shown only for percent, date fields in Vietnam time, and a live preview such as "Đơn 500.000 ₫ giảm 50.000 ₫".
- [x] `hooks/use-voucher-form.ts`: client validation matching the server, server errors mapped to fields with focus on the first, locked fields disabled with an explanation, and a 409 reloading the newest data.
- [x] `validateVoucher` in `validation.ts`, plus unit tests in `tests/admin-vouchers.test.mjs`.
- [x] Browser check at 1440 and 320 px: create each type, every validation error, duplicate code, edit, turn off, delete, and not-found. A Staff session gets `/forbidden`, and no page-level horizontal scroll or unexpected console errors.
- [x] **🛑 Commit checkpoint: Admin voucher management.** Vouchers can be managed but do not affect orders yet, so this part is safe to merge alone.

## 5. Backend purchase flow ⚠️

**This is the main purchase flow.** Changes `order.controller.js`, `order-status.controller.js` (Staff cancellation, found in step 0), `order.router.js`, `app.js`, and `tests/orders.test.js`. Get the user's agreement first. Keep the edits small, and put new logic in new files, so merges stay simple.

### Close the hole first, as its own commit

- [x] `createOrder`: stop reading `discount` and `shippingFee` from the body. `discount` is 0 without a voucher, and `shippingFee` follows the answer from step 0.
- [x] Add a regression test: a forged `discount` and `shippingFee` do not reach the order.
- [x] **🛑 Commit checkpoint: Server-side order totals.** Worth merging early, because it fixes a live hole regardless of vouchers.

### Public APIs

- [x] Extract `priceOrderItems(items)` from `createOrder`'s existing loop, with no behavior change, so the quote and the order share one calculation. Existing order tests must pass unchanged.
- [x] `POST /api/v1/vouchers/quote`: `{ code, items, phone? }` with `optionalAuth` and `protectMutation`. Returns `{ code, name, subtotal, discount, total }`, or 422 `VOUCHER_INVALID` with MSG16, and a minimum amount only for `below_minimum`. It reserves nothing.
- [x] Give the quote its own rate limit, about 20 requests per minute per IP, because the global limiter is commented out in `app.js` and codes must not be guessable. The app does not set `trust proxy`, so behind the Next.js rewrite `request.ip` is the proxy for every customer. The key is therefore the last `X-Forwarded-For` entry when the socket is loopback, and the socket address otherwise. If Next.js and Express ever run on different hosts, this needs revisiting.
- [x] `GET /api/v1/vouchers/public`: active vouchers with `isPublic`, newest first, at most 6. Returns only code, name, type, value, cap, minimum, and end date, never usage figures. Takes an optional `limit` up to 50, for the `/voucher` page.
- [x] Mount `voucher.router.js` in `app.js` before the 404 handler, and add `vouchers` to the rewrite list in `frontend/next.config.ts`.

### Redeem and release

- [x] `voucher-redemption.js`, `reserveVoucher()`: the conditional `$inc` (state still valid, and `$expr` comparing `$ifNull: ["$usedCount", 0]` with `usageLimit`), then the redemption insert. On a duplicate key it undoes the `$inc` and reports `already_used`.
- [x] `releaseVoucher(orderId)`: a conditional flip from `active` to `released`, and only the caller that flips it decrements `usedCount`. Errors are logged and never block the cancellation.
- [x] `createOrder`: accept `promotionCode` and `expectedDiscount`, evaluate and reserve as in the design summary, store `discount` and `promotionCode`, and undo the reservation if `Order.create` fails. Refusals are 409 `VOUCHER_INVALID` or `VOUCHER_CHANGED`, returning the current amount.
- [x] Call `releaseVoucher` from `cancelOrder`, only when this request really moved the order to `cancelled`, and from every other path listed in step 0.
- [x] Leave a note in `docs/plan/admin-backend.md` phase 6 that approving a cancellation must also call `releaseVoucher`.

### Tests, in `tests/voucher-order.test.js`

- [x] No voucher: the order is unchanged from today.
- [x] Each voucher type: correct `subtotal`, `discount`, `total`, and `promotionCode`, passing the Order validator.
- [x] Each refusal: expired, scheduled, off, used up, below minimum, amount changed. No order, no reservation.
- [x] Once per customer, for an account and for a guest with a differently formatted phone.
- [x] `Order.create` fails: `usedCount` and the redemption are both restored.
- [x] Cancel twice: `usedCount` goes down exactly once, and the use can be redeemed again.
- [x] Voucher edited or deleted later: the placed order is unchanged.
- [x] **Real MongoDB, in a throwaway database:** 20 concurrent orders on a voucher with one use left produce exactly 1 discounted order, and `usedCount` is exactly 1. The in-memory stand-ins cannot prove this. Record the result here. Result on 03/11/2026, from `node tests/voucher-integration.mjs`: 1 created and 19 refused, 1 discounted order, `usedCount` exactly at the limit. The same held for a document with no `usedCount`, and for 20 orders from one guest using two spellings of a phone. 5 concurrent cancels returned the use once, and an Admin edit mid-order refused the reservation.
- [x] **🛑 Commit checkpoint: Vouchers in the order API.**

## 6. Customer checkout ⚠️

Changes `features/cart`, `features/checkout`, `features/orders`, and the homepage voucher bar. Get the user's agreement first.

- [x] `lib/voucher.ts`: `quoteVoucher()` through the shared API client, and the remembered code in `sessionStorage`, cleared after an order. API calls are in `lib/voucher-api.ts`, so the rest can be unit tested, and the shared state is in `lib/use-voucher-quote.ts`, because the cart and checkout both need it.
- [x] Move `PromoCodeCard` to `components/storefront/promo-code-card.tsx`. Add a loading state, an applied state with the discount and a "Bỏ mã" button, and replace `text-red-500` with the semantic `text-danger` token.
- [x] Cart: remove the hard-coded `PETLY10` from `use-cart-page.ts`. `dev` had removed the card from the cart page on 03/11/2026, so this also puts it back. Apply through the API, and quote again whenever the items change. The cart's guest and account paths must both work.
- [x] Checkout: add the card to the review column and restore the "Giảm giá" line in `order-review-card.tsx`, shown only when a voucher applies. Compute the displayed total from the quote.
- [x] Checkout covers Buy Now too: quote with the Buy Now item, and do not reuse a code remembered from the cart, because it belongs to different items.
- [x] Send `promotionCode` and `expectedDiscount` in `orderPayload` in `use-checkout.ts`. On `VOUCHER_INVALID` or `VOUCHER_CHANGED`, show the reason, refresh the total, and leave the cart and form intact.
- [x] A guest's phone number reaches the quote once entered, so once-per-customer is checked before they press order. If they change it later, the order step still catches it.
- [x] Order result page and order history: show the discount and code. `order-summary-sidebar.tsx` already has the field, so confirm it renders. Confirm Staff and Admin order details too. The customer order page, public order tracking, and Staff order view now show both. Admin has an order list with no detail page, so there is nothing to change there.
- [x] Homepage voucher bar: read `GET /vouchers/public`, remove the hard-coded list, and hide the bar when there are none. The homepage must still load if the request fails.
- [x] `/voucher` page (added on `dev` on 03/11/2026, after this plan was written): read `GET /vouchers/public` and remove `features/vouchers/mock-data.ts`, so every code shown can be redeemed. The 6-item limit applies only to the homepage bar. Keep the existing layout. Agreed with the working-branch owner on 03/11/2026.
- [x] Browser check as a guest and as a Customer, at 1440 and 320 px:
  - [x] Cart to order: apply, remove, invalid code, below minimum, percent with a cap, and fixed.
  - [x] Buy Now to order.
  - [x] Turn the voucher off in a second window while checkout is open: the order is refused, nothing is charged, and the customer can continue.
  - [x] Cancel the order, then see the use return on the Admin page.
  - [x] An order without a voucher works exactly as before.
- [x] **🛑 Commit checkpoint: Vouchers at checkout.**

## 7. Reports and final checks

- [ ] Sales report: fix the revenue mismatch found on 02/11/2026. Product and category revenue use `unitPrice × qty`, while the total uses order totals, so shares already reach 103.5%, and vouchers make the gap larger. Agree with Quang who changes `admin-sales.controller.js`. Not started: this needs his agreement, and it is not needed for vouchers to work.
- [ ] Finance report: confirm gross revenue is after discount, and show total voucher discount in the period if Quang agrees. Confirmed on 03/11/2026: `admin-finance.controller.js` sums order `total`, so gross revenue is after discount. Showing the total discount still waits for Quang.
- [x] Update `CLAUDE.md` (the voucher routes, and that product/cart/order "not implemented" text no longer applies to promotions), `frontend/design.md`, and `docs/specs/admin-backend.md` (Promotions are no longer a non-goal).
- [x] `npm run migrate:admin` and `seed:admin` on a copy of the local database: the second run changes nothing, and existing seeded codes work.
- [x] Checks: `npm --prefix backend test`, `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend exec -- tsc --noEmit`, and the build if `dev`'s failures have been fixed. Only the known failures listed at the top may remain. Result on 03/11/2026: backend fails only `app.test.js`, all 110 frontend tests pass, and `tsc` is clean when run from `frontend/` with current route types. The build still fails on `/orders/[id]`, because `usePathname` in the storefront header is outside Suspense, which is `dev`'s known failure. Lint reports nothing new in voucher code.
- [x] Security pass:
  - [x] Staff and Customer get 403 on every management API.
  - [x] Mutations without the CSRF token are refused.
  - [x] Quote errors do not reveal why a code failed.
  - [x] The public list exposes no usage figures.
  - [x] Forged amounts are ignored.
- [ ] Report the gaps left open to their owners: `cancelOrder` has no ownership check, so anyone with an order id can cancel it and release its voucher, and `POST /orders` has no CSRF check. `cancelOrder` also has no status check, so it can cancel a shipping or completed order and return its use. Also report the cart's 30.000 ₫ shipping display, and the hard-coded "paddy" logo on `/voucher` cards. Reported to the working-branch owner on 03/11/2026, to pass on.
- [ ] **🛑 Commit checkpoint: Voucher system complete.**
