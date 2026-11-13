# Tasks: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến (Resume Online Payment)

**Input**: Design documents from `docs/specs/resume-online-payment/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/resume-online-payment-api.yaml`, `quickstart.md`)

**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/resume-online-payment-api.yaml`

**Tests**: Bao gồm bộ kiểm thử tự động Backend (`backend/tests/resume-online-payment.test.js`, hồi quy `sepay-payment.test.js`, `orders.test.js`, `customer-order-receipt.test.js`) và Frontend (`frontend/tests/resume-online-payment.test.mjs`) cùng các kịch bản End-to-End trong `quickstart.md`.

**Organization**: Các tác vụ được chia theo giai đoạn khởi tạo dùng chung (Phase 1–2), từng User Story độc lập theo mức độ ưu tiên (`US1`, `US2`, `US3`) và kiểm chứng tổng thể (Phase 6).

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Có thể thực hiện song song (khác tệp tin, không phụ thuộc tác vụ chưa hoàn tất)
- **[Story]**: Nhãn User Story tương ứng (`[US1]`, `[US2]`, `[US3]`) cho các phase User Story
- Mọi đường dẫn tệp tin được chỉ định chính xác theo cấu trúc kho mã nguồn.

---

## Phase 1: Setup (Shared Types, Domain Helper & Shared VietQR Panel)

**Purpose**: Khởi tạo kiểu dữ liệu TypeScript, hàm nghiệp vụ thuần dùng chung phía Backend và thành phần giao diện `VietQrTransferPanel` dùng chung (tuân thủ nguyên tắc không import chéo giữa `features/orders` và `features/checkout`).

- [X] T001 [P] Add shared `CustomerPaymentEligibilityState` (`"eligible" | "already_paid" | "cancelled" | "not_online"`), `CustomerOrderPaymentSession` (`orderId`, `orderCode`, `orderStatus`, `paymentMethod`, `paymentStatus: "unpaid" | "pending" | "paid" | "failed"`, `total`, `paidAmount`, `remainingAmount`, `needsReview`, `eligible`, `state`, `message: string | null`, `paymentInfo: SepayPaymentInfo | null`), `isOrderEligibleForOnlinePayment(order)` helper, and extend `OrderDetail` with `orderStatus?`, `channel?`, `paymentMethodLabel?`, `paymentStatusCode?`, `paidAmount?`, `remainingAmount?`, `paymentExpiredAt?`, `canResumeOnlinePayment?` in `frontend/features/orders/types.ts`
- [X] T002 [P] Create pure domain helper `backend/src/common/order-payment.js` reusing `backend/src/common/sepay-service.js` and `Setting` (`_id: "global"` with env fallback `MB` / `PETJOY STORE`) to export `canResumeOnlinePayment(order)` (`creationState !== "pending" && channel !== "offline" && paymentMethod === "ONLINE" && paymentStatus !== "paid" && orderStatus !== "cancelled"`), `computeOrderPaymentAmounts(order)` (`paidAmount >= 0`, `remainingAmount = paymentStatus === "paid" ? 0 : Math.max(0, total - paidAmount)`), `computePaymentExpiry(order)` (`paymentExpiredAt ?? createdAt + 15 * 60 * 1000`), and `buildCustomerOrderPaymentSession(order, bankConfig)` returning `state` in `["eligible", "already_paid", "cancelled", "not_online"]`
- [X] T003 [P] Extract pure VietQR presentation component `VietQrTransferPanel` (receiving `paymentInfo`, `secondsLeft`, `isExpired`, `isChecking`, `isRenewing`, `isConverting`, `copiedField`, `errorMessage`, `onManualCheck`, `onCopy`, `onRenewSession`, `onConvertToCod`) in `frontend/components/payment/vietqr-transfer-panel.tsx` and update `frontend/features/checkout/components/sepay-transfer-card.tsx` to delegate rendering to `VietQrTransferPanel` without changing checkout behavior

---

## Phase 2: Foundational (Authenticated Customer Payment APIs, Order Detail Extension & Client Service)

**Purpose**: Hạ tầng API xác thực chủ sở hữu đơn hàng (`customer`), bảo vệ chống ghi đồng thời/CSRF, chuẩn hóa dữ liệu thanh toán trong `getOrderDetail`, và lớp `resume-payment.service.ts` phía Frontend.

**⚠️ CRITICAL**: Hoàn tất giai đoạn này trước khi ghép nối trang `/orders/[id]/pay` và nút thanh toán trong `US1`–`US3`.

- [X] T004 Implement authenticated customer payment controller `backend/src/controllers/order-payment.controller.js` exporting `getCustomerOrderPayment` (reading `Order.findOne({ _id: id, customerId: request.user._id, creationState: { $ne: "pending" } })`, setting `Cache-Control: no-store`, validating 24-hex ObjectId via `parseOrderId`), `renewCustomerOrderPayment` (atomic `Order.updateOne` matching `{ _id: id, customerId, channel: "online", paymentMethod: "ONLINE", paymentStatus: { $ne: "paid" }, orderStatus: { $ne: "cancelled" }, creationState: { $ne: "pending" } }` to extend `paymentExpiredAt` by `+15m`, distinguishing `404 ORDER_NOT_FOUND` vs `409` codes `ORDER_CANCELLED`, `ORDER_ALREADY_PAID`, `PAYMENT_METHOD_NOT_ONLINE`), and `convertCustomerOrderToCod` (atomic `Order.updateOne` updating `paymentMethod: "COD"`, `paymentStatus: "unpaid"`, setting `needsReview: true` if `paidAmount > 0`)
- [X] T005 Register `GET /:id/payment` (`no-store`, `requireAuth`, `requireRole("customer")`), `POST /:id/payment/renew` (`no-store`, `requireAuth`, `requireRole("customer")`, `protectMutation`), and `POST /:id/payment/convert-to-cod` (`no-store`, `requireAuth`, `requireRole("customer")`, `protectMutation`) in `backend/src/routers/order.router.js`
- [X] T006 Update `getOrderDetail` in `backend/src/controllers/order.controller.js` to validate ObjectId cleanly, exclude `creationState === "pending"`, add `"confirmed"` to `statusMap` (`status: "pending", statusLabel: "Đã xác nhận"`), and include `orderStatus`, `channel`, `paymentMethodLabel` (`"Chuyển khoản trực tuyến (VietQR)"` / `"Thanh toán khi nhận hàng (COD)"` / `"Tiền mặt tại quầy"`), accurate `paymentStatusCode` & `paymentStatus` label (`"Đã thanh toán"`, `"Thanh toán một phần"`, `"Chờ thanh toán"`, `"Chưa thanh toán"`, `"Thanh toán thất bại"`), `paidAmount`, `remainingAmount`, `paymentExpiredAt`, and `canResumeOnlinePayment`
- [X] T007 [P] Create pure TypeScript API client `frontend/features/orders/services/resume-payment.service.ts` implementing `ResumePaymentApiError(status, code, message)`, `getOrderPaymentSessionApi(orderId)` (`credentials: "include"`, `cache: "no-store"`), `renewOrderPaymentSessionApi(orderId)` and `convertOrderToCodApi(orderId)` (both obtaining CSRF from `/api/v1/auth/csrf`, validating `/^[A-Za-z0-9_-]{43}$/`, and sending `X-CSRF-Token` with `credentials: "include"`, `cache: "no-store"`)

**Checkpoint**: Backend APIs và service Frontend sẵn sàng — có thể phát triển và kiểm chứng từng User Story độc lập.

---

## Phase 3: User Story 1 - Quay lại thanh toán đơn hàng chuyển khoản từ trang chi tiết đơn hàng (Priority: P1) 🎯 MVP

**Goal**: Từ trang Chi tiết đơn hàng (`/orders/[id]`) của đơn hàng `ONLINE` chưa thanh toán và chưa hủy, khách hàng bấm **"Thanh toán ngay" / "Tiếp tục thanh toán"** để mở trang `/orders/[id]/pay` hiển thị đầy đủ mã VietQR theo đúng đơn hàng, đếm ngược, tự động polling 3s, và giữ nguyên trạng thái khi tải lại trang (F5). Không đặt nút ở `/orders` và `/order-tracking` (`Q1: A`, `Q2: A`).

**Independent Test**: Đăng nhập Customer, mở `/orders/<id>` của một đơn `ONLINE` chưa thanh toán, bấm **"Thanh toán ngay"** sang `/orders/<id>/pay`, kiểm tra mã VietQR đúng số tiền và nội dung `PETJOY <orderCode>`, thử F5 trình duyệt xác nhận trang vẫn giữ phiên VietQR, kích hoạt webhook thanh toán thành công và kiểm tra giao diện tự chuyển trạng thái `"Thanh toán thành công!"` kèm nút về chi tiết đơn.

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `useOrderResumePayment(orderId)` hook in `frontend/features/orders/hooks/use-order-resume-payment.ts` managing initial load, 1-second countdown timer preserving `secondsLeft` from server (`Q3: A`), 3-second polling while `session.state === "eligible"` and not expired/paid, manual status check (`"Tôi đã chuyển tiền / Kiểm tra ngay"`), clipboard copy feedback, renew session, and convert-to-COD actions
- [X] T009 [P] [US1] Create `OrderResumePaymentView` client component in `frontend/features/orders/components/order-resume-payment-view.tsx` and export it from `frontend/features/orders/index.tsx` rendering breadcrumb (`Trang chủ / Đơn hàng của tôi / Chi tiết đơn / Thanh toán VietQR`), unauthenticated `401` prompt to `/login?next=/orders/<id>/pay`, eligible `VietQrTransferPanel`, live `"Thanh toán thành công!"` transition view, and back link to `/orders/[id]`
- [X] T010 [US1] Create Customer Next.js 16 route page `frontend/app/(customer)/orders/[id]/pay/page.tsx` wrapping `OrderResumePaymentView` inside `<Suspense>` consistently with `frontend/app/(customer)/orders/[id]/page.tsx` (`cacheComponents` compatible)
- [X] T011 [US1] Update `OrderSummarySidebar` in `frontend/features/orders/components/order-summary-sidebar.tsx` to render accurate `paymentMethodLabel` (`"Chuyển khoản trực tuyến (VietQR)"`), semantic-token payment status badge (`bg-warning-subtle text-warning`, `bg-brand-subtle text-brand`, `bg-success-subtle text-success`, `bg-danger-subtle text-danger`), and primary `"Thanh toán ngay"` link button (matching `bg-brand hover:bg-brand-hover min-h-11`) navigating to `/orders/${encodeURIComponent(order.id)}/pay` when `isOrderEligibleForOnlinePayment(order)` is true

**Checkpoint**: User Story 1 (MVP) hoàn thành — Khách hàng quay lại màn hình QR trực tiếp từ `/orders/[id]` -> `/orders/[id]/pay` và hoàn tất thanh toán.

---

## Phase 4: User Story 2 - Đồng bộ điều kiện hiển thị nút thanh toán theo trạng thái đơn hàng và số tiền (Priority: P1)

**Goal**: Bảo đảm nút thanh toán chỉ hiển thị cho đơn `ONLINE` chưa thanh toán và chưa hủy; ẩn hoàn toàn cho đơn `paid`, `COD`, `offline`, hoặc `cancelled`; đồng thời hỗ trợ đơn **Thanh toán một phần** hiển thị rõ `Đã thanh toán` / `Còn thiếu` trên cả `/orders/[id]` và mã VietQR tại `/orders/[id]/pay`.

**Independent Test**: Mở `/orders/<id>` cho 5 loại đơn (`ONLINE unpaid`, `ONLINE partial`, `ONLINE paid`, `COD`, `ONLINE cancelled`), xác nhận nút chỉ xuất hiện ở 2 trường hợp đầu và đơn thanh toán thiếu sinh mã VietQR với đúng `remainingAmount`.

### Implementation for User Story 2

- [X] T012 [P] [US2] Enhance `OrderSummarySidebar` in `frontend/features/orders/components/order-summary-sidebar.tsx` using `isOrderEligibleForOnlinePayment(order)` to display `Đã thanh toán` and `Còn thiếu` rows when `paidAmount > 0 && remainingAmount > 0`, show `"Tiếp tục thanh toán"` button label for partial payments vs `"Thanh toán ngay"` for unpaid orders, and omit payment action completely for `paid`, `COD`, `offline`, and `cancelled` orders
- [X] T013 [P] [US2] Add unit and HTTP integration tests in `backend/tests/resume-online-payment.test.js` verifying `getOrderDetail` (`canResumeOnlinePayment`, `paymentStatusCode`, `paymentMethodLabel`, `paidAmount`, `remainingAmount`) and `GET /api/v1/orders/:id/payment` for unpaid, partial payment (`remainingAmount < total`, QR generated for remainder), `paid`, `COD`, `offline`, and `cancelled` orders

**Checkpoint**: User Story 2 hoàn thành — Điều kiện hiển thị nút và số tiền thanh toán từng phần đồng bộ từ Backend tới UI.

---

## Phase 5: User Story 3 - Xử lý phiên thanh toán quá hạn hoặc bị thay đổi trong lúc khách rời màn hình (Priority: P2)

**Goal**: Đảm bảo khi khách quay lại muộn (phiên 15 phút đã hết hạn theo `Q3: A`), hoặc đơn hàng vừa bị hủy / đã đổi sang COD / đã thanh toán xong ở tab khác, hệ thống đồng bộ chính xác trạng thái mới nhất, không hiển thị mã QR cho đơn không còn hợp lệ và bảo vệ quyền sở hữu tuyệt đối.

**Independent Test**: Mở `/orders/<id>/pay` cho đơn quá hạn 15 phút để xác minh hiển thị cảnh báo hết hạn + nút gia hạn 15p / đổi COD; truy cập `/orders/<id>/pay` cho đơn đã `cancelled`, `COD`, `already_paid` hoặc thuộc về customer khác để xác minh màn hình từ chối sạch và API chặn chuẩn xác.

### Implementation for User Story 3

- [X] T014 [P] [US3] Implement dedicated non-eligible status screens (`"already_paid"`, `"cancelled"`, `"not_online"`) and `"404"` not-found / `"403"` forbidden fallback views with action links back to `/orders/[id]` and `/orders` in `frontend/features/orders/components/order-resume-payment-view.tsx`
- [X] T015 [P] [US3] Harden public endpoints `getPaymentInfo`, `renewPaymentSession`, and `convertToCod` in `backend/src/controllers/payment.controller.js` to share `backend/src/common/order-payment.js` and reject `orderStatus === "cancelled"` (`409 ORDER_CANCELLED`) or `paymentMethod !== "ONLINE"` (`409 PAYMENT_METHOD_NOT_ONLINE`) while preserving existing `sepay-payment.test.js` expectations
- [X] T016 [US3] Expand `backend/tests/resume-online-payment.test.js` covering: `401 UNAUTHENTICATED`, `403 FORBIDDEN` (`staff`/`admin` and missing/invalid CSRF on `renew` & `convert-to-cod`), `404 ORDER_NOT_FOUND` (missing ID, wrong `customerId`, `creationState: "pending"`), expired QR preservation (`isExpired: true, secondsLeft: 0`), `POST /renew` (+15m) & `POST /convert-to-cod` (including partial payment `needsReview: true`), and `409` conflict/race guards when concurrent webhook sets `paid` or `cancelled`

**Checkpoint**: User Story 3 hoàn thành — Xử lý phiên hết hạn (`Q3: A`), đơn thay đổi trạng thái và bảo mật chủ sở hữu vững chắc.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Bổ sung unit test Frontend, chạy kiểm chứng hồi quy toàn bộ Backend/Frontend, ESLint và Next.js production build.

- [X] T017 [P] Create frontend unit tests in `frontend/tests/resume-online-payment.test.mjs` covering `isOrderEligibleForOnlinePayment`, `getOrderPaymentSessionApi` (returning all 4 session states and preserving `401`/`404`), `renewOrderPaymentSessionApi`, and `convertOrderToCodApi` (CSRF token fetch, `X-CSRF-Token`, `credentials: "include"`, `cache: "no-store"`, rejecting invalid CSRF/server payloads without leaking stacktraces)
- [ ] T018 Execute verification commands: Backend tests (`npm.cmd --prefix backend test tests/resume-online-payment.test.js tests/sepay-payment.test.js tests/orders.test.js tests/customer-order-receipt.test.js tests/admin-permissions.test.js`), Frontend unit tests (`npm.cmd --prefix frontend test`), targeted ESLint on all modified/created frontend files, and Next.js production build (`npm.cmd --prefix frontend run build`), then verify scenarios per `docs/specs/resume-online-payment/quickstart.md` *(Note: automated backend tests `5/5 files (77/77)`, frontend unit tests `119/119`, targeted ESLint `0 errors / 0 warnings`, and `next build` `/orders/[id]/pay` all passed; manual browser E2E verification with live MongoDB/Firebase/SePay webhook remains per `quickstart.md`)*

---

## Dependencies & Execution Sequence

```mermaid
flowchart TD
    Phase1[Phase 1: Setup - Types, order-payment.js, VietQrTransferPanel] --> Phase2[Phase 2: Foundational - order-payment.controller, routes, getOrderDetail, service]
    Phase2 --> Phase3[Phase 3: US1 - /orders/[id]/pay & OrderSummarySidebar CTA MVP]
    Phase3 --> Phase4[Phase 4: US2 - Eligibility Gating & Partial Payment Sync]
    Phase3 --> Phase5[Phase 5: US3 - Expiry, State Guards & Security Hardening]
    Phase4 --> Phase6[Phase 6: Polish & Cross-Cutting Verification]
    Phase5 --> Phase6
