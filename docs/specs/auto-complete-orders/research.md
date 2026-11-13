# Research: Tự Động Hoàn Thành Đơn Hàng Sau 3 Ngày Đang Giao

**Feature Directory**: `docs/specs/auto-complete-orders` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

## 1. Khảo sát hiện trạng mã nguồn

### 1.1. Quy trình chuyển trạng thái đơn hàng trực tuyến hiện tại
- Luồng trạng thái đơn hàng trực tuyến (`channel: "online"`) gồm 6 trạng thái trong `backend/src/models/shared.schema.js`: `pending -> confirmed -> processing -> shipping -> completed` (và `cancelled` từ `pending`/`confirmed`).
- Theo [order.validator.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/validators/order.validator.js) (`staffOrderTransitions.shipping = []`), Staff chỉ có quyền cập nhật tối đa đến `shipping`. Việc chuyển `shipping -> completed` hiện chỉ có duy nhất [`confirmCustomerOrderReceipt`](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/order-status.controller.js) (`PATCH /api/v1/orders/:id/receipt-confirmation`) dành cho khách đã đăng nhập sở hữu đơn.
- **Vấn đề hiện tại**: Trong [server.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/server.js) và toàn bộ `backend/src/` chưa có bộ lập lịch chạy nền nào. Khi khách hàng không bấm "Đã nhận được hàng" (hoặc là đơn khách vãng lai không đăng nhập), đơn hàng bị kẹt vĩnh viễn ở trạng thái `shipping`.

