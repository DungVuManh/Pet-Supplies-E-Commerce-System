# Quickstart & Verification Guide: Quản Lý và Lưu Mã Giảm Giá Khách Hàng

**Feature**: `save-customer-vouchers` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

Tài liệu này hướng dẫn cách kiểm thử, xác thực luồng hoạt động (End-to-End) của tính năng Lưu mã giảm giá và Ví voucher khách hàng trên hệ thống Petjoy.

---

## 1. Điều kiện tiên quyết (Prerequisites)

1. Máy chủ Backend đang chạy:
   ```powershell
   cd backend
   npm run dev
   # Server lắng nghe tại http://localhost:3001
   ```
2. Ứng dụng Frontend đang chạy:
   ```powershell
   cd frontend
   npm run dev
   # Webapp tại http://localhost:3000
   ```
3. Đã có ít nhất 1-2 voucher đang hoạt động (`isActive = true`) trong cơ sở dữ liệu (có thể chạy `npm run seed` tại `backend` nếu DB trống).
4. Chuẩn bị 1 tài khoản người dùng thử nghiệm (Ví dụ: `customer@petjoy.test`).

---

## 2. Các kịch bản kiểm thử & Xác thực (Verification Scenarios)

### Kịch bản 1: Khách hàng đã đăng nhập lưu và xem lại mã trong Ví Voucher

1. **Bước 1**: Đăng nhập tài khoản tại `http://localhost:3000/login`.
2. **Bước 2**: Truy cập trang Khuyến mãi: `http://localhost:3000/voucher`.
3. **Bước 3**: Tìm một thẻ voucher chưa lưu, nhấn nút **"Lưu"**.
   - *Kết quả mong đợi*: Nút lập tức chuyển thành **"Đã lưu"**, hiển thị Toast: *"Đã lưu mã giảm giá vào ví!"*.
4. **Bước 4**: Truy cập trang cá nhân: `http://localhost:3000/account/vouchers`.
   - *Kết quả mong đợi*: Thấy voucher vừa lưu xuất hiện trong tab **"Có hiệu lực"** với đầy đủ thông tin (mã, mức giảm, đơn tối thiểu, hạn dùng).
5. **Bước 5**: Nhấn nút **"Sao chép mã"** hoặc **"Dùng ngay"**.
   - *Kết quả mong đợi*: Mã được copy vào clipboard hoặc chuyển hướng đến trang danh mục sản phẩm.

---

### Kịch bản 2: Khách vãng lai lưu mã trên trình duyệt và tự động đồng bộ khi đăng nhập

1. **Bước 1**: Mở trình duyệt ở chế độ Ẩn danh (Guest, chưa đăng nhập).
2. **Bước 2**: Truy cập `http://localhost:3000/voucher`.
3. **Bước 3**: Nhấn nút **"Lưu"** trên một thẻ voucher bất kỳ (ví dụ: `PETJOY10`).
   - *Kết quả mong đợi*: Nút đổi thành **"Đã lưu"**, mã được lưu vào `localStorage.petjoy_saved_vouchers`.
4. **Bước 4**: Nhấn "Đăng nhập" trên thanh điều hướng và hoàn tất đăng nhập tài khoản.
5. **Bước 5**: Kiểm tra Network request và trang `http://localhost:3000/account/vouchers`.
   - *Kết quả mong đợi*: Có request `POST /api/v1/customer/vouchers/sync` được gửi đi, mã `PETJOY10` xuất hiện ngay trong Ví voucher của tài khoản và `localStorage` được dọn sạch.

---

### Kịch bản 3: Chọn và áp dụng trực tiếp mã đã lưu tại bước Thanh toán

1. **Bước 1**: Thêm sản phẩm vào giỏ hàng sao cho tổng tiền đạt đơn tối thiểu của mã đã lưu.
2. **Bước 2**: Điều hướng đến trang Thanh toán: `http://localhost:3000/checkout`.
3. **Bước 3**: Tại phần mã giảm giá, nhấn liên kết **"Chọn từ Ví voucher"**.
   - *Kết quả mong đợi*: Một modal/drawer mở ra hiển thị danh sách các mã trong ví của người dùng.
4. **Bước 4**: Quan sát thấy mã thỏa mãn điều kiện có nút **"Áp dụng"** màu xanh nổi bật. Nhấn **"Áp dụng"**.
   - *Kết quả mong đợi*: Mã tự động điền vào form thanh toán, tính toán lại tổng tiền và trừ số tiền giảm giá chính xác theo đúng spec `order-pricing`.

---

### Kịch bản 4: Vòng đời voucher — Chuyển trạng thái khi đặt hàng và hoàn trả khi hủy đơn

1. **Bước 1**: Hoàn tất đặt hàng với mã giảm giá đã chọn ở Kịch bản 3.
2. **Bước 2**: Quay lại trang `http://localhost:3000/account/vouchers`.
   - *Kết quả mong đợi*: Nếu mã là loại `oncePerCustomer: true`, mã này tự động chuyển từ tab **"Có hiệu lực"** sang tab **"Đã sử dụng"**.
3. **Bước 3**: Vào mục Đơn hàng của tôi (`/account/orders`), chọn đơn hàng vừa đặt và nhấn **"Hủy đơn hàng"**.
4. **Bước 4**: Quay lại trang `http://localhost:3000/account/vouchers`.
   - *Kết quả mong đợi*: Mã giảm giá tự động được phục hồi về tab **"Có hiệu lực"**, sẵn sàng để áp dụng cho đơn mua tiếp theo.

---

## 3. Lệnh chạy kiểm thử tự động (Automated Tests)

Chạy bộ kiểm thử tích hợp backend cho Customer Voucher:
```powershell
cd backend
npm run test tests/customer-vouchers.test.js
```
Chạy bộ kiểm thử frontend components:
```powershell
cd frontend
npm run test features/vouchers
```

