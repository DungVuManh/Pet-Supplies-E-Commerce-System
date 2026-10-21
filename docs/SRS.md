# Pet Supplies E-Commerce System — Spec for Coding Agents

> Nguồn: `Pet_Supplies_E-Commerce_System_2.docx` (SE1938 NJ – Team 4, FPT University, Oct 2026).
> File này là bản rút gọn, có cấu trúc, để agent lập trình đọc và thực hiện từng task. Phần **"Proposed"** là đề xuất của người chuyển đổi (không có trong docx gốc) — cần team xác nhận.

## 0. How to use this file (instructions for the agent)

1. Đọc §1–§6 để nắm bối cảnh, stack, actor, data model trước khi code.
2. Nhận **một task** ở §10 (ví dụ `T-CHK-03`), đọc các UC / BR / CR / NFR / MSG được tham chiếu, rồi mới code.
3. Use case chi tiết ở §7; quy tắc nghiệp vụ nằm ở §8 (BR-xx, CR-xx), yêu cầu phi chức năng ở §9 (NFR-xx). **Không tự bịa** rule mới; nếu thiếu thông tin hãy xem §11 (Open questions) và hỏi lại.
4. Dùng đúng message code ở §8.3 (MSGxx) cho text hiển thị.
5. Tất cả tính toán tiền, kiểm tra tồn kho, phân quyền **phải làm ở backend**; frontend chỉ phản hồi UX.
6. Mỗi task xong cần: code + validation + test (Postman/Swagger hoặc unit/integration) + cập nhật Swagger.

## 1. Project overview

| | |
|---|---|
| Name | Pet Supplies E-Commerce System (VN: Hệ thống thương mại điện tử bán đồ ăn và phụ kiện dành cho chó, mèo cảnh) |
| Type | Web application |
| Goal | Chủ nuôi thú cưng tìm, so sánh, mua đồ ăn/phụ kiện/đồ chơi online; staff xử lý đơn; admin quản trị sản phẩm, người dùng, dữ liệu |
| Currency / locale | VND, server-side calculation (CR-03); UI messages mặc định tiếng Anh, có thể localize (giữ nguyên message code) |
| Out of scope (v1) | Tích hợp API hãng vận chuyển, quản lý kho nâng cao, hoàn tiền tự động cho đơn đã thanh toán, phần cứng POS/barcode |

## 2. Tech stack & infrastructure

| Category | Choice |
|---|---|
| Frontend | Next.js |
| Backend | Node.js, RESTful API (JSON, UTF-8, versioned endpoints e.g. `/api/v1/...`) |
| Database | MongoDB |
| Deploy | Azure |
| Test / API docs | Postman, Swagger |
| VCS / PM | Git, GitLab (tasks, defects), Jira, Excel |

Kiến trúc: Next.js ⇄ HTTPS/JSON ⇄ Node.js REST API ⇄ MongoDB; Node.js ⇄ Payment Service (QR payment + callback); Node.js ⇄ Notification Service (email/channel, optional).
Auth & role check **do backend thực thi** (EI-06). DB credentials/API keys không được lộ ra client hay log (NFR-S03).

## 3. Actors & roles

| Actor | Description |
|---|---|
| Guest | Chưa đăng ký: duyệt sản phẩm, dùng giỏ hàng, checkout không cần tài khoản |
| Customer | Đã đăng ký: mua hàng, quản lý hồ sơ/địa chỉ, xem lịch sử đơn, review |
| Staff | Nhân viên cửa hàng: nhận, xử lý, cập nhật đơn; xem tồn kho; tạo đơn offline |
| Admin | Quản lý sản phẩm, danh mục, user, staff, khuyến mãi, dashboard, báo cáo tài chính |
| Payment Service (external) | Trả kết quả giao dịch QR |
| Notification Service (external) | Gửi email/thông báo đơn hàng, reset password |

## 4. Screens & authorization

Screen → role được truy cập (X = có). Common screens (Home, Register, Login, Password Reset) dùng chung cho Customer/Staff/Admin; Guest xem Home, catalog, cart, checkout.

| Screen | Customer | Staff | Admin |
|---|:-:|:-:|:-:|
| Main Home Page / Register / Login / Password Reset | X | X | X |
| Customer View, Customer Profile | X | | |
| Shopping Cart View, Checkout & Place Order, Payment Processing | X | | |
| Order History List, Order Detail & Tracking, View Notification | X | | |
| Staff View, Staff Profile | | X | |
| Product Catalog List (staff), Manage Order, Order Detail | | X | |
| Create Order Offline, Revenue Overview Dashboard | | X | |
| Admin Dashboard, Admin Profile | | | X |
| Manage Promotions, Audit Log, Finance Report | | | X |
| Manage Product, Manage Categories | | | X |

Diagrams gốc (Google Drive, agent không đọc được trực tiếp): context diagram, swimlane customer/staff order, use-case diagrams, screen flow.

## 5. Data model

### 5.1 Entities in the source doc (ERD)
Roles, Users, Addresses, PetProfile, Cart, Product, Category, Order, Payment, Review, Wishlist.

> ⚠️ ERD mô tả role "Admin, Manager, Shipper, Customer" nhưng actor/UC dùng **Guest, Customer, Staff, Admin**. Dùng 4 actor ở §3 (Guest không lưu user). Chỉ có `Customer | Staff | Admin` trong `role`.

### 5.2 Proposed MongoDB collections
(đề xuất — suy ra từ UC/BR, cần team xác nhận)

| Collection | Key fields |
|---|---|
| `users` | email (unique), passwordHash, fullName, phone, role (`customer`/`staff`/`admin`), status (`active`/`suspended`/`disabled`), resetToken{hash,expiresAt,used}, timestamps |
| `addresses` | userId, recipientName, phone, province, district, ward, street, isDefault (≤1 default/user) |
| `petProfiles` | userId, name, species, breed, dob *(có trong ERD, chưa có UC → low priority)* |
| `categories` | name (unique), slug, isActive |
| `products` | name, description, brand, petType, categoryId, images[], isActive, variants[{sku, label, price, stock, reservedStock}], ratingAvg, ratingCount |
| `carts` | userId \| guestToken, items[{productId, variantSku, quantity}] |
| `orders` | orderCode (unique, visible), customerId?, guestInfo{name,phone,email}, items[{productId, variantSku, name, unitPrice, qty}] (**snapshot**, BR-09/CR-10), shippingAddress (snapshot), subtotal, discount, shippingFee, total, promotionCode?, paymentMethod (`COD`/`ONLINE`), paymentStatus, orderStatus, channel (`online`/`offline`), createdByStaffId?, shipping{carrier, trackingNumber}, statusHistory[{from,to,by,at}], timestamps |
| `payments` | orderId, method, amount, status, transactionRef (unique), qrPayload, rawResult, timestamps |
| `promotions` | code (unique), type (percent/fixed), value, minOrderAmount, startAt, endAt, isActive, eligibility |
| `reviews` | productId, userId, rating (1–5), comment, status (published), createdAt — chỉ cho phép khi user đã mua (BR-22) |
| `wishlists` | userId, productIds[] *(trong ERD, chưa có UC)* |
| `notifications` | orderId/userId, type, channel, status, error, sentAt (UC26 log) |
| `auditLogs` | actorId, action, target, before/after, at (CR-11) |
| `settings` | lowStockThreshold, shippingFee config |

Order status và payment status là **hai trường tách biệt** (CR-06).

### 5.3 Proposed state machines
(docx chỉ nói "approved workflow", chưa liệt kê — đây là đề xuất, xem §11)

- **paymentStatus:** `unpaid/pending` → `paid` | `failed`. COD: `unpaid` cho tới khi thu tiền (không tự động `paid`, BR-17). Chỉ chuyển `paid` sau khi callback được xác thực (BR-15).
- **orderStatus:** `pending` → `confirmed` → `processing` → `shipping` → `delivered`/`completed`; `cancelled` từ `pending`/`confirmed` (tới "non-cancellable stage").
  - `confirmed` yêu cầu: dữ liệu hợp lệ, đủ tồn kho, và nếu online thì payment đã verified (BR-18).
  - `shipping` yêu cầu carrier + tracking number đã nhập (UC35).

