# Technical Research & Architecture Decisions: Tích Hợp Thanh Toán Chuyển Khoản Qua SePay (VietQR)

**Feature**: `sepay-transfer-payment` | **Spec**: [spec.md](./spec.md)

Tài liệu này tổng hợp các quyết định kỹ thuật, phân tích kiến trúc và đánh giá các phương án triển khai tính năng thanh toán chuyển khoản SePay với VietQR trong hệ thống Pet Supplies E-Commerce.

---

## 1. Cơ chế tiếp nhận và xác thực SePay Webhook qua Ngrok

### Vấn đề kỹ thuật
Cổng thanh toán SePay hoạt động dựa trên cơ chế Webhook thời gian thực: khi tài khoản ngân hàng của cửa hàng ghi nhận biến động số dư, SePay gửi một HTTP POST request đến địa chỉ Webhook URL được cấu hình.
Trong môi trường phát triển (development/testing), máy chủ backend chạy tại `localhost:3001`, không thể truy cập trực tiếp từ Internet. Do đó, cần sử dụng công cụ tạo đường hầm an toàn (ngrok tunnel).

### Quyết định kiến trúc
- **Điểm tiếp nhận (Endpoint)**: `POST /api/v1/payments/sepay/webhook`.
- **Bảo mật và Xác thực (Authentication)**:
  - SePay cung cấp cơ chế bảo mật thông qua API Key trong Header `Authorization: Apikey <SEPAY_API_KEY>` (hoặc cấu hình Webhook Token tùy biến).
  - Middleware xác thực chuyên dụng `verifySepayWebhook` sẽ kiểm tra giá trị API Key này trước khi cho phép vào Controller.
  - Endpoint webhook là API tiếp nhận từ bên thứ 3 nên không áp dụng middleware xác thực Firebase Session Cookie hay CSRF Origin check của người dùng thông thường.
  - Tích hợp Rate limiting bảo vệ endpoint chống tấn công từ chối dịch vụ (DDoS), nhưng cấu hình ngưỡng đủ rộng để tiếp nhận thông báo liên tục.
- **Môi trường thử nghiệm ngrok**:
  - Nhà phát triển chạy `ngrok http 3001` để nhận địa chỉ public domain dạng `https://xxxx-xxxx.ngrok-free.app`.
  - Cấu hình Webhook URL trên bảng điều khiển SePay: `https://xxxx-xxxx.ngrok-free.app/api/v1/payments/sepay/webhook`.
  - Không cần sửa đổi mã nguồn giữa môi trường ngrok và môi trường production; endpoint backend giữ nguyên cấu trúc.

### Phương án thay thế đã đánh giá
- *Tự gọi API sao kê của SePay theo chu kỳ (Cronjob polling SePay API)*: Bị từ chối vì tạo độ trễ lớn (ít nhất 1 - 5 phút), tốn hạn ngạch gọi API của SePay và không đạt được tiêu chí thành công SC-002 (phản hồi trong 4 giây).

---

## 2. Tiêu chuẩn khởi tạo mã VietQR động

### Vấn đề kỹ thuật
Để khách hàng có thể quét mã QR chuyển khoản chính xác tuyệt đối mà không cần gõ tay số tài khoản hay nội dung, hệ thống cần sinh mã QR chuẩn VietQR (chuẩn Napas EMVCo).

### Quyết định kiến trúc
- Sử dụng dịch vụ sinh ảnh VietQR chuẩn hóa hoặc Quicklink API:
  - Cú pháp chuẩn VietQR: `https://qr.sepay.vn/img?acc=${ACCOUNT_NUMBER}&bank=${BANK_CODE}&amount=${AMOUNT}&des=${DES}`
  - Hoặc chuẩn Napas Quicklink: `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT_NUMBER}-compact2.png?amount=${AMOUNT}&addInfo=${DES}&accountName=${ACCOUNT_NAME}`.