```

### User Story Dependencies & MVP Scope
- **Phase 1 → Phase 2**: Bắt buộc hoàn tất trước khi ghép nối giao diện `US1`.
- **MVP Scope (US1 — Phase 3)**: Đã giải quyết trọn vẹn bài toán chính: người dùng quay lại từ Chi tiết đơn hàng `/orders/[id]` -> `/orders/[id]/pay` để tiếp tục quét mã VietQR khi đơn `ONLINE` chưa thanh toán.
- **US2 (Phase 4) & US3 (Phase 5)**: Triển khai song song hoặc tuần tự ngay sau `US1` để hoàn thiện thanh toán từng phần, chặn chặt đơn hủy/COD/đã trả, đồng bộ `payment.controller.js` và kiểm thử bảo mật/race condition.

---

## Parallel Execution Opportunities

- **Phase 1**: `T001` (`frontend/features/orders/types.ts`), `T002` (`backend/src/common/order-payment.js`), và `T003` (`frontend/components/payment/vietqr-transfer-panel.tsx` + `sepay-transfer-card.tsx`) chạm 3 nhóm file độc lập, thực hiện song song 100%.
- **Phase 2**: `T007` (`resume-payment.service.ts`) có thể làm song song với `T004`–`T006` (Backend controllers/router) theo hợp đồng trong `contracts/resume-online-payment-api.yaml`.
- **Phase 3**: `T008` (hook) và `T009` (view component) có thể phát triển song song với `T011` (`OrderSummarySidebar`) sau khi xong `T007`.
- **Phase 4 & 5**: `T012`, `T013`, `T014`, `T015` tác động các file tách biệt giữa UI, Backend controller và Test suite.