## 6. Use case list (41 UC)

| ID | Name | Actor | Module |
|---|---|---|---|
| UC01 | Register Account | Guest | Auth |
| UC02 | Login | Customer/Staff/Admin | Auth |
| UC03 | Logout | Customer/Staff/Admin | Auth |
| UC04 | Reset Password | Customer/Staff/Admin | Auth |
| UC05 | Manage Customer Profile | Customer | Account |
| UC06 | Manage Shipping Addresses | Customer | Account |
| UC07 | Search Products | All | Catalog |
| UC08 | Filter and Sort Products | All | Catalog |
| UC09 | View Product Details | Guest/Customer | Catalog |
| UC10 | View Product Reviews | Guest/Customer | Catalog |
| UC11 | Add Product to Cart | Guest/Customer | Cart |
| UC12 | View Shopping Cart | Guest/Customer | Cart |
| UC13 | Update Cart Quantity | Guest/Customer | Cart |
| UC14 | View Cart Price Summary | Guest/Customer | Cart |
| UC15 | Guest Checkout | Guest | Checkout |
| UC16 | Customer Checkout | Customer | Checkout |
| UC17 | Enter or Select Shipping Information | Guest/Customer | Checkout |
| UC18 | Apply Promotion Code | Guest/Customer | Checkout |
| UC19 | Enter Payment Information | Guest/Customer | Checkout |
| UC20 | Place Order | Guest/Customer | Checkout |
| UC21 | Verify Payment Result | Payment Service | Payment |
| UC22 | View Order History | Customer | Orders |
| UC23 | View Customer Order Details | Customer | Orders |
| UC24 | Check Order | Customer | Orders |
| UC25 | Cancel Eligible Order | Customer | Orders |
| UC26 | Receive Order Notifications | Customer | Notifications |
| UC27 | Submit Product Review | Customer | Reviews |
| UC28 | Manage Product & Categories | Admin | Admin |
| UC29 | View Inventory | Staff | Inventory |
| UC30 | Monitor Stock | Staff | Inventory |
| UC31 | View and Search Orders | Staff | Staff ops |
| UC32 | View Administrative Order Details | Staff | Staff ops |
| UC33 | Confirm Order | Staff | Staff ops |
| UC34 | Update Order Status | Staff | Staff ops |
| UC35 | Manage Shipping Information | Staff | Staff ops |
| UC36 | Manage Customer Accounts | Admin | Admin |
| UC37 | Manage Staff Accounts | Admin | Admin |
| UC38 | Create Offline Order | Staff | Staff ops |
| UC39 | Manage Promotions | Admin | Admin |
| UC40 | View Dashboard | Admin | Reporting |
| UC41 | View Finance Report | Admin | Reporting |

> Lưu ý: UC28 ghi tên "Manage Product & Categories" nhưng spec chỉ mô tả quản lý **category**. CRUD **product/variant** (Screen "Manage Product") cần được làm theo §10 task `T-ADM-01`, rule theo BR-04, BR-05, BR-23 — xem §11.



## 7. Use case specifications


### 7.1 Account & Access

#### Register Account (UC01)
- **Actor:** Guest | Secondary: None
- **Description:** Creates a customer account to access registered-customer features.
- **Pre:** Guest is not signed in.
- **Main flow:**
  1. Guest opens registration.
  2. System displays required registration fields.
  3. Guest enters account details and submits.
  4. System validates fields and checks email uniqueness.
  5. System creates the Customer account and confirms registration.
- **Alternatives:**
  - 4a. Missing or invalid data: system displays validation messages and requests corrections.
  - 4b. Email already registered: system rejects duplicate registration and offers login.
- **Post:** A new Customer account is created.
- **Rule:** Email must be unique; required fields must be valid.

#### Login (UC02)
- **Actor:** Customer, Staff, Admin | Secondary: None
- **Description:** Authenticates a user and grants access according to their role.
- **Pre:** A registered account exists and is active.
- **Main flow:**
  1. User opens the login page.
  2. System requests credentials.
  3. User submits email and password.
  4. System verifies credentials and account status.
  5. System starts an authenticated session and opens the authorized area.
- **Alternatives:**
  - 4a. Invalid credentials: system shows an error and allows retry.
  - 4b. Disabled account: system denies access.
- **Post:** An authenticated session is active.
- **Rule:** Users can access only functions permitted for their assigned role.

#### Logout (UC03)
- **Actor:** Customer, Staff, Admin | Secondary: None
- **Description:** Terminates the user's active authenticated session securely.
- **Pre:** User is logged into an active session.
- **Main flow:**
  1. User selects the Logout option.
  2. System invalidates the current session token.
  3. System redirects the user to the home page or login screen.
- **Alternatives:**
  - 2a. Session already expired: system redirects to login screen.
- **Post:** The user session is invalidated and protected features are inaccessible.
- **Rule:** All authentication tokens associated with the session must be cleared.

#### Reset Password (UC04)
- **Actor:** Customer, Staff, Admin | Secondary: Notification Service
- **Description:** Allows a user to reset a forgotten password via email verification.
- **Pre:** User has a registered account email.
- **Main flow:**
  1. User submits registered email address on Forgot Password page.
  2. System validates email existence and sends a single-use reset link.
  3. User clicks reset link in email and enters a new password.
  4. System validates password strength, updates password hash, and invalidates reset token.
- **Alternatives:**
  - 2a. Email not found: system displays a generic confirmation without revealing account existence.
  - 3a. Token expired or invalid: system displays error message and prompts retry.
- **Post:** Account password is updated and stored securely as a hash.
- **Rule:** Reset tokens must be single-use, time-limited, and cryptographically secure.

#### Manage Customer Profile (UC05)
- **Actor:** Customer | Secondary: None
- **Description:** Allows a customer to view and update personal account details.
- **Pre:** Customer is authenticated.
- **Main flow:**
  1. Customer opens Profile page.
  2. System retrieves and displays full name, phone number, and account information.
  3. Customer edits profile fields and clicks Save.
  4. System validates inputs and updates customer record.
  5. System displays confirmation toast message.
- **Alternatives:**
  - 4a. Invalid format in fields: system displays inline validation error messages.
- **Post:** Customer profile information is updated in the database.
- **Rule:** Email address modifications require re-verification or separate update procedure.

#### Manage Shipping Addresses (UC06)
- **Actor:** Customer | Secondary: None
- **Description:** Allows a customer to add, edit, remove, and set default shipping addresses.
- **Pre:** Customer is authenticated.
- **Main flow:**
  1. Customer navigates to Address Management page.
  2. System displays saved addresses list.
  3. Customer adds a new address or selects an existing address to edit/delete/set default.
  4. System validates address details (recipient, phone, province, district, ward, street).
  5. System saves updates and refreshes the address list.
- **Alternatives:**
  - 3a. Delete address: system asks for confirmation before removing.
  - 4a. Incomplete fields: system highlights required missing address fields.
- **Post:** Address records are updated and ready for checkout selection.
- **Rule:** Each customer must have at most one default shipping address.


### 7.2 Catalog & Shopping

#### Search Products (UC07)
- **Actor:** Guest, Customer, Staff, Admin | Secondary: None
- **Description:** Finds products matching a keyword.
- **Pre:** The product catalog is available.
- **Main flow:**
  1. Actor enters a search keyword.
  2. System searches relevant product information.
  3. System displays matching products.
  4. Actor selects a product to inspect details.
- **Alternatives:**
  - 3a. No matches: system displays a no-results message.
- **Post:** Relevant search results are displayed.
- **Rule:** Only products visible to the actor are returned.

