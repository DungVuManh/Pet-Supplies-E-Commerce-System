# Voucher system specification

Plan: `docs/plan/voucher-system.md`
SRS: UC18 Apply Promotion Code, UC39 Manage Promotions, BR-09, BR-10, BR-11, BR-23, MSG16, MSG17, MSG32, T-CHK-02, T-ADM-04

## Problem

The store cannot run discounts. The pieces that exist do not work together:

- The `Promotion` model and 4 seeded codes exist, but nothing reads them, and no screen manages them.
- The cart only accepts `PETLY10`, which is hard-coded in `use-cart-page.ts`.
- The checkout page has no code field, and its discount line is commented out.
- The homepage voucher bar advertises `PETJOY10`, `FREESHIP`, and `PET50K`, which are hard-coded and redeem nothing.
- **`createOrder` reads `discount` and `shippingFee` from the request body.** Anyone can post their own discount today. BR-11 requires the backend to calculate these.

## Scope

- An Admin page, **Quản Lí Voucher**, to create, edit, turn on or off, and delete vouchers.
- Customers and guests apply one voucher at checkout, in both the cart flow and Buy Now.
- The backend alone decides whether a voucher applies and how much it takes off.
- The homepage voucher bar and the `/voucher` page list only public vouchers that can be redeemed now.

## User-visible behavior

### Admin

| Action | Behavior |
| --- | --- |
| List | Tabs: Tất cả, Đang chạy, Sắp diễn ra, Đã kết thúc, Đã tắt. Search by code or name. Shows the value, validity, uses, and total discount given. |
| Create | Code, name, type, value, optional cap, minimum order, start and end, usage limit, once per customer, show on homepage. |
| Edit | Everything, except that code, type, and value lock after the first use. |
| Turn on or off | Takes effect on the next quote or order. Orders already placed keep their discount. |
| Delete | Only if never used, after confirmation. A used voucher can only be turned off. |

Staff and Customer accounts get 403 on every voucher management API, and `/forbidden` on the page (BR-23).

### Customer and guest

1. Enter a code in the cart or at checkout, then press "Áp dụng".
2. A valid code shows MSG17 and a discount line, and the total updates. Any other code shows MSG16, whatever the reason.
3. The code carries from the cart to checkout, and can be removed.
4. Placing the order charges the discounted total, and the discount appears on the result page, order history, and Staff and Admin order views.
5. If the voucher stopped applying or its amount changed before the order is placed, no order is created. The customer sees why and the new total, and confirms by placing the order again.

## Requirements

### Discount rules

- `percent`: `floor(subtotal × value / 100)`, then limited by `maxDiscount` when set. `fixed`: `value`.
- The discount never exceeds the goods subtotal. It never applies to shipping.
- All amounts are integer VND, and rounding always favors the store.
- A voucher applies only when all of these hold (BR-10): turned on, `startAt ≤ now < endAt`, subtotal ≥ `minOrderAmount`, usage limit not reached, and not already used by this customer if `oncePerCustomer` is set.
- Prices come from the database, never from the client, and exclude hidden products.
- One voucher per order.

### Usage counting

- Reserving a use is atomic, so concurrent orders can never exceed `usageLimit` or the once-per-customer rule.
- The deployment is standalone MongoDB with no transactions, so a failed order gives its reservation back through compensating writes. If a crash interrupts this, a use may stay consumed. It can never be over-spent.
- Cancelling an order gives its use back exactly once.
- A customer is identified by account, or by normalized phone number for a guest.

### Records

- `Order.discount` and `Order.promotionCode` are the snapshot (BR-09). Editing or deleting a voucher never changes a placed order.
- Every Admin change is audited (CR-11).

### Messages

| Case | Message |
| --- | --- |
| MSG16, any failed code | "Mã giảm giá không hợp lệ hoặc không áp dụng được cho đơn hàng này." |
| MSG17, applied | "Đã áp dụng mã giảm giá." |
| MSG32, duplicate code | "Mã voucher đã tồn tại." |

Public responses never reveal why a code failed, so the API cannot be used to discover codes or their state. The checkout may add one exception: a valid code below its minimum order may state the minimum, because the customer can act on it.

## Acceptance criteria

1. A forged `discount` or `shippingFee` in `POST /orders` has no effect on the order.
2. An Admin can create a voucher that a guest then redeems, with the correct total stored on the order.
3. With one use left, two simultaneous orders produce exactly one discounted order.
4. Cancelling an order, even twice, returns its use exactly once.
5. Expired, not-yet-started, turned-off, used-up, and below-minimum vouchers are all refused, at quote and at order.
6. An order placed without a voucher behaves exactly as it does today.
7. Non-Admin roles cannot reach any management API or the page, and every mutation needs the CSRF token.
8. Package tests pass, apart from failures already recorded on `dev`, and a browser check covers both flows at 1440 and 320 px.

## Edge cases

- Cart changes after a code is applied: the quote runs again on the new items.
- A 100% voucher leaves a total of 0 on free-shipping orders, and the order is still created.
- `usageLimit` cannot be set below `usedCount`.
- Existing promotion documents have no `usedCount` and must behave as zero.
- Codes are compared uppercase and trimmed, so `petly10` matches `PETLY10`.
- An unpaid online order keeps its use until it is cancelled.

## Non-goals

- Free-shipping vouchers. `FREESHIP` leaves the homepage bar.
- Vouchers limited to categories, products, or specific customers, and stacking several vouchers. The `eligibility` field stays unused.
- Vouchers at the Staff in-store sale screen.
- Bulk code generation and vouchers sent by email.
- Fixing the unrelated order gaps: cancellation with no ownership check, and `POST /orders` with no CSRF check. These are flagged in the plan.