### 1.2. Dữ liệu mốc thời gian giao hàng, thanh toán và các module liên quan
- **Mốc thời gian vào `shipping`**: Khi nhân viên chuyển đơn sang `shipping`, [`updateStaffOrderStatus`](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/order-status.controller.js) luôn thêm `{ from: input.expectedStatus, to: "shipping", by: request.user._id, at: new Date() }` vào `Order.statusHistory`.
- **Chỉ mục sẵn có trên `Order`** ([order.model.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/models/order.model.js)): Đã có compound index `{ orderStatus: 1, createdAt: -1 }`.
- **Thanh toán COD khi nhận hàng**: Trong `confirmCustomerOrderReceipt`, đơn `completed` tự động đặt `paymentStatus: "paid"`. Theo `Q1: A`, tác vụ tự động hoàn thành sau 3 ngày với đơn `COD` cũng cập nhật `paymentStatus: "paid"`.
- **Ảnh hưởng liên module**:
  - [review.controller.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/review.controller.js): `getOrderCompletedAt(order)` đọc phần tử `to === "completed"` trong `statusHistory` để tính hạn đánh giá -> tự động tương thích.
  - [staff-analytics.helpers.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/staff-analytics.helpers.js): lọc theo `$$h.by == actor` nên bản ghi tự động của hệ thống (không có `by`) không bị tính nhầm thành KPI cá nhân của nhân viên.
  - [order.controller.js](file:///E:/Pet-Supplies-E-Commerce-System/backend/src/controllers/order.controller.js) (`getStaffOrderDetail`): ánh xạ `actorName` từ `h.by`, nếu `h.by` trống sẽ hiển thị `"Hệ thống / Không có thông tin"` trên giao diện Staff. Bổ sung trường tùy chọn `actorType: "system"` trên `statusHistorySchema` giúp hiển thị rõ `"Hệ thống (tự động hoàn thành sau 3 ngày)"` mà không làm thay đổi giao diện Customer (`Q3: B`).

---

## 2. Các quyết định kỹ thuật (Phase 0 Decisions)

### Decision 1: Thực thi bằng Scheduler định kỳ gắn vòng đời `server.js` + Quét bù khi khởi động
- **Decision**: Tạo module nghiệp vụ `backend/src/common/order-auto-complete.js` cung cấp hàm xử lý theo lô [`autoCompleteOverdueShippingOrders`](../../../backend/src/common/order-auto-complete.js) và bộ lập lịch [`startOrderAutoCompleteScheduler`](../../../backend/src/common/order-auto-complete.js). `backend/src/server.js` khởi động scheduler ngay sau `createModelIndexes()` (chạy ngay 1 lượt quét bù lúc khởi động và lặp lại mỗi 15 phút bằng `setInterval`), đồng thời dừng sạch timer trong `shutdown()`.
- **Rationale**:
  - Giữ nguyên nguyên tắc `CLAUDE.md`: `createApp(config)` không tự mở timer/side-effect, giúp toàn bộ HTTP tests hiện tại chạy cô lập 100%.
  - Quét bù ngay khi `server.js` khởi động lại bảo đảm đáp ứng `FR-008` / `SC-004` nếu máy chủ từng tạm ngưng vào đúng giờ thứ 72.
  - Không phải cài thêm thư viện ngoài (`node-cron`), gọn nhẹ, dễ test đơn vị bằng fake timers hoặc gọi trực tiếp `autoCompleteOverdueShippingOrders({ now })`.
- **Alternatives considered**:
  - *Kiểm tra lười (lazy evaluation) ngay trong các API `GET` đọc đơn hàng*: Không xử lý được các đơn quá hạn khi không có ai mở trang chi tiết (làm báo cáo doanh số Admin bị chậm trễ) và dễ làm vỡ các mock chuỗi query Mongoose trong unit test hiện có.

### Decision 2: Truy vấn theo cursor `_id` tận dụng index `orderStatus + createdAt`
- **Decision**: Lọc ứng viên bằng `{ channel: "online", orderStatus: "shipping", creationState: { $ne: "pending" }, createdAt: { $lte: cutoff } }` (với `cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000)`), phân trang theo con trỏ `_id > lastId` với `sort({ _id: 1 }).limit(batchSize)` (mặc định `batchSize = 100`).
- **Rationale**: Mọi đơn hàng bắt buộc phải có `createdAt <= shippedAt`, nên bộ lọc `createdAt <= cutoff` luôn an toàn 100% trong khi loại bỏ ngay toàn bộ đơn mới tạo dưới 72 giờ ở tầng index MongoDB. Sau đó ở tầng ứng dụng, [`resolveShippingStartedAt`](../../../backend/src/common/order-auto-complete.js) lấy mốc `at` mới nhất của mục `to === "shipping"` trong `statusHistory` (fallback `order.updatedAt || order.createdAt`) và kiểm tra `now - shippedAt >= 72h`.
- **Alternatives considered**:
  - *Dùng Aggregation `$filter` trên `statusHistory` trực tiếp khi update*: Không cần thiết vì số đơn `shipping` > 72h mỗi lô nhỏ và kiểm tra trong JS giữ filter MongoDB đơn giản, dễ mock bằng Vitest.

### Decision 3: Cập nhật nguyên tử (Atomic Conditional Update) chống ghi đè & trùng lặp
- **Decision**: Với mỗi đơn quá hạn 72h, thực thi `Order.updateOne` có điều kiện:
  - Filter: `{ _id: order._id, channel: "online", orderStatus: "shipping", paymentStatus: order.paymentStatus, creationState: { $ne: "pending" } }`
  - Update: `$set: { orderStatus: "completed", ...(order.paymentMethod === "COD" ? { paymentStatus: "paid" } : {}) }`, `$push: { statusHistory: { from: "shipping", to: "completed", actorType: "system", at: now } }`, `{ runValidators: true }`.
- **Rationale**: Tương thích hoàn toàn với MongoDB standalone (`CLAUDE.md`). Nếu khách hàng bấm `"Đã nhận được hàng"` đúng thời điểm scheduler chạy, chỉ 1 lệnh `updateOne` có `modifiedCount === 1`; lệnh còn lại nhận `modifiedCount === 0` và bỏ qua an toàn (`SC-003`), không bao giờ sinh 2 dòng `shipping -> completed`.

### Decision 4: Không thêm UI nhắc hạn trên Customer & Không tạo Notification (`Q3: B`)
- **Decision**: Giữ nguyên giao diện Customer (`/orders`, `/orders/[id]`) và không ghi document mới vào `Notification`. Chỉ bổ sung `actorType: { type: String, enum: ["user", "system"] }` (tùy chọn) trên `statusHistorySchema` và cập nhật `getStaffOrderDetail` trả `actorName: "Hệ thống (tự động hoàn thành sau 3 ngày)"` khi `actorType === "system"`.
- **Rationale**: Tuân thủ chính xác lựa chọn `Q3: B` và quy tắc giữ giao diện tối giản.