#### Filter and Sort Products (UC08)
- **Actor:** Guest, Customer, Staff, Admin | Secondary: None
- **Description:** Narrows and orders catalog results by selected criteria.
- **Pre:** Catalog or search results are displayed.
- **Main flow:**
  1. Actor selects filters such as category, pet type, price or availability.
  2. Actor selects a sort option.
  3. System applies the criteria.
  4. System displays the updated product list.
- **Alternatives:**
  - 4a. No matches: system displays an empty-result message and lets actor revise filters.
- **Post:** A filtered and sorted product list is displayed.
- **Rule:** Filters and sort options must use supported product attributes.

#### View Product Details (UC09)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Displays product information needed for purchase decisions.
- **Pre:** The product is available in the catalog.
- **Main flow:**
  1. Actor selects a product.
  2. System retrieves its details, price, images, available variants and stock information.
  3. System displays the product detail page.
- **Alternatives:**
  - 2a. Product unavailable or inactive: system shows an unavailable-product message.
- **Post:** Product details are displayed.
- **Rule:** Displayed availability must reflect recorded stock.

#### View Product Reviews (UC10)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Displays customer ratings and reviews for a selected product.
- **Pre:** Product detail page is open.
- **Main flow:**
  1. Actor scrolls to or selects Reviews section.
  2. System retrieves approved reviews, average star rating, and rating counts.
  3. System displays the review list and rating summary.
- **Alternatives:**
  - 2a. No reviews exist: system displays zero-reviews message.
- **Post:** Product reviews and rating summary are shown.
- **Rule:** Only published or validated reviews are displayed publicly.

#### Add Product to Cart (UC11)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Adds a product or variant to the shopping cart.
- **Pre:** A purchasable product or variant is selected.
- **Main flow:**
  1. Actor selects a variant and quantity.
  2. Actor clicks Add to Cart.
  3. System checks quantity and availability.
  4. System adds the item to the cart or increases its quantity.
  5. System updates the cart summary.
- **Alternatives:**
  - 3a. Insufficient stock: system requests an eligible quantity.
  - 3b. Invalid quantity: system rejects the input.
- **Post:** The cart contains the requested available quantity.
- **Rule:** Cart quantities must be positive and must not exceed available stock.

#### View Shopping Cart (UC12)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Shows items and prices before checkout.
- **Pre:** A shopping cart exists for the current visitor.
- **Main flow:**
  1. Actor opens the cart.
  2. System retrieves cart items, quantities and current prices.
  3. System calculates and displays the cart summary.
- **Alternatives:**
  - 2a. Cart empty: system displays an empty-cart message.
  - 2b. Item unavailable: system flags the item for correction.
- **Post:** The current cart is displayed.
- **Rule:** Cart summary reflects the latest eligible items and prices.

#### Update Cart Quantity (UC13)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Changes the number of units for an item in the cart.
- **Pre:** The cart contains the selected item.
- **Main flow:**
  1. Actor changes the item quantity.
  2. System checks the quantity and stock.
  3. System updates the cart item.
  4. System recalculates totals and displays the revised cart.
- **Alternatives:**
  - 2a. Insufficient stock or invalid quantity: system rejects the change and explains why.
- **Post:** Cart quantity and totals are updated.
- **Rule:** Quantity must be valid and within available stock.

#### View Cart Price Summary (UC14)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Calculates and displays subtotal, estimated discounts, shipping fee, and grand total.
- **Pre:** Cart is active.
- **Main flow:**
  1. Actor opens cart page.
  2. System calculates subtotal based on current item prices and quantities.
  3. System factors active promotion discounts and shipping fee.
  4. System presents itemized summary breakdown.
- **Alternatives:**
  - 2a. Empty cart: price summary displays zero values.
- **Post:** Accurate price breakdown is displayed.
- **Rule:** Price calculations must be performed on server side.


### 7.3 Checkout & Payment

#### Guest Checkout (UC15)
- **Actor:** Guest | Secondary: Payment Service (for online payment)
- **Description:** Allows a guest to buy without account registration.
- **Pre:** Guest cart contains at least one valid item.
- **Main flow:**
  1. Guest starts checkout.
  2. System displays guest contact, address and payment fields.
  3. Guest supplies required details and selects a payment method.
  4. System validates checkout data and shows an order summary.
  5. Guest proceeds to Place Order (UC20).
- **Alternatives:**
  - 4a. Required details missing: system requests corrections.
  - 4b. Cart item unavailable: system blocks checkout until corrected.
- **Post:** Guest checkout information is ready for order placement.
- **Rule:** Guest checkout must not require account creation.

#### Customer Checkout (UC16)
- **Actor:** Customer | Secondary: Payment Service (for online payment)
- **Description:** Checks out using a registered customer account.
- **Pre:** Customer is logged in and cart has valid items.
- **Main flow:**
  1. Customer opens checkout.
  2. System displays available saved contact and address information.
  3. Customer confirms or edits delivery information.
  4. Customer chooses an available payment method and reviews the summary.
  5. Customer proceeds to Place Order (UC20).
- **Alternatives:**
  - 3a. Address is incomplete: system requires correction.
  - 4a. Item availability changed: system requests cart review.
- **Post:** Customer checkout information is ready for order placement.
- **Rule:** Checkout requires valid delivery details and an eligible cart.

#### Enter or Select Shipping Information (UC17)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Captures or selects delivery address details during checkout.
- **Pre:** Checkout process initiated.
- **Main flow:**
  1. System displays shipping address section.
  2. Customer selects saved address or Guest enters recipient name, phone, address.
  3. System validates address fields.
  4. System associates shipping information with current order session.
- **Alternatives:**
  - 3a. Invalid phone number or address: system prompts correction.
- **Post:** Valid shipping details are assigned to checkout.
- **Rule:** Delivery information must include recipient name, valid phone number, and detailed address.

#### Apply Promotion Code (UC18)
- **Actor:** Guest, Customer | Secondary: None
- **Description:** Applies a discount code to the current checkout order.
- **Pre:** Buyer is in checkout process.
- **Main flow:**
  1. Buyer enters coupon code.
  2. System validates code against promotion rules, eligibility, expiration date, and minimum order amount.
  3. System calculates discount amount and recalculates order total.
  4. System displays discount confirmation.
- **Alternatives:**
  - 2a. Invalid or expired code: system displays error message (MSG16).
- **Post:** Eligible discount is applied to the order sum.
- **Rule:** Only active promotions satisfying eligibility criteria may be applied.

#### Enter Payment Information (UC19)
- **Actor:** Guest, Customer | Secondary: Payment Service
- **Description:** Records the buyer-selected payment method, including Cash on Delivery.
- **Pre:** Buyer is in a valid checkout process.
- **Main flow:**
  1. Buyer opens payment selection.
  2. System shows supported payment methods.
  3. Buyer selects Cash on Delivery or online payment.
  4. System records the selected method in checkout.
  5. For online payment, system prepares payment instructions as part of order payment processing.
- **Alternatives:**
  - 3a. Unsupported payment method: system requests another method.
  - 5a. Online payment initialization fails: system displays a retry or alternate-method option.
- **Post:** A valid payment method is selected.
- **Rule:** COD does not require online transaction verification; online payment confirmation must be verified by the system.

#### Place Order (UC20)
- **Actor:** Guest, Customer | Secondary: Payment Service (when online)
- **Description:** Confirms checkout details and creates an order.
- **Pre:** Cart has eligible items; contact, delivery information and payment method are valid.
- **Main flow:**
  1. Buyer reviews items, delivery information and total.
  2. Buyer confirms the order.
  3. System revalidates stock and checkout data.
  4. System creates an order with its items, prices and initial status.
  5. For online payment, system creates a QR-based payment request and displays it for scanning; for COD, system marks the order as awaiting processing under COD.
  6. System displays the order code and current order/payment status.
- **Alternatives:**
  - 3a. Stock is insufficient: system blocks order placement and requests cart correction.
  - 4a. Order creation fails: system reports failure without confirming an order.
  - 5a. Payment request cannot be generated: system displays a payment initialization error and a retry option.
