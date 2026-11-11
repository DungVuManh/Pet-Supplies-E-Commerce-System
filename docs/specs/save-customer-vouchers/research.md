# Research & Technical Decisions: Quản Lý và Lưu Mã Giảm Giá Khách Hàng

**Feature**: `save-customer-vouchers` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

Tài liệu này ghi nhận các nghiên cứu kỹ thuật, so sánh giải pháp và các quyết định kiến trúc cốt lõi được lựa chọn để hiện thực hóa tính năng "Lưu mã giảm giá và xem lại trên UI".

---

## 1. Mô hình lưu trữ Voucher của người dùng (Data Storage Model)

### Quyết định (Decision)
Tạo một Collection độc lập trong MongoDB có tên `CustomerVoucher` (model `customer-voucher.model.js`) với cấu trúc:
- `userId`: `ObjectId` liên kết với `User`
- `voucherId`: `ObjectId` liên kết với `Promotion`
- `code`: `String` (chuẩn hóa in hoa)
- `savedAt`: `Date` (thời điểm người dùng bấm lưu)
- **Unique Compound Index**: `{ userId: 1, voucherId: 1 }`

### Lý do (Rationale)
1. **Tránh phình Document người dùng (Unbounded Array Anti-pattern)**: Nếu nhúng danh sách mã vào `User` document, theo thời gian số lượng mã lưu ngày càng tăng sẽ làm tài liệu `User` nặng nề, làm chậm mọi thao tác đăng nhập, xem thông tin tài khoản và cập nhật hồ sơ người dùng.
2. **Khả năng mở rộng & Phân trang**: Collection riêng hỗ trợ phân trang (`paginate`), lọc và sắp xếp theo ngày lưu (`savedAt`) một cách nhẹ nhàng.
3. **Thao tác đơn giản, nguyên tử (Atomic Operations)**: Sử dụng Unique Index `{ userId: 1, voucherId: 1 }` giúp ngăn chặn 100% tình trạng người dùng click nhanh tạo ra các bản ghi trùng lặp (Idempotent).

### Các giải pháp thay thế đã xem xét (Alternatives Considered)
- **Lưu mảng mã `savedVouchers: [{ voucherId, savedAt }]` trực tiếp trong `User` model**:
  - *Ưu điểm*: Không cần tạo bảng mới, lấy được danh sách voucher ngay khi gọi thông tin user.
  - *Nhược điểm*: Vi phạm nguyên tắc thiết kế MongoDB cho mảng có độ dài không xác định; khi người dùng lưu nhiều mã trong nhiều năm, kích thước document phình to; khó join và query độc lập. Bị loại.
- **Chỉ lưu ở Client (LocalStorage)**:
  - *Ưu điểm*: Không tốn tài nguyên server.
  - *Nhược điểm*: Khi người dùng đổi máy tính/điện thoại hoặc xóa cookie trình duyệt, toàn bộ mã đã lưu bị mất; không đồng bộ được trạng thái mã đã dùng trên server. Bị loại.

---

## 2. Cơ chế lưu trữ cho Khách vãng lai và Đồng bộ khi Đăng nhập (Guest Persistence & Sync)

### Quyết định (Decision)
- **Khi chưa đăng nhập (Guest)**: Giao diện lưu danh sách mã (dưới dạng mảng mã code hoặc ID) vào `localStorage` với khóa `petjoy_saved_vouchers`.
- **Khi đăng nhập hoặc đăng ký thành công**:
  - Frontend kiểm tra `localStorage.getItem("petjoy_saved_vouchers")`.
  - Nếu có dữ liệu, tự động gửi yêu cầu `POST /api/v1/customer/vouchers/sync` mang theo mảng các mã đã lưu lên Backend.
  - Backend sử dụng lệnh `bulkWrite` với thao tác `updateOne(..., { $setOnInsert: ... }, { upsert: true })` để gộp toàn bộ mã hợp lệ vào tài khoản của người dùng mà không bị lỗi trùng lặp.
  - Sau khi đồng bộ thành công, frontend dọn sạch danh sách mã tạm trong `localStorage`.

### Lý do (Rationale)
1. **Trải nghiệm liền mạch (Zero Friction)**: Khách hàng chưa đăng nhập khi thấy mã giảm giá hấp dẫn có thể bấm lưu ngay lập tức mà không bị ngắt quãng luồng trải nghiệm bởi popup bắt buộc đăng nhập.
2. **Bảo toàn dữ liệu**: Khách hàng không bị mất các mã mình đã cất công thu thập khi chuyển từ trạng thái vãng lai sang đăng nhập để thanh toán.