- Tham số động trên mã QR:
  - `BANK_CODE`: Mã định danh ngân hàng (VD: `MB`, `ICB`, `VCB`).
  - `ACCOUNT_NUMBER`: Số tài khoản của cửa hàng.
  - `ACCOUNT_NAME`: Tên chủ tài khoản.
  - `AMOUNT`: Số tiền chính xác cần thanh toán (hoặc số tiền còn thiếu nếu chuyển bù).
  - `DES`: Cú pháp nội dung chuyển khoản bắt buộc: `PETLY <orderCode>` (Ví dụ: `PETLY ORD173000123`).
- Phía backend tính toán và trả về cả hai định dạng:
  - `qrUrl`: Đường dẫn ảnh QR để giao diện render trực tiếp trong thẻ `<img>`.
  - `qrPayload`: Chuỗi text thô VietQR EMVCo (phục vụ người dùng tải mã hoặc vẽ bằng thư viện mã vạch canvas nếu mất kết nối mạng ngoài).

### Phương án thay thế đã đánh giá
- *Sinh ảnh tĩnh cố định chỉ có số tài khoản*: Bị từ chối vì khách hàng phải tự nhập số tiền và nội dung, dẫn đến nguy cơ sai sót cao và vi phạm yêu cầu FR-004.

---

## 3. Đối soát giao dịch, tính bất biến (Idempotency) và thanh toán cộng dồn

### Vấn đề kỹ thuật
- Mạng Internet và webhook có thể gửi lặp lại một thông báo nhiều lần (retry mechanism của SePay khi timeout).
- Khách hàng có thể chuyển thiếu tiền (Partial payment) hoặc chuyển thành nhiều đợt.
- Tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong SRS: `BR-15` (chỉ đánh dấu paid khi khớp tiền và mã), `BR-16` (tính bất biến Idempotency), `CR-06` (tách biệt Order và Payment).

### Quyết định kiến trúc
- **Tính bất biến (Idempotency)**:
  - Sử dụng trường `transactionRef` trên collection `payments` (chính là mã giao dịch duy nhất `id` hoặc `referenceCode` từ SePay/ngân hàng).
  - Trường `transactionRef` đã có Unique Index trong `payment.model.js` với `partialFilterExpression`.
  - Trước khi xử lý, hệ thống kiểm tra: Nếu `Payment.findOne({ transactionRef })` đã tồn tại, lập tức bỏ qua việc cập nhật lại và trả về HTTP 200 `{ success: true, message: "Transaction already processed" }`.
- **Trích xuất mã đơn hàng**:
  - Phân tích chuỗi `content` từ webhook bằng biểu thức chính quy (Regex): `/PETLY\s+(ORD\d+)/i`.
  - Tìm kiếm đơn hàng theo `orderCode`.
- **Cơ chế thanh toán cộng dồn (Partial Payment Accumulation)**:
  - Mỗi lần webhook hợp lệ gửi đến, một bản ghi `Payment` mới được lưu với số tiền thực chuyển `amount`.
  - Hệ thống tính tổng lũy kế các giao dịch thành công của đơn hàng: `paidAmount = sum(payments.amount)`.
  - Cập nhật trường `Order.paidAmount = paidAmount`.
  - Nếu `paidAmount >= Order.total`: Chuyển `Order.paymentStatus = "paid"`.
  - Nếu `paidAmount < Order.total`: Giữ `Order.paymentStatus = "unpaid"` (hoặc `pending`), tính `remainingAmount = Order.total - paidAmount`. Màn hình thanh toán sẽ hiển thị số tiền thiếu và tạo mã VietQR với số tiền `remainingAmount`.
- **Giao dịch ngoại lệ & Cờ cảnh báo (`needs_review`)**:
  - Nếu `paidAmount > Order.total`: Chuyển đơn sang `paid`, đồng thời cập nhật `Order.needsReview = true` để báo hiệu nhân viên hoàn trả tiền thừa.
  - Nếu giao dịch đến khi đơn hàng đã chuyển sang `paymentMethod = "COD"`: Ghi nhận Payment, cập nhật `Order.needsReview = true` để nhân viên xác nhận lại với khách hàng.

---

## 4. Cơ chế đồng bộ trạng thái thời gian thực phía Client (Frontend)

### Vấn đề kỹ thuật
Làm thế nào để màn hình đang chờ quét mã QR của khách hàng nhận biết đơn hàng đã được thanh toán thành công ngay sau khi webhook được backend xử lý, đáp ứng tiêu chuẩn trải nghiệm người dùng hiện đại.