- **Post:** An order is recorded and a payment path is established.
- **Rule:** An online-payment QR is not proof of payment; payment status changes only after verified confirmation.

#### Verify Payment Result (UC21)
- **Actor:** Payment Service | Secondary: None
- **Description:** Processes the online transaction result and updates payment records.
- **Pre:** An online-payment order and transaction request exist.
- **Main flow:**
  1. Payment Service sends a transaction result to the system.
  2. System authenticates and validates the result against the expected order and amount.
  3. System checks whether the transaction was already processed.
  4. System updates the payment status and the related order state as appropriate.
  5. System records the transaction reference and result.
- **Alternatives:**
  - 2a. Invalid or mismatched result: system rejects it without marking the payment successful.
  - 3a. Duplicate notification: system acknowledges safely without repeating state changes.
  - 4a. Failed or pending payment: system retains the corresponding non-paid status.
- **Post:** A verified transaction outcome is recorded.
- **Rule:** Payment confirmation must be validated and processed idempotently.


### 7.4 Orders & Reviews

#### View Order History (UC22)
- **Actor:** Customer | Secondary: None
- **Description:** Displays a customer’s previous purchases.
- **Pre:** Customer is authenticated.
- **Main flow:**
  1. Customer opens Order History.
  2. System retrieves orders belonging to the customer.
  3. System shows order codes, dates, totals and statuses.
  4. Customer selects an order for its details.
- **Alternatives:**
  - 2a. No previous orders: system displays an empty-state message.
- **Post:** The customer sees their own order history.
- **Rule:** Customers may view only their own orders.

#### View Customer Order Details (UC23)
- **Actor:** Customer | Secondary: None
- **Description:** Displays full itemized details, shipping info, payment status, and order progress.
- **Pre:** Customer is logged in and owns the order.
- **Main flow:**
  1. Customer selects a specific order from Order History.
  2. System validates access permissions.
  3. System displays order code, timestamp, item list, prices, totals, shipping address, payment method, and tracking status.
- **Alternatives:**
  - 2a. Order not owned by customer: system denies access (MSG28).
- **Post:** Detailed order view is displayed.
- **Rule:** Customers may only view order details for orders associated with their account.

#### Check Order (UC24)
- **Actor:** Customer | Secondary: None
- **Description:** Allows a customer to check the current status of an order.
- **Pre:** An order exists and the customer is authorized to view it.
- **Main flow:**
  1. Customer opens an order or supplies the supported lookup information.
  2. System validates access and finds the order.
  3. System displays the latest order and payment statuses.
- **Alternatives:**
  - 2a. Order not found or access denied: system does not disclose its details.
- **Post:** The current order status is displayed.
- **Rule:** Order details must be protected from unauthorized access.

#### Cancel Eligible Order (UC25)
- **Actor:** Customer | Secondary: None
- **Description:** Cancels an order while cancellation is still permitted.
- **Pre:** Customer owns an order in a cancellable state.
- **Main flow:**
  1. Customer selects the order and requests cancellation.
  2. System checks ownership and cancellation eligibility.
  3. System asks for confirmation.
  4. Customer confirms cancellation.
  5. System updates the order status and shows the result.
- **Alternatives:**
  - 2a. Order no longer cancellable: system rejects the request.
  - 4a. Customer withdraws: order remains unchanged.
- **Post:** The eligible order is cancelled.
- **Rule:** Cancellation is allowed only before the defined non-cancellable processing stage; paid-order refunds require a separate policy.

#### Receive Order Notifications (UC26)
- **Actor:** Customer | Secondary: Notification Service
- **Description:** Delivers automated notifications regarding order confirmation, payment, and shipping status.
- **Pre:** Order status or payment status event is triggered.
- **Main flow:**
  1. System detects order placement or status update.
  2. System formats notification message using order code and current status.
  3. Notification Service sends message to customer's email/channel.
  4. System records notification log.
- **Alternatives:**
  - 3a. Delivery failure: system logs notification error without impacting order processing.
- **Post:** Notification message is dispatched to customer.
- **Rule:** Notification dispatch failures must not alter or rollback successful database transactions.

#### Submit Product Review (UC27)
- **Actor:** Customer | Secondary: None
- **Description:** Publishes feedback about an eligible purchased product.
- **Pre:** Customer is authenticated and has purchased the product.
- **Main flow:**
  1. Customer opens the purchased product review form.
  2. Customer provides a rating and optional comment.
  3. System validates review content and purchase eligibility.
  4. System saves and displays the review.
- **Alternatives:**
  - 3a. Customer is not eligible: system rejects the review.
  - 3b. Rating or text invalid: system requests correction.
- **Post:** A valid product review is stored.
- **Rule:** Only eligible purchased products may be reviewed.


### 7.5 Staff Operations

#### View and Search Orders (UC31)
- **Actor:** Staff | Secondary: None
- **Description:** Finds customer orders for daily processing.
- **Pre:** Staff is authenticated and authorized.
- **Main flow:**
  1. Staff opens the order management page.
  2. System lists orders with their statuses.
  3. Staff enters search terms or status filters.
  4. System displays matching orders.
- **Alternatives:**
  - 4a. No orders match: system displays a no-results message.
- **Post:** Relevant orders are displayed to Staff.
- **Rule:** Only authorized staff can access administrative order data.

#### View Administrative Order Details (UC32)
- **Actor:** Staff | Secondary: None
- **Description:** Provides complete order data required for fulfillment and management.
- **Pre:** Staff is authenticated and order exists.
- **Main flow:**
  1. Staff selects an order from the list.
  2. System displays complete order information including customer contact, ordered items, stock status, payment details, and shipping address.
- **Alternatives:**
  - 2a. Order deleted or invalid ID: system displays error message.
- **Post:** Administrative order details are shown.
- **Rule:** Sensitive customer information must be handled securely according to privacy policy.

#### Confirm Order (UC33)
- **Actor:** Staff | Secondary: None
- **Description:** Validates an order and confirms it for fulfillment.
- **Pre:** Staff is authenticated; an order is pending confirmation.
- **Main flow:**
  1. Staff opens the order details.
  2. System shows purchased items, contact details, payment status and order state.
  3. Staff checks order completeness and product availability.
  4. Staff confirms the eligible order.
  5. System updates order status and records the action.
- **Alternatives:**
  - 3a. Missing data or insufficient stock: staff cannot confirm until resolved.
  - 3b. Online payment not verified where required: system prevents confirmation.
- **Post:** The order is confirmed for the next operational step.
- **Rule:** Confirmation follows the permitted order-state transitions and payment checks.

#### Update Order Status (UC34)
- **Actor:** Staff | Secondary: None
- **Description:** Moves an order through permitted processing states.
- **Pre:** Staff is authorized and the order exists.
- **Main flow:**
  1. Staff opens an order.
  2. System displays current status and permitted next statuses.
  3. Staff selects the next status.
  4. System validates the transition and saves the change.
  5. System displays the updated status.
- **Alternatives:**
  - 4a. Invalid or conflicting transition: system rejects the update.
- **Post:** The order status is updated and available for customer tracking.
- **Rule:** Only permitted status transitions may be applied; external shipping integration is out of current scope.

#### CreateOffline Order (UC38)
- **Actor:** Staff | Secondary: None
- **Description:** Records an in-store purchase as an offline order.
- **Pre:** Staff is authenticated and products can be sold in store.
- **Main flow:**
  1. Staff starts a new offline order.
  2. Staff selects products and quantities.
  3. System calculates totals and checks availability.
  4. Staff selects the payment method and confirms sale details.
  5. System creates the offline order and displays confirmation.
- **Alternatives:**
  - 3a. Insufficient stock: system prevents invalid quantities.
  - 4a. Payment details invalid: system requests correction.
- **Post:** An offline order is recorded.
- **Rule:** Offline orders require valid items, quantities and payment method.


### 7.6 Administration

