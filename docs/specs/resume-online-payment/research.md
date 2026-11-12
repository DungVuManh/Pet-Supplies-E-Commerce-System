# Research: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến (Resume Online Payment)

**Feature Directory**: `docs/specs/resume-online-payment` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

## 1. Khảo sát hiện trạng mã nguồn

### 1.1. Luồng thanh toán SePay hiện tại (`/checkout/result`)
- Hiện tại sau khi đặt hàng thành công tại [use-checkout.ts](file:///E:/Pet-Supplies-E-Commerce-System/frontend/features/checkout/hooks/use-checkout.ts), khách hàng được chuyển hướng đến `/checkout/result?orderCode=...&total=...&paymentMethod=...&paymentProvider=...`.
- Thành phần [PaymentResultView](file:///E:/Pet-Supplies-E-Commerce-System/frontend/features/checkout/components/payment-result-view.tsx) đọc tham số từ query string URL để quyết định hiển thị [SepayTransferCard](file:///E:/Pet-Supplies-E-Commerce-System/frontend/features/checkout/components/sepay-transfer-card.tsx).
- **Vấn đề 1 (Không có lối quay lại từ đơn hàng)**: Trang `/orders` và `/orders/[id]` ([OrderDetailView](file:///E:/Pet-Supplies-E-Commerce-System/frontend/features/orders/components/order-detail-view.tsx), [OrderSummarySidebar](file:///E:/Pet-Supplies-E-Commerce-System/frontend/features/orders/components/order-summary-sidebar.tsx)) hoàn toàn chưa có nút hay liên kết nào đưa người dùng quay lại màn hình mã VietQR khi đơn hàng chọn `ONLINE` mà chưa thanh toán.
- **Vấn đề 2 (Hiển thị trạng thái & số tiền chưa chính xác trong `getOrderDetail`)**:
  - Trong `backend/src/controllers/order.controller.js` (`getOrderDetail`), `paymentStatus` hiện đang ánh xạ thô `order.paymentStatus === "unpaid" ? "Chưa thanh toán" : "Đã thanh toán"`, khiến các đơn `ONLINE` có `paymentStatus === "pending"` (trạng thái mặc định của schema hoặc khi mới chuyển thiếu một phần tiền) bị hiển thị sai thành `"Đã thanh toán"`.
  - Giao diện `OrderSummarySidebar` đang tô màu xanh thành công (`emerald-50`) cho badge trạng thái thanh toán bất kể đã trả hay chưa, và chưa hiển thị `paidAmount` / `remainingAmount` hay nhãn thân thiện `"Chuyển khoản trực tuyến (VietQR)"` thay vì `"Thanh toán qua ONLINE"`.
- **Vấn đề 3 (Thiếu kiểm tra trạng thái đơn và quyền sở hữu ở luồng quay lại)**:
  - Các API công khai hiện có trong `backend/src/controllers/payment.controller.js` (`getPaymentInfo`, `renewPaymentSession`, `convertToCod`) chỉ kiểm tra `order` tồn tại và `paymentStatus === "paid"`, chưa chặn đơn hàng đã hủy (`orderStatus === "cancelled"`) hoặc đơn hàng đang có phương thức `COD`. Đồng thời `renewPaymentSession` / `convertToCod` công khai không xác thực chủ đơn hoặc CSRF, nên nếu dùng trực tiếp từ trang tài khoản cá nhân `/orders/[id]/pay` sẽ chưa đạt chuẩn bảo mật `CLAUDE.md` (`requireAuth`, `requireRole("customer")`, `protectMutation`).

### 1.2. Hiện trạng mô hình dữ liệu & hạ tầng (`Order`, `Payment`, `Setting`)
- `Order` (`backend/src/models/order.model.js`) đã lưu đầy đủ: `orderCode`, `customerId`, `channel` (`online` | `offline`), `paymentMethod` (`COD` | `ONLINE` | `CASH`), `paymentStatus` (`unpaid` | `pending` | `paid` | `failed`), `orderStatus` (`pending` | `confirmed` | `processing` | `shipping` | `completed` | `cancelled`), `total`, `paidAmount`, `needsReview`, `paymentExpiredAt`, `creationState`.
- Trong `createOrder`, đơn hàng được khởi tạo với `paymentStatus: "unpaid"`, `channel: "online"`; nếu `paymentExpiredAt` chưa được gán sẵn khi tạo đơn, `payment.controller.js` tính mặc định `createdAt + 15 phút`.

---

## 2. Các quyết định kỹ thuật (Phase 0 Decisions)

### Decision 1: Tuyến đường & Kiến trúc API dành riêng cho khách đã đăng nhập (`/orders/[id]/pay`)
- **Decision**: Bổ sung route Next.js `/orders/[id]/pay` song song với `/orders/[id]` và `/orders/[id]/cancel`, kết hợp 3 endpoint xác thực chủ sở hữu trên `backend/src/routers/order.router.js`:
  - `GET /api/v1/orders/:id/payment` (`readCookies, requireAuth, requireRole("customer")`)
  - `POST /api/v1/orders/:id/payment/renew` (`readCookies, requireAuth, requireRole("customer"), protectMutation`)
  - `POST /api/v1/orders/:id/payment/convert-to-cod` (`readCookies, requireAuth, requireRole("customer"), protectMutation`)
- **Rationale**:
  - Đáp ứng đúng `Q1: A` (chỉ hiển thị từ Chi tiết đơn hàng của tài khoản đã đăng nhập) và `Q2: A` (điều hướng sang trang thanh toán riêng ổn định khi F5/tải lại, không phụ thuộc query params tạm thời).
  - Đảm bảo 100% `FR-011` và chuẩn bảo mật `CLAUDE.md`: xác thực phiên Firebase (`requireAuth`), đúng vai trò `customer`, lọc chặt `customerId === request.user._id` & `creationState !== "pending"` (trả `404 ORDER_NOT_FOUND` nếu không phải chủ đơn để tránh lộ sự tồn tại đơn hàng), `Cache-Control: no-store`, và áp dụng `protectMutation` (Origin + CSRF + JSON) cho các thao tác làm mới phiên QR và chuyển COD.
- **Alternatives considered**:
  - *Điều hướng về `/checkout/result?orderCode=...`*: Loại bỏ vì URL phụ thuộc nhiều query params dễ mất khi F5/sửa URL, không kiểm tra quyền sở hữu `customerId` ở phía server, và hiển thị breadcrumb thuộc bước "Thanh toán giỏ hàng" thay vì ngữ cảnh đơn hàng đã đặt.

### Decision 2: Dùng chung domain logic tạo VietQR và làm sạch điều kiện ở `payment.controller.js`
- **Decision**: Tách helper thuần vào `backend/src/common/order-payment.js` (tái sử dụng `sepay-service.js` và đọc `Setting` `_id: "global"` + config env) để tính thống nhất: điều kiện đủ hợp lệ thanh toán `ONLINE`, số tiền đã trả / còn thiếu, mốc hết hạn (`paymentExpiredAt ?? createdAt + 15m`), URL/payload VietQR, và trạng thái phản hồi chuẩn hóa (`eligible`, `ineligibilityReason`: `"ORDER_CANCELLED" | "ORDER_ALREADY_PAID" | "PAYMENT_METHOD_NOT_ONLINE" | "OFFLINE_ORDER"`).
- **Rationale**:
  - Tránh trùng lặp code giữa `payment.controller.js` (`/payments/sepay/*`) và controller thanh toán lại của khách (`/orders/:id/payment*`).
  - Bảo vệ thêm `getPaymentInfo`, `renewPaymentSession` và `convertToCod` hiện có trong `payment.controller.js` trước các đơn `cancelled` hoặc `COD` mà vẫn giữ nguyên 100% hành vi với đơn `ONLINE` hợp lệ (tương thích toàn bộ test trong `backend/tests/sepay-payment.test.js`).
- **Alternatives considered**:
  - *Viết lại logic QR riêng trong `order.controller.js`*: Dễ lệch cấu hình ngân hàng hoặc công thức đếm ngược 15 phút giữa 2 màn hình.

### Decision 3: Chia sẻ giao diện `VietQrTransferPanel` không vi phạm ranh giới feature
- **Decision**: Theo quy tắc `CLAUDE.md` ("Features must not import from each other. Shared code goes to `components/ui/`, `types/`, or `lib/`"), đặt component trình bày UI thuần VietQR (nhận props dữ liệu và callbacks) tại `frontend/components/payment/vietqr-transfer-panel.tsx`. Cả `features/checkout/components/sepay-transfer-card.tsx` lẫn `features/orders/components/order-resume-payment-view.tsx` đều tái sử dụng panel này mà không import chéo giữa `features/orders` và `features/checkout`.
- **Rationale**: Tuân thủ nghiêm kiến trúc feature isolation, tránh nhân đôi gần 300 dòng JSX hiển thị VietQR/sao chép/đồng hồ đếm ngược, đồng bộ tuyệt đối giao diện thanh toán ở cả hai nơi.
- **Alternatives considered**:
  - *Copy nguyên file `SepayTransferCard` sang `features/orders/`*: Tạo mã trùng lặp và dễ lệch UI về sau.

### Decision 4: Áp dụng đúng quy tắc `Q3: A` cho phiên QR quá hạn và cập nhật nguyên tử (Atomic Update)
- **Decision**:
  - Khi mở `/orders/[id]/pay`, API trả về `secondsLeft` và `isExpired` dựa đúng theo `paymentExpiredAt` hiện tại (hoặc `createdAt + 15 phút`), **không tự động gia hạn ngầm**. Nếu `isExpired === true`, `VietQrTransferPanel` hiển thị trạng thái hết hạn kèm 2 nút `"Tạo lại mã thanh toán (gia hạn 15p)"` và `"Chuyển sang nhận hàng (COD)"`.
  - Hai mutation `POST /orders/:id/payment/renew` và `POST /orders/:id/payment/convert-to-cod` sử dụng `Order.updateOne` có điều kiện (`channel: "online"`, `paymentMethod: "ONLINE"`, `paymentStatus: { $ne: "paid" }`, `orderStatus: { $ne: "cancelled" }`, `creationState: { $ne: "pending" }`) để chống xung đột ghi đồng thời khi có webhook SePay về hoặc khi khách bấm thao tác từ 2 tab cùng lúc (tương thích MongoDB standalone không dùng transaction).
- **Rationale**: Đảm bảo an toàn tài chính tuyệt đối (không để đơn đã thanh toán qua webhook bị lật về COD hay bị gia hạn sai trạng thái).
- **Alternatives considered**:
  - *Dùng `order.save()` sau `findOne`*: Dễ dính race condition giữa lúc webhook cập nhật `paymentStatus = "paid"` và lúc người dùng bấm chuyển sang COD.