### Quyết định kiến trúc
- Triển khai giải pháp **Hybrid**:
  - **Polling ngầm**: Hook `usePaymentStatus(orderCode)` trên React sẽ chạy `setInterval` gọi `GET /api/v1/payments/status/:orderCode` định kỳ mỗi **3 giây** (3000ms).
  - Tự động dừng polling khi: trạng thái chuyển sang `paid`, hoặc đồng hồ đếm ngược 15 phút về 0, hoặc người dùng rời khỏi trang.
  - **Nút kiểm tra chủ động**: Cung cấp nút bấm "Tôi đã chuyển tiền / Kiểm tra trạng thái" trên giao diện để người mua có thể kích hoạt gọi kiểm tra ngay lập tức mà không cần đợi chu kỳ 3 giây tiếp theo.
- **Tối ưu hóa tải server**:
  - Endpoint `GET /api/v1/payments/status/:orderCode` chỉ truy vấn các trường tối thiểu: `paymentStatus`, `paidAmount`, `total`, `orderStatus`, `needsReview` (sử dụng `.select(...)` của Mongoose để tối ưu bộ nhớ và tốc độ).

### Phương án thay thế đã đánh giá
- *WebSocket hoặc Server-Sent Events (SSE)*: Tuy mang lại khả năng push tức thì, nhưng làm tăng độ phức tạp kiến trúc đáng kể (quản lý stateful connection, heartbeat, tái kết nối khi qua proxy/ngrok, scale đa tiến trình). Giải pháp Polling 3s đáp ứng hoàn hảo tiêu chí thời gian dưới 4 giây với độ tin cậy và sự đơn giản cao nhất.

---

## 5. Xử lý hết hạn phiên (Timeout 15 phút) và chuyển đổi linh hoạt

### Quyết định kiến trúc
- **Thời gian hết hạn**: Mỗi phiên thanh toán có trường `paymentExpiredAt` (mặc định bằng `createdAt + 15 phút`).
- **Khi hết thời gian đếm ngược**:
  - Frontend hiển thị cảnh báo "Mã thanh toán đã hết hạn" và ẩn mã QR cũ.
  - Đơn hàng vẫn giữ trạng thái `orderStatus: "pending"`.
  - Cung cấp 2 hành động:
    1. **Tạo lại mã thanh toán mới**: Gọi API `POST /api/v1/payments/renew-session/:orderCode`. Backend cập nhật `paymentExpiredAt = now + 15 phút` và trả về mã QR mới.
    2. **Chuyển sang COD**: Gọi API `POST /api/v1/payments/convert-to-cod/:orderCode`. Backend cập nhật `Order.paymentMethod = "COD"`, `Order.paymentStatus = "unpaid"`. Frontend điều hướng sang trang kết quả đặt hàng COD.

---

## 6. Ma trận công nghệ & Tệp nguồn liên quan

| Thành phần | Công nghệ / Thư viện | Tệp mã nguồn liên quan |
| :--- | :--- | :--- |
| **Backend Router** | Express 5 ESM | `backend/src/routers/payment.router.js` |
| **Backend Controller** | Express Handler | `backend/src/controllers/payment.controller.js` |
| **Backend Validation** | Zod 4 | `backend/src/validators/payment.validator.js` |
| **Backend Service / Helper**| VietQR / SePay Parser | `backend/src/common/sepay-service.js` |
| **Backend Models** | Mongoose 9 | `backend/src/models/order.model.js`, `backend/src/models/payment.model.js`, `backend/src/models/setting.model.js` |
| **Frontend UI View** | Next.js 16, React 19, Tailwind CSS 4 | `frontend/features/checkout/components/vietqr-payment-modal.tsx` (hoặc `sepay-transfer-view.tsx`) |
| **Frontend Hook** | Custom React Hook | `frontend/features/checkout/hooks/use-sepay-payment.ts` |
| **Frontend Checkout Integration** | Checkout View | `frontend/features/checkout/components/payment-method-card.tsx`, `frontend/features/checkout/hooks/use-checkout.ts` |

