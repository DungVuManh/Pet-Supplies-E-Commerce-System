# Quickstart Validation Guide: Bỏ Qua Chuyển Khoản Cho Đơn Dưới 1.000đ

**Feature**: `bypass-transfer-under-1000`  
**Date**: 2026-11-14  

Tài liệu này hướng dẫn cách kiểm thử nhanh luồng tự động bỏ qua chuyển khoản cho đơn hàng dưới 1.000 VNĐ ở cả Backend và Frontend.

---

## 1. Điều kiện Tiên quyết (Prerequisites)

- Đảm bảo môi trường phát triển đã cài đặt đầy đủ các gói:
  ```powershell
  npm --prefix backend test
  npm --prefix frontend test
  ```
- Khởi động backend và frontend nếu muốn test giao diện thủ công:
  ```powershell
  npm run dev
  ```

---

## 2. Kịch bản Kiểm thử Tự động (Automated Test Scenarios)

### Kịch bản 1: Đơn hàng `ONLINE` có `total < 1000` (ví dụ 0đ hoặc 500đ)
- **Mục tiêu**: Xác thực Backend tự động gán `paymentStatus: "paid"`, `paidAmount: total`, không gán `paymentExpiredAt`, và tạo 1 bản ghi `Payment` trạng thái `"paid"`.
- **Lệnh chạy**:
  ```powershell
  npm --prefix backend test -- tests/orders.test.js
  ```
- **Kỳ vọng**:
  - `response.status === 201`
  - `response.body.data.order.paymentStatus === "paid"`
  - `response.body.data.order.paidAmount === total`
  - `response.body.data.order.paymentExpiredAt === undefined`
  - `Payment.create` được gọi với `{ status: "paid", amount: total }`

### Kịch bản 2: Đơn hàng `ONLINE` có `total >= 1000` (ví dụ 100.000đ)
- **Mục tiêu**: Đảm bảo không làm ảnh hưởng đến đơn hàng bình thường.
- **Kỳ vọng**:
  - `paymentStatus === "unpaid"` (hoặc `"pending"`)
  - `paidAmount === 0`
  - Không tự động tạo `Payment` đã thanh toán

---

## 3. Kịch bản Kiểm thử Thủ công trên Trình duyệt (E2E / Browser Flow)

### Kịch bản 3.1: Đặt hàng áp voucher giảm giá khiến `total < 1000`
1. Đăng nhập hoặc đặt hàng với tư cách khách (Guest).
2. Thêm 1 sản phẩm vào giỏ hàng hoặc bấm **Mua ngay**.
3. Tại trang `/checkout`:
   - Nhập thông tin người nhận và địa chỉ.
   - Nhập mã voucher giảm giá đặc biệt (hoặc cấu hình voucher giảm gần hết giá trị đơn hàng, chỉ còn 0đ hoặc < 1.000đ).
   - Chọn phương thức thanh toán: **"Chuyển khoản ngân hàng (VietQR / SePay)"**.
   - Bấm nút **"Đặt hàng"**.
4. **Kiểm tra kết quả**:
   - URL chuyển hướng đến: `/checkout/result?orderCode=PA...&total=0&paymentMethod=ONLINE&paymentProvider=sepay&isPaid=true`.
   - **Xác nhận**:
     - KHÔNG xuất hiện mã QR VietQR (`SepayTransferCard`).
     - KHÔNG có đồng hồ đếm ngược 15 phút.
     - Hiển thị ngay màn hình **"Đặt hàng thành công" / "Thanh toán thành công"** với badge màu xanh lá.
     - Kiểm tra trong database: đơn hàng có `paymentStatus: "paid"`, không bị tự động hủy sau 15 phút.

### Kịch bản 3.2: Đặt hàng giá trị bình thường (`total >= 1000`)
1. Thêm sản phẩm bình thường không áp voucher (hoặc voucher giảm ít, tổng tiền ví dụ 250.000đ).
2. Chọn phương thức "Chuyển khoản ngân hàng" và bấm "Đặt hàng".
3. **Kiểm tra kết quả**:
   - Vẫn hiển thị mã QR VietQR và đếm ngược 15 phút như bình thường.
