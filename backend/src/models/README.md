# Backend models

Models implement the proposed structure in `docs/SRS.md` sections 5.2 and 5.3.
The user requested all models, including the backlog PetProfile and Wishlist.
Firebase manages credentials; there are no local password hashes, reset-token
fields, account-status changes, or separate Role collection. `User.role` accepts
`customer`, `staff`, and `admin`, defaults to `customer`, and remains immutable
through Mongoose. See [manual role assignment](../../../docs/authentication.md)
for direct MongoDB updates and the backend authorization rules.

Import models from `index.js` or their individual `.model.js` files:

```js
import { Product, Order, Setting } from "./models/index.js";
```

| Export | Collection | Main contents |
| --- | --- | --- |
| User | users | Firebase UID, public profile, and customer/staff/admin role |
| Address | addresses | User reference, recipient/address details, default flag |
| PetProfile | petProfiles | User reference, name, species, breed, date of birth |
| Category | categories | Unique name/slug, active flag |
| Product | products | Category, brand, pet type, images, variants, ratings |
| Cart | carts | Exactly one customer/guest owner, product/SKU quantities |
| Order | orders | Customer/guest contact, item/address snapshots, totals, statuses, history |
| Payment | payments | Order reference, method, amount, transaction reference, QR/result |
| Promotion | promotions | Code, percentage/fixed value, minimum order, validity, eligibility |
| Review | reviews | Product/user references, whole rating from 1 to 5, published comment |
| Wishlist | wishlists | One list per user with product references |
| Notification | notifications | User/order reference, type/channel, delivery status/error/time |
| AuditLog | auditLogs | Actor, action, target, before/after snapshots, IP, result, summary, event time |
| Setting | settings | Global low-stock threshold and flat shipping fee |
| AdminNotification | adminNotifications | Order/stock/system notice shared by all Admins, with per-Admin read/saved state |

All models use timestamps and disable buffered commands. References to users
store `User._id` (MongoDB ObjectId), not `firebaseUid`. References do not enforce
the existence, role, or ownership of the related documents.

VND amounts and inventory/quantity fields use safe integers. Variant stock cannot
be negative; reserved stock cannot exceed recorded stock. Products require at
least one variant with distinct SKUs. Cart quantities must be positive integers.

Order items retain `name`, `unitPrice`, `qty` and `variantSku`; shipping addresses
are embedded snapshots, independent of saved addresses. Document validation checks
subtotal against item snapshots and total against subtotal minus discount plus
shipping fee. Online guest orders require guest contact details; offline orders
require `createdByStaffId`. Online orders require a shipping-address snapshot;
Staff-created in-store sales do not request a delivery address. Existing offline
address snapshots remain valid. Manual shipping permits optional carrier and tracking information.

Payment methods also include `CASH` for Staff in-store sales. That creation API
explicitly records completed/paid and deducts physical stock without consuming
reserved stock, using sequential writes with Payment/AuditLog and best-effort
compensation on standalone MongoDB. CASH cannot be used for
online orders. `COD` and `ONLINE` retain their existing behavior/defaults.
Order's optional hidden creationRequestId/creationRequestHash fields support
same-intent replay; a partial unique Staff/request index leaves old orders untouched.
The optional `creationState` is `pending` while a standalone sale is being written,
and `complete` only after stock, Payment and AuditLog writes succeed. Pending
orders are hidden from Staff list/detail/summary and return no recovery receipt.
Legacy orders without this field remain visible. Failed/uncertain compensation
keeps the pending key blocked for manual reconciliation. This flow cannot provide
multi-document atomicity or automatic recovery after a process crash.

Order/payment statuses use the proposed SRS values. Defaults are `pending` for
orders, `unpaid` for COD payments, and `pending` for online payments. The schema
does not authenticate payment callbacks or enforce order-state transitions.

Promotion codes are trimmed/uppercased. Percent discounts are greater than zero
and at most 100; fixed discounts are positive integer VND amounts. End dates must
follow start dates. `eligibility` remains provider-independent Mixed data because
the SRS does not define its shape. Notification delivery statuses are `pending`,
`sent`, and `failed`; type and channel remain strings for future integrations.

Settings use `_id: "global"`, `lowStockThreshold: 5`, and `shippingFee: 0` by
default. Defaults apply when constructing a document; startup does not seed a
settings document. Audit targets use `{ collectionName, id }`; `id` is a string
so it can represent both ObjectIds and the settings ID `global`. Callers must
remove secrets from audit snapshots, payment results, and notification errors.
Admin actions write audit entries through `recordAudit()` in `src/common/audit.js`,
which strips secret-looking fields and records the request IP. `result` is
`success` (default) or `denied`; a Customer or Staff session refused on an
`/api/v1/admin` route is logged as `admin.access` with result `denied`.

`AdminNotification` entries are created through `notifyAdmins()` in
`src/common/admin-notify.js` and shared by every Admin. `readBy` and `savedBy`
hold the `User._id` of each Admin who read or saved the entry. `targetHref` must
be an `/admin` path. A failed notification never fails the triggering request.
Its sample data comes from `npm run seed:admin`, not `npm run seed`.