### Các giải pháp thay thế đã xem xét (Alternatives Considered)
- **Bắt buộc đăng nhập ngay khi bấm "Lưu" (Strict Login Gate)**:
  - *Ưu điểm*: Đơn giản hóa kiến trúc phía backend (không cần API sync).
  - *Nhược điểm*: Tăng tỷ lệ rời bỏ (drop-off); khách hàng mới cảm thấy phiền phức khi chỉ muốn dạo xem và lưu ưu đãi. Bị loại.

---

## 3. Cơ chế xác định trạng thái Voucher trong Ví (Voucher State Calculation)

### Quyết định (Decision)
Trạng thái của từng voucher trong ví được **tính toán động (Real-time Computed State)** ngay trong câu truy vấn API hoặc trong tầng Service, dựa trên sự kết hợp giữa:
1. Dữ liệu gốc từ `Promotion`: `isActive`, `startAt`, `endAt`, `usageLimit`, `usedCount`.
2. Dữ liệu sử dụng từ `PromotionRedemption`: Kiểm tra xem đã tồn tại bản ghi với `customerKey === "user:<userId>"` và `status === "active"` hay chưa.

Phân loại thành 3 tab rõ ràng:
- **`ready` (Có hiệu lực)**: `isActive === true`, thời gian hiện tại nằm trong khoảng `[startAt, endAt)`, `usedCount < usageLimit` và người dùng chưa từng sử dụng mã này.
- **`used` (Đã sử dụng)**: Đã có bản ghi `PromotionRedemption` đang active của chính người dùng đó.
- **`expired` (Hết hiệu lực)**: Quá hạn `endAt`, hoặc voucher bị tắt `isActive === false`, hoặc hết lượt dùng toàn hệ thống `usageLimit`.

### Lý do (Rationale)
1. **Dữ liệu luôn tươi mới (No Stale Data)**: Tránh việc lưu trạng thái tĩnh (như trường `status` trong `CustomerVoucher`), vì trạng thái này phụ thuộc vào thời gian thực và hành động của Admin/hệ thống. Nếu lưu tĩnh, hệ thống sẽ phải chạy Cron Job quét định kỳ hoặc trigger cập nhật rất phức tạp và dễ lệch dữ liệu.
2. **Tự động phục hồi khi hủy đơn**: Khi đơn hàng bị hủy, `releaseVoucher()` chuyển `PromotionRedemption` sang `released`, voucher trong ví của khách tự động chuyển từ tab "Đã sử dụng" về lại tab "Có hiệu lực" mà không cần code đồng bộ thêm.

---

## 4. Trải nghiệm tích hợp tại Giỏ hàng & Thanh toán (Checkout & Cart Integration)

### Quyết định (Decision)
- Tại thẻ nhập Voucher ở màn hình Giỏ hàng (`/cart`) và Thanh toán (`/checkout`), bổ sung liên kết/nút bấm **"Chọn từ Ví voucher"** bên cạnh ô nhập text.
- Khi bấm, hiển thị một **Modal / Drawer danh sách voucher đã lưu**:
  - Tự động đánh giá điều kiện với tổng tiền hàng hiện tại (`subtotal`).
  - Voucher đủ điều kiện: Hiển thị nổi bật kèm số tiền giảm dự kiến và nút bấm **"Áp dụng"**. Bấm nút sẽ tự động điền mã và đóng modal.
  - Voucher chưa đủ điều kiện: Hiển thị mờ kèm thanh tiến trình hoặc ghi chú rõ số tiền cần mua thêm: *"Mua thêm 45.000 đ để áp dụng"*.

### Lý do (Rationale)
1. Khách hàng không cần phải mở tab mới để copy mã rồi paste vào ô thanh toán.
2. Tăng giá trị đơn hàng trung bình (AOV - Average Order Value): Khách hàng nhìn thấy mình chỉ cần mua thêm một khoản nhỏ là áp dụng được mã giảm giá lớn, từ đó kích thích mua thêm sản phẩm.

---

## 5. Danh mục Router và Quyền hạn (API & Security)

### Quyết định (Decision)
- Nhóm router khách hàng được gắn tại `/api/v1/customer/vouchers`.
- Toàn bộ các endpoint này sử dụng middleware `readCookies` và `requireAuth` (hoặc `optionalAuth` cho endpoint sync khi có token).
- Áp dụng `rateLimit` tương tự như các router người dùng khác để chống spam request.

