# Quickstart & Validation Guide: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến

**Feature Directory**: `docs/specs/resume-online-payment` | **Contract**: [resume-online-payment-api.yaml](./contracts/resume-online-payment-api.yaml) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Điều kiện tiên quyết

- Node.js 24.x, npm 11+, MongoDB đang chạy và cấu hình `.env` / `.env.local` hợp lệ.
- Khởi chạy cả Backend (`:3001`) và Frontend (`:3000`):

```powershell
npm run dev
```

---

## 2. Bộ kiểm thử tự động

```powershell
# Backend: kiểm thử riêng luồng tiếp tục thanh toán & hồi quy đơn hàng / SePay
npm.cmd --prefix backend test tests/resume-online-payment.test.js tests/sepay-payment.test.js tests/orders.test.js tests/customer-order-receipt.test.js

# Frontend: unit tests (services/guards)
npm.cmd --prefix frontend test

# Frontend: TypeScript & production build check (khớp Cache Components Next.js 16)
npm.cmd --prefix frontend run build
```

---

## 3. Kịch bản kiểm chứng End-to-End thủ công

### Kịch bản A — Khách đặt đơn ONLINE, thoát trang QR rồi quay lại từ Chi tiết đơn hàng (`US1`, `Q1: A`, `Q2: A`)
1. Đăng nhập tài khoản **Customer**.
2. Chọn sản phẩm và thanh toán bằng **Chuyển khoản ngân hàng (VietQR qua SePay)**.
3. Tại màn hình `/checkout/result` đang hiện mã QR, nhấn quay lại hoặc truy cập sang `/orders`.
4. Ở bảng danh sách `/orders`: kiểm tra không có nút bấm thanh toán chen vào dòng bảng, mở bấm **Chi tiết →** vào `/orders/<id>`.
5. Tại `/orders/<id>`: kiểm tra khối thanh toán hiển thị đúng phương thức **Chuyển khoản trực tuyến (VietQR)**, trạng thái **Chờ thanh toán**, và nút nổi bật **"Thanh toán ngay"**.
6. Bấm **"Thanh toán ngay"** -> điều hướng sang `/orders/<id>/pay`. Xác nhận hiển thị mã VietQR đúng số tiền, nội dung `PETJOY <orderCode>`, và đồng hồ đếm ngược giữ tiếp phần thời gian còn lại.
7. Tải lại trang (`F5`): xác minh `/orders/<id>/pay` vẫn hiển thị nguyên vẹn mã QR và bộ đếm ngược, không bị lỗi mất dữ liệu.

### Kịch bản B — Chặn hiển thị nút & chặn truy cập QR với đơn đã trả / COD / đã hủy (`US2`, `FR-003`, `FR-008`)
1. Mở `/orders/<id>` của một đơn **COD**, một đơn **ONLINE đã thanh toán**, và một đơn **ONLINE đã hủy**: xác nhận **không có nút** "Thanh toán ngay / Tiếp tục thanh toán".
2. Thử truy cập thẳng URL `/orders/<id>/pay` cho 3 đơn trên: xác nhận **không hiển thị mã QR** mà hiện thông báo rõ trạng thái tương ứng và liên kết quay về chi tiết đơn hàng.

### Kịch bản C — Thanh toán thiếu một phần & thanh toán bù (`US2`, `FR-005`)
1. Dùng webhook SePay (hoặc mock/ngrok) chuyển trước 1 phần tiền (ví dụ `100.000 đ` cho đơn `250.000 đ`).
2. Vào `/orders/<id>`: xác nhận trạng thái hiển thị **Thanh toán một phần**, hiện rõ **Đã thanh toán: 100.000 đ** và **Còn thiếu: 150.000 đ**, cùng nút **"Tiếp tục thanh toán"**.
3. Bấm vào `/orders/<id>/pay`: xác nhận mã VietQR được sinh với số tiền **150.000 đ** đúng phần còn thiếu.
4. Chuyển bù `150.000 đ` -> sau <= 4 giây tự động polling, trang chuyển sang trạng thái **"Thanh toán thành công!"**.

### Kịch bản D — Phiên QR hết hạn 15 phút (`US3`, `Q3: A`)
1. Đối với đơn `ONLINE` chưa thanh toán đã quá 15 phút kể từ lúc đặt, mở `/orders/<id>` và bấm **"Thanh toán ngay"**.
2. Tại `/orders/<id>/pay`: xác nhận **không tự gia hạn ngầm**, hiển thị màn hình *"Phiên thanh toán đã hết hạn"* kèm 2 nút:
   - **"Tạo lại mã thanh toán (gia hạn 15p)"** -> gia hạn thêm 15 phút (CSRF-protected), hiển thị lại QR và đếm ngược từ `15:00`.
   - **"Chuyển sang nhận hàng (COD)"** -> cập nhật đơn sang COD và thông báo rõ ràng / quay về chi tiết đơn.

### Kịch bản E — Bảo mật phân quyền sở hữu (`FR-011`)
1. Dùng tài khoản Customer B cố gọi `/orders/<id_cua_A>/pay` hoặc `GET /api/v1/orders/<id_cua_A>/payment` -> nhận `404 ORDER_NOT_FOUND`, không lộ thông tin đơn hàng.
2. Đăng xuất và truy cập `/orders/<id>/pay` -> chuyển hướng hoặc yêu cầu đăng nhập tài khoản khách hàng.