#### Manage Product & Categories (UC28)
- **Actor:** Admin | Secondary: None
- **Description:** Creates and maintains product categories for catalog organization.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens category management.
  2. System displays existing categories.
  3. Admin creates, edits, activates or deactivates a category.
  4. System validates submitted information.
  5. System saves changes and refreshes the list.
- **Alternatives:**
  - 4a. Missing or duplicate category information: system requests correction.
  - 5a. Update fails: system retains the existing data and reports the error.
- **Post:** Category information is updated.
- **Rule:** Category identifiers must be unique; category state controls catalog visibility as configured.

#### Manage Shipping Information (UC35)
- **Actor:** Staff | Secondary: None
- **Description:** Updates shipping carrier, tracking reference number, and delivery details.
- **Pre:** Order is confirmed and ready for shipment.
- **Main flow:**
  1. Staff opens order shipping details.
  2. Staff inputs carrier name and tracking number.
  3. System validates tracking info format.
  4. System saves shipping details and updates order status to Shipping.
- **Alternatives:**
  - 3a. Empty required field: system requests input.
- **Post:** Tracking information is saved and accessible to customer.
- **Rule:** Tracking info must be updated before setting order to Shipped status.

#### View Inventory (UC29)
- **Actor:** Staff | Secondary: None
- **Description:** Displays product stock quantities across all variants.
- **Pre:** Staff is authenticated.
- **Main flow:**
  1. Staff opens Inventory page.
  2. System retrieves product list with SKU, current stock, reserved stock, and status.
  3. System displays inventory table.
- **Alternatives:**
  - 2a. Database connection error: system shows error toast.
- **Post:** Current stock records are presented.
- **Rule:** Stock numbers must be updated in real-time upon order confirmation.

#### Monitor Stock (UC30)
- **Actor:** Staff | Secondary: None
- **Description:** Filters products at or below the configured low-stock threshold.
- **Pre:** Low-stock threshold is configured in system settings.
- **Main flow:**
  1. Staff selects Low Stock filter on Inventory view.
  2. System queries items where stock <= threshold.
  3. System highlights low-stock items in red/warning badges.
- **Alternatives:**
  - 2a. No low-stock items: system displays all-stocked message.
- **Post:** Low stock items list is highlighted for replenishment.
- **Rule:** Items with 0 stock are flagged as Out of Stock automatically.

#### Manage Customer Accounts (UC36)
- **Actor:** Admin | Secondary: None
- **Description:** Manages customer account access and status.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens customer management.
  2. System lists and searches customers.
  3. Admin selects a customer account.
  4. Admin activates or suspends the account.
  5. System validates permission and saves the change.
- **Alternatives:**
  - 4a. Invalid action or missing account: system rejects the request.
- **Post:** Customer account status is updated.
- **Rule:** Account actions require appropriate administrative authorization.

#### Manage Staff Accounts (UC37)
- **Actor:** Admin | Secondary: None
- **Description:** Creates and manages Staff accounts and operational access.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens staff account management.
  2. Admin creates or selects a Staff account.
  3. Admin supplies or updates required information and status.
  4. System validates information and permissions.
  5. System saves the Staff account and displays confirmation.
- **Alternatives:**
  - 4a. Duplicate account or invalid fields: system requests correction.
  - 4b. Unauthorized role change: system rejects the action.
- **Post:** Staff account information and access state are updated.
- **Rule:** Staff account creation and modification are restricted to Admin.

#### Manage Promotions (UC39)
- **Actor:** Admin | Secondary: None
- **Description:** Maintains promotions and coupon eligibility.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens promotions management.
  2. Admin creates or selects a promotion.
  3. Admin enters discount details and eligibility conditions.
  4. System checks the values and applicable period.
  5. Admin saves or changes activation status.
  6. System stores and displays the updated promotion.
- **Alternatives:**
  - 4a. Invalid discount or dates: system requests correction.
  - 4b. Conflicting or duplicate code: system rejects the code.
- **Post:** Promotion information is stored and can be applied when eligible.
- **Rule:** A promotion must satisfy configured eligibility and validity conditions.

#### View Dashboard (UC40)
- **Actor:** Admin | Secondary: None
- **Description:** Shows an overview of store operations.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens dashboard.
  2. System aggregates available order, revenue, customer, product and low-stock metrics.
  3. System displays summary indicators.
  4. Admin reviews the operational overview.
- **Alternatives:**
  - 2a. Some data cannot be loaded: system indicates unavailable metrics without fabricating values.
- **Post:** Current available metrics are displayed.
- **Rule:** Metrics are calculated from recorded system data.

#### View Finance Report (UC41)
- **Actor:** Admin | Secondary: None
- **Description:** Generates financial reports summarizing revenue, expenses, and sales metrics.
- **Pre:** Admin is authenticated and authorized.
- **Main flow:**
  1. Admin opens Finance Report page.
  2. Admin selects date range (daily, monthly, quarterly).
  3. System aggregates completed sales, discounts, net revenue, and total order count.
  4. System presents financial breakdown and chart.
- **Alternatives:**
  - 3a. No completed sales in period: system displays zero revenue summary.
- **Post:** Financial performance figures for selected period are displayed.
- **Rule:** Revenue calculation must include only verified paid and completed orders.

## 8. Business rules, common requirements & messages
This appendix lists business rules and common requirements that apply across multiple use cases, followed by standardized application messages. Rules derived from the use cases are supplemented by implementation proposals that require team confirmation, particularly order status transitions, finance calculation, and notification delivery.

### 8.1 Business Rules (BR)
The rules below govern checkout, payment, order handling, administration, and product reviews. They should be applied consistently by user interfaces and backend services.

| ID | Rule Definition |
|---|---|
| BR-01 | Each registered Customer account must use a unique email address and valid required registration information. |
| BR-02 | Guests may browse products, use a cart, and complete checkout without creating an account. |
| BR-03 | Users may perform only actions authorized for their assigned role (Customer, Staff, or Admin). |
| BR-04 | Only active products and available variants may be offered for purchase on the public storefront. |
| BR-05 | A cart item quantity must be a positive integer and must not exceed the stock available for that product/variant. |
| BR-06 | Before an order is created, the system must recheck item availability, quantities, required buyer information, and pricing. |
| BR-07 | Guest checkout requires valid contact information and a delivery address; Customer checkout requires valid delivery information. |
| BR-08 | Each order must contain one selected delivery address and one selected payment method. |
| BR-09 | Order item prices, quantities, discounts, and totals must be recorded at order placement so later catalog changes do not alter an existing order. |
| BR-10 | Promotions apply only when active, within their validity period, and eligible for the current order. |
| BR-11 | The backend is responsible for calculating subtotal, valid discounts, shipping charge (if configured), and final payable amount. |
| BR-12 | Supported checkout payment methods are Cash on Delivery (COD) and online payment through the configured Payment Service. |
| BR-13 | For online payment, a persisted order must be associated with the generated QR payment request and the expected payable amount. |
| BR-14 | Displaying or scanning a payment QR code must not, by itself, mark an order as paid. |
| BR-15 | An online payment may be marked successful only after a verified Payment Service result matches the order and amount. |
| BR-16 | Repeated or delayed payment-result notifications must not apply the same transaction more than once. |
| BR-17 | COD orders do not require online payment confirmation; they must not automatically be recorded as paid merely because the order was placed. |
| BR-18 | Staff may confirm an order only if the information and stock are valid, and required online payment verification has succeeded. |
| BR-19 | Staff may change order status only through transitions permitted by the approved order-status workflow. |
| BR-20 | A Customer may cancel an order only before the defined non-cancellable processing stage; paid-order refunds require a separately approved process. |
| BR-21 | A Customer may view only their own account, order history, order details, and payment information. |
| BR-22 | A Customer may submit a product review only for a product they have purchased, subject to review-content validation. |
| BR-23 | Only Admin may manage Staff accounts, Customer account restrictions, promotions, and category configuration. |
| BR-24 | Staff may search, confirm, and process orders and create offline orders only within their authorized permissions. |
| BR-25 | An offline order must contain valid products, quantities, a payment method, and a record that the order was created by Staff. |
| BR-26 | Current stock monitoring uses the recorded stock quantity and an agreed low-stock threshold; full warehouse management is outside the current scope. |
| BR-27 | Shipping addresses and permitted manual shipment information may be stored, but direct carrier API integration is not required for this release. |
| BR-28 | Dashboard and finance figures must be calculated from available recorded data. Profit must not be displayed as an accurate value unless the required cost data and calculation rules exist. |