`createModelIndexes()` in `src/config/database.js` explicitly creates declared
indexes before startup listens, since the connection disables `autoIndex`. It
does not drop existing indexes. Unique indexes cover variant SKUs, category
names/slugs, order codes, promotion codes, wishlist owners, and the existing
Firebase UID. Partial unique indexes allow multiple non-default addresses, guest
carts without user IDs, and payment attempts without transaction references.

Model validation runs on `validate()` / `save()` / `create()`. Query updates and
bulk writes must not be treated as equivalent: cross-field document hooks do not
run on query updates, and update validation has limitations. Future controllers
must validate request fields, use appropriate document validation, and enforce
authorization, actual stock availability/reservation under concurrency, verified
payment outcomes, promotion eligibility, review purchase eligibility and
historical snapshot protection. Models do not expose API endpoints.

## Sample data

From `backend/`, run `npm run seed` with Node.js 24.x after configuring `.env`
and starting MongoDB. `src/scripts/seed.js` supports development/test only.
It reads existing User IDs/roles without creating or modifying users and requires
at least one Customer plus one Staff or Admin. It selects the lowest `_id` per
role. If prerequisites are missing, it stops before index creation or data writes.

`npm run seed:admin` (development/test only) adds Admin sample data on top of
this seed, and `npm run migrate:admin` idempotently upgrades existing documents
for the Admin backend in any environment. Neither creates users.

The seed covers every non-User, non-Admin collection: 10 categories, 52 products, 2 addresses,
2 pets, customer/guest carts, a wishlist, 4 promotions, 8 online orders (all seven
order statuses plus a guest order), corresponding payments, 2 reviews of completed
purchases, 3 notification delivery statuses, an audit log and global settings.
If a Staff exists, it also adds a completed offline order/payment. An Admin is
not used as a Staff or offline order creator. No Firebase, payment or email calls
are made; QR payloads and payment results are explicitly simulated.

The catalog is bundled in `src/scripts/data/categories.json` and `products.json`;
no Desktop paths are needed to run the seed. Its ten categories are flat. Products
belong to Dành cho chó (20), Dành cho mèo (28), Bổ sung dinh dưỡng (2 milk products)
and Thú Y (Urinary S/O and Renal); six categories currently have no products.
Category IDs come from the JSON unless a matching slug already exists, in which
case new products reference that category's persisted ID. Source `petType: "both"`
becomes `"all"`, and null `ratingCount` values use the schema's default zero.
Only schema-supported fields are imported; product `slug` and category metadata
beyond name/slug remain in the JSON.

All 52 products have descriptions based on their supplied names and package
labels, without adding unverified ingredient amounts or efficacy claims. Physical
stock is a random integer from 1 through 50, generated once and saved in JSON;
running the seed does not randomize it again. `soldCount` is absent from the JSON.

For existing products matched by the bundled SKUs, the seed updates only the
description and matching variants' physical stock, removes legacy `soldCount`,
and updates `updatedAt` only when a change is needed. Names, prices, category IDs,
active flags, reservations, extra variants and other existing fields are retained.
Products outside the 52 bundled SKUs are not changed. Full document validation runs
before an existing product update, and the write matches its read description and
variant array to avoid overwriting concurrent changes. A source stock below the
existing reserved quantity or a stale snapshot stops the seed without updating
that product. The seed does not release reservations or rewrite historical orders.

The seed reads each sample's key first and creates missing documents with `save()`.
This runs cross-field validators in document context (including promotion date
comparisons); it does not use query validation as a substitute. Category slugs,
product SKUs, user-owned unique keys and stable
sample IDs prevent duplicates across repeated runs. Other existing records and
their timestamps are preserved, including carts, wishlists and global settings.
Products that already match the JSON also retain their timestamps. New
order/payment snapshots use the persisted product prices and configured shipping
fee. Saved sample addresses are non-default to preserve the account's current
default address. Other records are identified by `SEED-` codes, stable IDs or
sample text. Samples belong to the selected real accounts and will be visible
to them when the corresponding APIs/UI are implemented. Reviews use the persisted
completed order's product IDs/SKUs, including purchases from the previous catalog.

The seed is sequential, not a multi-document transaction. If a database write
fails after preflight, already inserted samples remain; fix the cause and rerun
to add missing records and finish product synchronization. It does not refresh
promotion dates or reset other existing samples on subsequent runs. Old categories
and products are not deleted, so an existing database may contain more than the
10 categories and 52 products in this catalog.
Run one seed process at a time; unique indexes reject conflicting concurrent inserts.
Failures report the model and validation paths or numeric MongoDB error code,
without printing raw driver messages, document values or credentials.

Run `npm test` from `backend/`. Model tests validate documents and declared index
metadata; index initialization tests mock MongoDB calls. Unique-index enforcement
and concurrent writes still require integration testing against live MongoDB.

References: [Mongoose validation](https://mongoosejs.com/docs/validation.html),
[MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/).
