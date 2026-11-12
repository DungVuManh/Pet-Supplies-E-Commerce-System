# Research: Yêu Cầu Hoàn Trả Đơn Hàng & Duyệt Hoàn Đơn (Order Returns)

**Feature Directory**: `docs/specs/order-returns` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

## 1. Khảo sát hiện trạng mã nguồn

### 1.1. Luồng giao nhận và tự động hoàn thành hiện tại
- Đơn hàng trực tuyến ở trạng thái `shipping` (`Đang giao`) hiện cho phép chủ đơn nhấn **"Đã nhận được hàng"** qua `PATCH /api/v1/orders/:id/receipt-confirmation` ([order-status.controller.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/order-status.controller.js)).
- Tác vụ tự động hoàn thành sau 3 ngày ([order-auto-complete.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/common/order-auto-complete.js)) quét tất cả đơn `channel: "online"`, `orderStatus: "shipping"`, đủ 72 giờ để chuyển sang `completed`.
- **Điểm cần đồng bộ**:
  - Cần bổ sung chặn không cho khách bấm `"Đã nhận được hàng"` khi đang có yêu cầu hoàn trả `pending` hoặc đã `approved`.
  - Tác vụ tự động hoàn thành sau 72 giờ phải bỏ qua đơn có yêu cầu hoàn trả đang `pending` hoặc `approved` (`FR-005`). Nếu yêu cầu hoàn trả bị Staff từ chối (`rejected`), cấp thêm khoảng đệm tối thiểu 24 giờ kể từ lúc từ chối (nếu đã qua 72h từ `shippedAt`) để khách kịp xem lý do từ chối hoặc bấm nhận hàng trước khi tự động hoàn thành.

### 1.2. Hiện trạng Upload Cloudinary và Bảo vệ CSRF
- Hệ thống đã tích hợp `cloudinary` v2 (`backend/src/config/cloudinary.js`) và `multer` v2.5.0 (`memoryStorage`) trong [review.router.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/routers/review.router.js) và [review.controller.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/review.controller.js).
- Tuy nhiên:
  - `protectMutation` trong `backend/src/controllers/auth.controller.js` bắt buộc `request.is("application/json")`, nên không áp dụng trực tiếp được lên route nhận `multipart/form-data`.
  - `review.router.js` chỉ kiểm tra `file.mimetype.startsWith("image/")` (có nguy cơ cho phép `image/svg+xml`).
- **Giải pháp chuẩn hóa**: Tạo helper `protectMultipartMutation` (kiểm tra `CORS_ORIGIN`, `multipart/form-data`, và cặp `X-CSRF-Token` / cookie giống `protectMutation`) cùng helper upload Cloudinary dùng chung giới hạn chặt allowlist MIME `["image/jpeg", "image/png", "image/webp"]`, tối đa 5MB/ảnh, tối đa 5 ảnh/yêu cầu, thư mục Cloudinary `petjoy/returns`.

### 1.3. Hiện trạng Enum trạng thái đơn hàng & Tác động liên module
- Enum `orderStatuses` (`shared.schema.js`) hiện có 6 giá trị: `pending`, `confirmed`, `processing`, `shipping`, `completed`, `cancelled`.
- `backend/tests/models.test.js` kiểm tra danh sách cố định 17 model xuất từ `backend/src/models/index.js`.
- `frontend/tests/staff-orders.test.mjs` kiểm tra `orderStatusLabels` và `orderStatusTones` khớp toàn bộ trạng thái Staff.
- `backend/src/controllers/admin-finance.controller.js` tính hoàn tiền từ `cancelledPaid` và `netRevenue` từ `completed` trừ hoàn tiền.
- `backend/src/controllers/order.controller.js` (`createOrder`) trừ trực tiếp `variants.$.stock` khi tạo đơn.

---

## 2. Các quyết định kỹ thuật (Phase 0 Decisions)