### 8.2 Common Requirements (CR)
These requirements apply across multiple use cases and shall be implemented consistently throughout the system.

| ID | Topic | Common Requirement |
|---|---|---|
| CR-01 | Validation | Required fields, length limits, format constraints, quantities, and numeric values must be checked on the server; the interface should also give immediate feedback. |
| CR-02 | Unique identifiers | Accounts, products, orders, payments, and other primary records must have stable unique identifiers; each order must have a visible order code. |
| CR-03 | Money and totals | The system must use consistent currency and precision. For the initial Vietnam deployment, VND is proposed, with monetary calculations performed on the server. |
| CR-04 | Date and time | Creation, updates, payment results, and order status changes must include timestamps; stored timestamps must use a consistent format and display the appropriate local time. |
| CR-05 | Access control | Every protected API must validate the current user and authorized role or resource ownership, regardless of which screen initiated the request. |
| CR-06 | Order and payment state | Order status and payment status must be maintained as separate values, with explicit allowed transitions and no implicit success inferred from displaying a QR. |
| CR-07 | Product/order lists | Large lists should support pagination, search, filtering, and sorting while enforcing visibility and permission rules. |
| CR-08 | Error handling | Invalid actions must return understandable feedback without exposing stack traces, secrets, or unrelated user data. |
| CR-09 | Data consistency | Order creation, stock changes, and payment result handling must prevent partial or duplicate business updates, including concurrent requests. |
| CR-10 | Historical integrity | Orders must retain purchased item/price details even if a product is later updated, hidden, or deactivated. |
| CR-11 | Audit information | Important Staff and Admin operations, including order status changes and account restrictions, should record actor, action, and timestamp. |
| CR-12 | Feedback and confirmation | Create/update operations must show success or failure; destructive or irreversible operations require a confirmation step. |
| CR-13 | Notifications | If notifications are implemented, each message must use current order/payment information and delivery failure must not corrupt the underlying transaction. |
| CR-14 | Offline versus online orders | Orders created by Staff in the store must be distinguishable from online orders for management and reporting. |


### 8.3 Application Messages (MSG)
Message contents below are recommended English defaults. The interface may localize the displayed text without changing the message code or the conditions under which it appears. Placeholders in braces are replaced by actual values.

| # | Message Code | Message Type | Context | Content |
|---|---|---|---|---|
| 1 | MSG01 | Inline | Product search returns no matches. | No products match your search. |
| 2 | MSG02 | Field error | A required form field is empty. | This field is required. |
| 3 | MSG03 | Field error | An email address has an invalid format. | Enter a valid email address. |
| 4 | MSG04 | Field error | Registration uses an existing email. | This email is already registered. |
| 5 | MSG05 | Toast | Customer account created successfully. | Your account has been created successfully. |
| 6 | MSG06 | Inline | Login credentials are invalid. | Incorrect email or password. |
| 7 | MSG07 | Inline | Account status prevents login. | This account is currently disabled. |
| 8 | MSG08 | Toast | Password reset requested. | If this email is registered, reset instructions will be sent. |
| 9 | MSG09 | Toast | Profile or address saved successfully. | Your information has been updated. |
| 10 | MSG10 | Inline | Product is inactive or not available. | This product is currently unavailable. |
| 11 | MSG11 | Field error | Selected quantity exceeds stock. | Only {available_quantity} item(s) are available. |
| 12 | MSG12 | Field error | Cart quantity is invalid. | Enter a quantity greater than zero. |
| 13 | MSG13 | Empty state | Cart does not contain any products. | Your shopping cart is empty. |
| 14 | MSG14 | Toast | Cart has been updated. | Shopping cart updated. |
| 15 | MSG15 | Field error | Required checkout or address detail is missing. | Check the required contact and delivery information. |
| 16 | MSG16 | Inline | Promotion code is invalid or ineligible. | This promotion code is invalid or not applicable. |
| 17 | MSG17 | Toast | Eligible promotion applied. | Promotion code applied successfully. |
| 18 | MSG18 | Confirmation page | Order creation succeeds. | Order {order_code} has been placed successfully. |
| 19 | MSG19 | Toast | Order creation fails. | Unable to place the order. Please try again. |
| 20 | MSG20 | Information | Online payment QR is generated. | Scan the QR code to pay for order {order_code}. |
| 21 | MSG21 | Toast | QR payment request initialization fails. | Unable to generate a payment QR code. Please retry. |
| 22 | MSG22 | Status label | Payment has not been verified yet. | Payment pending. Please wait for confirmation. |
| 23 | MSG23 | Toast | Payment Service result is verified as successful. | Payment confirmed successfully. |
| 24 | MSG24 | Status / Inline | Online payment fails or is rejected. | Payment failed or was not completed. |
| 25 | MSG25 | Confirmation modal | Buyer requests cancellation. | Are you sure you want to cancel this order? |
| 26 | MSG26 | Toast | Cancellation succeeds. | Your order has been cancelled. |
| 27 | MSG27 | Inline | Cancellation is no longer permitted. | This order can no longer be cancelled. |
| 28 | MSG28 | Inline | Requested order is missing or not accessible. | Order not found or access denied. |
| 29 | MSG29 | Toast | Staff successfully updates order status. | Order status updated to {order_status}. |
| 30 | MSG30 | Error page | User lacks permission for a protected feature. | You do not have permission to access this page. |
| 31 | MSG31 | Toast | Staff/Admin successfully saves a record. | Changes saved successfully. |
| 32 | MSG32 | Field error | Admin enters a duplicate or invalid code/name. | This value is already in use or is invalid. |
| 33 | MSG33 | Toast | Customer review is accepted. | Your review has been submitted. |
| 34 | MSG34 | Inline | Customer is not eligible to review product. | You can review only products you have purchased. |
| 35 | MSG35 | Toast | Staff creates an offline order. | Offline order {order_code} created successfully. |
| 36 | MSG36 | Toast | Unexpected recoverable system error. | Something went wrong. Please try again later. |



## 9. Non-functional requirements (NFR) & interfaces
This section specifies the interfaces and measurable quality characteristics of the Pet Supplies E-Commerce System. Targets below are proposed acceptance criteria for the initial web-based release and should be verified during testing on the selected deployment environment.

### 9.1 External Interfaces
The system provides browser-based interfaces for Guest, Customer, Staff, and Admin users. The backend exposes RESTful APIs and communicates with a payment service for QR-based online payment. External shipping-carrier integration is excluded from the current scope.

#### 9.1.1 User Interfaces

| ID | Interface | Requirement |
|---|---|---|
| EI-01 | Guest / Customer storefront | Provide product listing, search, filtering, product details, shopping cart, checkout, and order confirmation pages. Guest checkout shall not require an account. |
| EI-02 | Customer account area | Provide login, profile, saved addresses, order history, order details, order status, and eligible review features for authenticated Customers. |
| EI-03 | Staff workspace | Provide order lists, order details, confirmation, status updates, inventory visibility, and offline order creation. Staff functions require authorization. |
| EI-04 | Admin workspace | Provide product/category, Customer/Staff account, promotion, and dashboard management interfaces. Admin-only features must not be accessible to other roles. |
| EI-05 | Cross-device presentation | Pages must remain usable on common desktop and mobile browser viewports, with clear labels, input feedback, and confirmation dialogs for irreversible actions. |


#### 9.1.2 Software Interfaces

