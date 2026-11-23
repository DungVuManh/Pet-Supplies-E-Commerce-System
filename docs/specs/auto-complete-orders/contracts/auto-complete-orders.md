# Contract: Scheduler Tự Động Hoàn Thành Đơn Hàng & Lịch Sử Hệ Thống

**Feature Directory**: `docs/specs/auto-complete-orders` | **Date**: 2026-11-12

Tính năng vận hành hoàn toàn ở tầng nghiệp vụ nền (Server Scheduler + Domain Service) theo lựa chọn `Q3: B` nên **không phát sinh HTTP API endpoint công khai mới**.

---

## 1. Domain Service Contract (`backend/src/common/order-auto-complete.js`)

### Hằng số
- `AUTO_COMPLETE_AFTER_MS = 3 * 24 * 60 * 60 * 1000` (`259_200_000` ms = 72 giờ).
- `DEFAULT_SWEEP_INTERVAL_MS = 15 * 60 * 1000` (15 phút giữa các lượt quét định kỳ).
- `DEFAULT_BATCH_SIZE = 100` (số đơn ứng viên mỗi lô truy vấn).

### `resolveShippingStartedAt(order): Date | null`
- Quét `order.statusHistory` từ cuối về đầu để tìm bản ghi có `to === "shipping"` với `at` hợp lệ (`!Number.isNaN(new Date(at).getTime())`).
- Nếu không tìm thấy trong `statusHistory`, fallback theo thứ tự `order.updatedAt`, `order.createdAt`.
- Trả về `Date` hợp lệ hoặc `null`.

### `isShippingOrderOverdue(order, now = new Date(), thresholdMs = AUTO_COMPLETE_AFTER_MS): boolean`
- Trả `true` chỉ khi:
  - `order?.channel === "online"`
  - `order?.creationState !== "pending"`
  - `order?.orderStatus === "shipping"`
  - `shippedAt = resolveShippingStartedAt(order)` tồn tại và `now.getTime() - shippedAt.getTime() >= thresholdMs`.

### `autoCompleteOverdueShippingOrders(options?): Promise<{ checkedCount: number; completedCount: number; conflictCount: number }>`
- `options`:
  - `now?: Date` (mặc định `new Date()`)
  - `thresholdMs?: number` (mặc định `AUTO_COMPLETE_AFTER_MS`)
  - `batchSize?: number` (mặc định `DEFAULT_BATCH_SIZE`, giới hạn `>= 1`)
- Hành vi:
  1. Tính `cutoff = new Date(now.getTime() - thresholdMs)`.
  2. Duyệt theo con trỏ `_id > lastId` trên bộ lọc `{ channel: "online", orderStatus: "shipping", creationState: { $ne: "pending" }, createdAt: { $lte: cutoff } }` cho tới hết các đơn ứng viên.
  3. Với mỗi đơn thỏa `isShippingOrderOverdue`, chạy atomic `Order.updateOne`:
     - Filter: `{ _id: order._id, channel: "online", orderStatus: "shipping", paymentStatus: order.paymentStatus, creationState: { $ne: "pending" } }`
     - `$set`: `{ orderStatus: "completed", ...(order.paymentMethod === "COD" ? { paymentStatus: "paid" } : {}) }`
     - `$push`: `{ statusHistory: { from: "shipping", to: "completed", actorType: "system", at: now } }`
     - Options: `{ runValidators: true }`
  4. Tăng `completedCount` khi `modifiedCount === 1`, tăng `conflictCount` khi `modifiedCount === 0` (đã có thao tác song song khác chuyển trạng thái).

### `startOrderAutoCompleteScheduler(options?): { stop: () => Promise<void>, runNow: () => Promise<...> }`
- `options`: `{ intervalMs?: number, batchSize?: number, onError?: (err) => void }`
- Hành vi:
  1. Giữ mutex in-memory (`inFlightPromise`) để bảo đảm 2 lượt quét không chạy chồng chéo.
  2. Chạy ngay 1 lượt quét bù lúc khởi tạo (catch lỗi vào `onError` hoặc `console.error` không làm sập process).
  3. Thiết lập `setInterval` gọi lặp mỗi `intervalMs` (gọi `.unref()` để không giữ event loop nếu process dừng đột ngột).
  4. Hàm `stop()` hủy timer (`clearInterval`) và chờ `inFlightPromise` (nếu đang chạy dở) kết thúc sạch trước khi ngắt kết nối MongoDB trong `shutdown()` của `server.js`.

---

## 2. Backward-Compatible Extension trên `GET /api/v1/staff/orders/:id`

Trong `statusHistory[]` trả về bởi `getStaffOrderDetail`:
- Mỗi phần tử giữ nguyên `{ from, to, at, actorName }`.
- Khi phần tử có `actorType === "system"` và không có `by`:
  - `actorName` trả về `"Hệ thống (tự động hoàn thành sau 3 ngày)"`.