### Decision 1: Lưu trữ `returnRequest` nguyên tử ngay trên document `Order`
- **Decision**: Thêm trường lồng ghép `returnRequest` (subdocument đơn, tùy chọn) trên `Order` thay vì tách collection riêng; kết hợp index `{ "returnRequest.status": 1, "returnRequest.requestedAt": -1 }`.
- **Rationale**:
  - Theo `Q3: A`, quan hệ giữa Đơn hàng và Yêu cầu hoàn trả là **1 : 0..1** (mỗi đơn tối đa 1 yêu cầu duy nhất).
  - Do dự án chạy MongoDB standalone (không có multi-document transaction theo `CLAUDE.md`), việc lưu trên `Order` cho phép kiểm tra điều kiện và cập nhật trạng thái đơn + yêu cầu hoàn trả + lịch sử trạng thái chỉ trong **một lệnh `Order.updateOne` nguyên tử duy nhất**:
    - Khách gửi yêu cầu (`Order.updateOne` lọc `orderStatus: "shipping"`, `"returnRequest.status": { $exists: false }`) chặn triệt để gửi trùng lặp hay cạnh tranh với nút nhận hàng.
    - Staff duyệt (`Order.updateOne` lọc `orderStatus: "shipping"`, `"returnRequest.status": "pending"`) chỉ trả `modifiedCount: 1` đúng 1 lần duy nhất (`SC-004`), ngăn tuyệt đối 2 nhân viên cùng bấm duyệt làm cộng tồn kho 2 lần.
  - Giữ nguyên danh sách 17 model xuất ra ở `backend/src/models/index.js`, không phá vỡ test kiểm soát SRS model.
- **Alternatives considered**:
  - *Tạo collection `ReturnRequest` riêng*: Trên MongoDB standalone dễ phát sinh trạng thái nửa vời khi ghi `ReturnRequest` xong mà ghi `Order` thất bại hoặc khi hai nhân viên duyệt đồng thời.

### Decision 2: Bổ sung trạng thái `"returned"` (`Đã hoàn trả`) và đồng bộ hóa báo cáo/UI
- **Decision**: Thêm `"returned"` vào `orderStatuses` trong `shared.schema.js`, đặt là trạng thái kết thúc (terminal, không nằm trong `staffOrderTransitions` cho phép sửa tay, không đủ điều kiện xuất hóa đơn bán hàng mới hoặc tiếp tục thanh toán ONLINE). Đồng thời:
  - `admin-finance.controller.js`: tính đơn `returned` đã thanh toán (`paymentStatus: "paid"`) vào nhóm `refunds` (`{ $in: ["cancelled", "returned"] }`) và loại khỏi doanh thu bán (`completed`).
  - `admin-inventory-report.controller.js`: loại đơn `returned` khỏi sản lượng bán ròng (`{ $nin: ["cancelled", "returned"] }`).
  - `staff/orders/types.ts` & `admin/status.ts` & `admin/order.controller.js`: bổ sung nhãn `"Đã hoàn trả"` (tone `"danger"` / `"warning"` phù hợp) và cập nhật `frontend/tests/staff-orders.test.mjs`.
- **Rationale**: Tuân thủ đúng `Q2: A` ("chuyển đơn hàng sang trạng thái riêng **Đã hoàn trả**, tách biệt khỏi đơn hủy thường và không tính vào doanh thu Hoàn thành") và giữ đồng nhất toàn bộ bảng lọc/thống kê Staff & Admin.

### Decision 3: Hoàn lại tồn kho sản phẩm khi Staff Chấp nhận hoàn trả (`Q2: A`)
- **Decision**: Chỉ sau khi `Order.updateOne` nguyên tử chuyển `orderStatus: "returned"` và `returnRequest.status: "approved"` trả về `modifiedCount === 1`, vòng lặp cập nhật hoàn trả `Product.updateOne({ _id: item.productId, "variants.sku": item.variantSku }, { $inc: { "variants.$.stock": item.qty } })` và ghi nhật ký `AuditLog` (`action: "order.return.approve"` / `"order.return.reject"`).
- **Rationale**: Vì `Order.updateOne` là chốt chặn nguyên tử đầu tiên, tồn kho chỉ bao giờ được cộng lại tối đa 1 lần cho một đơn hàng, khớp với luồng trừ trực tiếp `variants.$.stock` trong `createOrder` (`order.controller.js` dòng 203).

### Decision 4: Tải ảnh lên Cloudinary an toàn qua Backend trước khi gửi biểu mẫu hoàn trả
- **Decision**: Khách hàng chọn tối đa 5 ảnh (`JPG`, `PNG`, `WEBP`, <= 5MB/ảnh); frontend gửi tới `POST /api/v1/orders/:id/return/upload` (bảo vệ bằng `readCookies`, `requireAuth`, `requireRole("customer")`, `protectMultipartMutation` + kiểm tra quyền sở hữu đơn đang `shipping` chưa có `returnRequest`). Backend đẩy lên thư mục Cloudinary `petjoy/returns` và trả danh sách `secure_url` (lọc domain Cloudinary hợp lệ khi submit `POST /api/v1/orders/:id/return`).
- **Rationale**: Không lộ `CLOUDINARY_API_SECRET` ra client, ngăn upload rác từ người không sở hữu đơn hoặc đơn không hợp lệ, và bảo vệ CSRF đầy đủ cho upload multipart.