| ID | Connected element | Requirement |
|---|---|---|
| EI-06 | Frontend–backend REST API | The Next.js frontend shall communicate with the Node.js backend using versioned HTTPS endpoints and JSON request/response bodies. Authentication and role checks are enforced by the backend. |
| EI-07 | MongoDB database | The backend shall read and write customer, product, cart, order, payment, and other domain data through an authenticated database connection. Database credentials must not be exposed to the browser. |
| EI-08 | Payment Service | For online payment, the backend shall create a payment request, return a QR code or QR payload for display, and accept authenticated payment results. Transaction references, order IDs, and amounts must be matched. |
| EI-09 | Notification Service (if enabled) | For use cases that include notifications, the system may send order and payment updates through a configured notification channel. Failure to send a notification must not change a valid order or payment result. |


#### 9.1.3 Communication Interfaces

| ID | Requirement |
|---|---|
| EI-10 | All production browser-to-server communication shall use HTTPS. REST APIs shall exchange UTF-8 JSON and use appropriate HTTP methods and status codes. |
| EI-11 | Payment result callbacks shall use the payment provider’s supported authenticated interface. The server shall validate the callback and handle retries or duplicate delivery safely. |
| EI-12 | Failures of an external payment or notification service shall be presented clearly. The system shall not report a successful payment without verified confirmation. |


#### 9.1.4 Hardware Interfaces
No dedicated hardware device is required. Users access the system through a network-connected computer, tablet, or smartphone with a supported web browser. The project does not require a barcode scanner, point-of-sale terminal, or direct hardware integration for the initial release.

### 9.2 Quality Attributes
The following criteria are suggested targets for acceptance testing rather than claims about the system’s current implementation. Timing targets exclude third-party outages and should be assessed with representative seed data and the intended Azure deployment configuration.

#### 9.2.1 Usability

| ID | Requirement / acceptance criterion |
|---|---|
| NFR-U01 | All main shopping operations (product discovery, cart updates, checkout, and order confirmation) shall be available through clearly labeled navigation and actions. |
| NFR-U02 | The customer-facing pages shall function at viewport widths from 360 px to 1440 px without horizontal scrolling for primary content and actions. |
| NFR-U03 | The system shall display field-level validation for incorrect or missing information and preserve other valid form inputs when corrections are required. |
| NFR-U04 | Core flows shall be testable in the current stable versions of Chrome and Edge; Firefox support should be verified before release. |
| NFR-U05 | Forms and primary actions shall support keyboard navigation, visible focus, meaningful labels, and clear success/error messages. |


#### 9.2.2 Reliability

| ID | Requirement / acceptance criterion |
|---|---|
| NFR-R01 | Order placement shall revalidate checkout information and stock before creating an order; a failed operation shall not display a successful order confirmation. |
| NFR-R02 | A payment initialization failure shall leave the order unpaid or pending and allow a safe retry; QR generation alone shall never change payment status to paid. |
| NFR-R03 | Repeated payment callbacks shall be processed idempotently so that the same transaction cannot result in duplicate payment records or state changes. |
| NFR-R04 | Concurrent order or inventory operations shall not permit negative stock or duplicate processing caused by repeated submissions. |
| NFR-R05 | The deployed database shall have a documented backup procedure, and a restore test shall be completed before the final demonstration. |


#### 9.2.3 Performance

| ID | Requirement / acceptance criterion |
|---|---|
| NFR-P01 | With at least 1,000 seeded products and 30 simulated concurrent users, 95% of catalog and search API requests should complete within 3 seconds on the target test environment. |
| NFR-P02 | Under the same test load, 95% of cart update and internal checkout validation requests should complete within 3 seconds, excluding external payment service latency. |
| NFR-P03 | After a successful payment-service response is received, the system should display the returned QR payment instructions within 2 seconds. |
| NFR-P04 | Core storefront pages should become usable within 4 seconds on a stable 10 Mbps connection under the agreed testing conditions. |


#### 9.2.4 Security

| ID | Requirement / acceptance criterion |
|---|---|
| NFR-S01 | Account passwords shall be stored only as salted, one-way password hashes, never as plaintext. Password-reset credentials shall be single-use and expire. |
| NFR-S02 | The backend shall enforce role-based authorization for Customer, Staff, and Admin functions. A user shall not access another user’s protected profile or order data. |
| NFR-S03 | Production endpoints shall use HTTPS; authentication credentials, API keys, and database connection strings shall not be embedded in client-side code or logs. |
| NFR-S04 | All server inputs shall be validated; user-provided content shall be handled to reduce common injection and cross-site scripting risks. |
| NFR-S05 | Payment-result messages shall be authenticated and checked against the expected order, amount, and transaction status before a payment is recorded as successful. |
| NFR-S06 | The system shall use reasonable rate limiting for login and sensitive endpoints, and shall invalidate authentication when a user logs out or an account is disabled. |




## 10. Development task breakdown (Proposed)

Quy ước: mỗi task = 1 vertical slice (API + UI + test). `Deps` = task phải xong trước. `Refs` = tài liệu bắt buộc đọc. Thứ tự gợi ý theo phase; có thể song song các task không phụ thuộc nhau.

### Phase 0 — Foundation
| ID | Task | Refs | Acceptance criteria |
|---|---|---|---|
| T-SET-01 | Init monorepo/2 repos: Next.js app + Node.js API; ESLint/Prettier, env config, `.env.example`, MongoDB connection, Swagger at `/api/docs` | §2, EI-06/07, NFR-S03 | App chạy local; secrets chỉ ở env; health endpoint `GET /api/v1/health` |
| T-SET-02 | API conventions: error format (không lộ stack trace), validation middleware, pagination/search/filter/sort helper, logger, rate limiter | CR-01, CR-07, CR-08, NFR-S04/S06 | Mọi endpoint dùng chung helper; lỗi trả mã + message code |
| T-SET-03 | Mongoose/ODM models + indexes (unique email, orderCode, promo code, transactionRef) + seed script (≥1,000 sản phẩm, 1 admin, 1 staff, categories, promotions) | §5.2, CR-02, NFR-P01 | `npm run seed` chạy được |
| T-SET-04 | Layouts + route guards theo role (storefront / account / staff / admin) và mobile-first 360–1440px | §4, EI-01..05, NFR-U02 | Truy cập sai role → MSG30 |

### Phase 1 — Auth & account
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-AUTH-01 | Register + email unique (UC01) | BR-01, MSG02-05 | T-SET-03 |
| T-AUTH-02 | Login / Logout / token invalidation / disabled account (UC02, UC03) | BR-03, MSG06-07, NFR-S01/S02/S06 | T-AUTH-01 |
| T-AUTH-03 | RBAC middleware (customer/staff/admin) + ownership check | BR-03, BR-21, CR-05, NFR-S02 | T-AUTH-02 |
| T-AUTH-04 | Reset password: single-use, expiring token, generic response (UC04) | NFR-S01, MSG08 | T-AUTH-02 |
| T-ACC-01 | Customer profile (UC05) | MSG09 | T-AUTH-03 |
| T-ACC-02 | Shipping addresses CRUD, ≤1 default (UC06) | MSG09, MSG15 | T-AUTH-03 |

### Phase 2 — Catalog & cart
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-CAT-01 | Product list + keyword search (UC07) | BR-04, MSG01, NFR-P01 | T-SET-03 |
| T-CAT-02 | Filter (category, brand, pet type, price, availability) + sort (UC08) | BR-04, CR-07 | T-CAT-01 |
| T-CAT-03 | Product detail page with variants/stock (UC09) | MSG10 | T-CAT-01 |
| T-CAT-04 | Reviews display + rating summary (UC10) | — | T-CAT-03 |
| T-CRT-01 | Cart for guest (token/cookie) and customer; merge on login; add item (UC11) | BR-02, BR-05, MSG11-12 | T-CAT-03 |
| T-CRT-02 | View cart, update quantity, remove item (UC12, UC13) | BR-05, MSG13-14 | T-CRT-01 |
| T-CRT-03 | Server-side price summary: subtotal, discount, shipping fee, total (UC14) | BR-11, CR-03 | T-CRT-02 |

