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
| AuditLog | auditLogs | Actor, action, target, before/after snapshots, event time |
| Setting | settings | Global low-stock threshold and flat shipping fee |

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
require `createdByStaffId`. Each order requires a shipping-address snapshot under
BR-08. Moving to `shipping` requires carrier and tracking information.

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

The seed covers every non-User collection: 5 categories, 7 products, 2 addresses,
2 pets, customer/guest carts, a wishlist, 4 promotions, 8 online orders (all seven
order statuses plus a guest order), corresponding payments, 2 reviews of completed
purchases, 3 notification delivery statuses, an audit log and global settings.
If a Staff exists, it also adds a completed offline order/payment. An Admin is
not used as a Staff or offline order creator. No Firebase, payment or email calls
are made; QR payloads and payment results are explicitly simulated.

The seed reads each sample's key first and creates missing documents with `save()`.
This runs cross-field validators in document context (including promotion date
comparisons); it does not use query validation as a substitute. Category slugs,
product SKUs, user-owned unique keys and stable
sample IDs prevent duplicates across repeated runs. Existing records and their
timestamps are preserved, including carts, wishlists and global settings. New
order/payment snapshots use the persisted product prices and configured shipping
fee. Saved sample addresses are non-default to preserve the account's current
default address. Other records are identified by `SEED-` codes, stable IDs or
sample text. Samples belong to the selected real accounts and will be visible
to them when the corresponding APIs/UI are implemented.

The seed is sequential, not a multi-document transaction. If a database write
fails after preflight, already inserted samples remain; fix the cause and rerun
to add missing records. It does not reset existing samples or refresh their
promotion dates on subsequent runs.
Run one seed process at a time; unique indexes reject conflicting concurrent inserts.
Failures report the model and validation paths or numeric MongoDB error code,
without printing raw driver messages, document values or credentials.

Run `npm test` from `backend/`. Model tests validate documents and declared index
metadata; index initialization tests mock MongoDB calls. Unique-index enforcement
and concurrent writes still require integration testing against live MongoDB.

References: [Mongoose validation](https://mongoosejs.com/docs/validation.html),
[MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/).