### Phase 3 — Checkout & payment (critical path)
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-CHK-01 | Checkout for guest/customer + shipping info capture/select (UC15, UC16, UC17) | BR-07, BR-08, MSG15 | T-CRT-03, T-ACC-02 |
| T-CHK-02 | Promotion code apply (UC18) | BR-10, MSG16-17 | T-CHK-01, T-ADM-04 |
| T-CHK-03 | Payment method selection COD/online (UC19) | BR-12 | T-CHK-01 |
| T-CHK-04 | Place order: revalidate stock/prices atomically, snapshot items/prices/address, create order code, no negative stock under concurrency / double submit (UC20) | BR-06, BR-09, BR-13, CR-09, CR-10, NFR-R01, NFR-R04, MSG18-19 | T-CHK-01..03 |
| T-PAY-01 | Create QR payment request + display QR; retry on failure (UC20 step 5) | BR-13, BR-14, NFR-R02, NFR-P03, MSG20-22 | T-CHK-04 |
| T-PAY-02 | Payment callback endpoint: authenticate, match order+amount+ref, **idempotent**, update payment/order state (UC21) | BR-15, BR-16, CR-06, NFR-R03, NFR-S05, EI-11, MSG23-24 | T-PAY-01 |

### Phase 4 — Customer orders & reviews
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-ORD-01 | Order history + order detail (own orders only) (UC22, UC23) | BR-21, MSG28 | T-CHK-04 |
| T-ORD-02 | Check/track order incl. guest lookup (UC24) | MSG28 | T-CHK-04 |
| T-ORD-03 | Cancel eligible order with confirmation (UC25) | BR-20, MSG25-27 | T-ORD-01 |
| T-NOT-01 | Order/payment notifications + notification log; failure must not roll back order (UC26) | CR-13, EI-09 | T-CHK-04 |
| T-REV-01 | Submit review only for purchased product (UC27) | BR-22, MSG33-34 | T-ORD-01 |

### Phase 5 — Staff operations
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-STF-01 | Order list/search/filter by status + order detail (UC31, UC32) | BR-24, CR-07 | T-CHK-04 |
| T-STF-02 | Confirm order (payment verified for online; stock valid) (UC33) | BR-18, MSG29 | T-STF-01, T-PAY-02 |
| T-STF-03 | Update order status via allowed-transition table + status history + audit log (UC34) | BR-19, CR-11, MSG29 | T-STF-01 |
| T-STF-04 | Shipping info (carrier, tracking) → status Shipping (UC35) | BR-27 | T-STF-03 |
| T-INV-01 | Inventory view by variant: SKU, stock, reserved (UC29) | BR-26 | T-SET-03 |
| T-INV-02 | Low-stock filter/badge via configured threshold; stock 0 → Out of Stock (UC30) | BR-26 | T-INV-01 |
| T-STF-05 | Create offline order, flagged `channel=offline` + `createdByStaffId` (UC38) | BR-25, CR-14, MSG35 | T-CHK-04 |

### Phase 6 — Admin
| ID | Task | Refs | Deps |
|---|---|---|---|
| T-ADM-01 | Product + variant CRUD, activate/deactivate (screen "Manage Product") | BR-04, BR-23, MSG31-32 | T-AUTH-03 |
| T-ADM-02 | Category CRUD, unique, activate/deactivate (UC28) | BR-23, MSG31-32 | T-AUTH-03 |
| T-ADM-03 | Customer account list/search/suspend/activate (UC36) | BR-23 | T-AUTH-03 |
| T-ADM-04 | Promotion management: validity, eligibility, unique code (UC39) | BR-10, MSG32 | T-AUTH-03 |
| T-ADM-05 | Staff account CRUD (UC37) | BR-23 | T-AUTH-03 |
| T-ADM-06 | Audit log screen | CR-11 | T-STF-03 |
| T-RPT-01 | Dashboard: totals of orders/revenue/customers/products/low-stock; show "unavailable" instead of fake values (UC40) | BR-28 | T-CHK-04 |
| T-RPT-02 | Finance report by date range; revenue only from verified paid + completed orders; **no profit unless cost data exists** (UC41) | BR-28 | T-RPT-01 |

### Phase 7 — Hardening
| ID | Task | Refs |
|---|---|---|
| T-QA-01 | API tests (Postman/Swagger collection) for critical flows: checkout, payment callback idempotency, concurrency on stock, RBAC | NFR-R01..R04, NFR-S02, NFR-S05 |
| T-QA-02 | Load test 1,000 products / 30 concurrent users, p95 ≤ 3s | NFR-P01, NFR-P02 |
| T-QA-03 | Security pass: validation/XSS/injection, rate limits, no secrets in client/logs, HTTPS | NFR-S01..S06 |
| T-QA-04 | Accessibility/usability pass: keyboard, focus, labels; Chrome + Edge | NFR-U01..U05 |
| T-QA-05 | DB backup procedure + restore test; Azure deploy | NFR-R05 |

### Definition of Done (mọi task)
- Server-side validation + đúng HTTP status; client hiển thị field-level error (CR-01, NFR-U03).
- Đúng message code (§8.3); destructive action có confirm (CR-12).
- Phân quyền & ownership check ở mọi protected API (CR-05).
- Có timestamp cho create/update/status change (CR-04); thao tác quan trọng của Staff/Admin ghi audit (CR-11).
- Swagger cập nhật; có test hoặc Postman request chứng minh acceptance criteria.

## 11. Open questions / gaps in the source doc

Agent không tự quyết các mục này; dùng default "Proposed" bên dưới nếu chưa có phản hồi và ghi chú lại trong PR.

1. **Order status workflow chưa được liệt kê** (BR-19 chỉ nói "approved workflow") → dùng state machine ở §5.3.
2. **"Non-cancellable stage"** (BR-20) chưa xác định → default: chỉ huỷ được khi `pending`/`confirmed`.
3. **Refund** đơn đã thanh toán: ngoài scope; chỉ chặn/ghi nhận, không tự hoàn tiền.
4. **Payment Service nào?** (VietQR, PayOS, SePay, VNPay QR…) chưa chốt → tạo `PaymentProvider` interface + một mock provider cho dev/test.
5. **Shipping fee** "if configured" → default cấu hình trong `settings` (flat fee hoặc 0).
6. **Low-stock threshold** giá trị mặc định chưa có → default 5, cấu hình qua `settings`.
7. **Reserved stock**: UC29 hiển thị "reserved stock" nhưng không định nghĩa khi nào reserve/release; UC29 cũng nói stock cập nhật "khi order confirmation" trong khi BR-06/NFR-R04 yêu cầu kiểm tra tồn khi đặt hàng → đề xuất: kiểm tra khi đặt, reserve khi đặt, trừ hẳn khi confirm, release khi huỷ.
8. **Manage Product** (UC28) chỉ mô tả category; thiếu UC cho product/variant CRUD và upload ảnh.
9. **Email change** (UC05) "re-verification or separate procedure" chưa rõ → default: không cho đổi email ở v1.
10. **Reviews**: UC10 nói "approved/published" nhưng không có UC kiểm duyệt → default: auto-publish sau khi validate.
11. **Guest order lookup** (UC24): "supported lookup information" chưa xác định → đề xuất orderCode + phone/email.
12. **Wishlist, PetProfile** có trong ERD nhưng không có UC → để backlog, không làm ở v1.
13. **Finance "expenses/profit"** (UC41) vs BR-28 (không hiển thị profit nếu thiếu dữ liệu cost) → chỉ làm revenue/discount/orders ở v1.
14. UC list ghi "Staff, Admin" search sản phẩm (UC07/08) nhưng Staff/Admin có màn hình riêng — dùng cùng API, UI tuỳ role.
15. Một số heading trong docx đánh số lệch (3.5.x/3.6.x) — thứ tự UC ở §7 đã giữ theo docx, tham chiếu theo **UC ID**, không theo số mục.
