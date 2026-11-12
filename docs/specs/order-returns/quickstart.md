# Quickstart & Validation Guide: Yêu Cầu Hoàn Trả Đơn Hàng & Duyệt Hoàn Đơn

**Feature Directory**: `docs/specs/order-returns` | **Contract**: [order-returns-api.yaml](./contracts/order-returns-api.yaml) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Điều kiện tiên quyết

- Node.js 24.x, npm 11+, MongoDB đang chạy, cấu hình biến Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) trong `backend/.env`.
- Khởi chạy cả Backend & Frontend:

```powershell
npm run dev
```

---

## 2. Bộ kiểm thử tự động

```powershell
# Backend: kiểm thử hoàn trả, Cloudinary upload mock, quyền staff, auto-complete & hồi quy đơn hàng
npm.cmd --prefix backend test tests/order-returns.test.js tests/admin-permissions.test.js tests/order-status.test.js tests/customer-order-receipt.test.js tests/auto-complete-orders.test.js tests/orders.test.js

# Frontend: unit tests & TypeScript production build
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
```

---

## 3. Kịch bản kiểm chứng End-to-End thủ công

### Kịch bản A — Khách hàng gửi yêu cầu hoàn trả hàng kèm ảnh Cloudinary (`US1`, `Q1: A`)
1. Đăng nhập tài khoản **Customer** có đơn hàng ở trạng thái **Đang giao** (`shipping`).
2. Mở `/orders/<id>`: xác minh hiển thị cả hai nút **"Đã nhận được hàng"** và **"Hoàn trả hàng"**.
3. Nhấn **"Hoàn trả hàng"** -> mở `/orders/<id>/return`.
4. Thử chọn lý do *"Hàng có vấn đề"*, nhập mô tả nhưng chưa chọn ảnh -> xác minh hệ thống chặn gửi và yêu cầu ít nhất 1 ảnh.
5. Chọn 1–2 ảnh JPG/PNG, bấm gửi -> ảnh được tải lên Cloudinary và yêu cầu chuyển sang **"Chờ xử lý"**; quay về `/orders/<id>` xác nhận hiển thị thông tin yêu cầu hoàn trả và tạm ẩn nút **"Đã nhận được hàng"**.
6. Với một đơn khác chọn lý do *"Chưa nhận được hàng"*: xác minh có thể gửi thành công mà không bắt buộc đính kèm ảnh.

### Kịch bản B — Staff xem danh sách, xem ảnh và Chấp nhận hoàn trả (`US2`, `Q2: A`)
1. Đăng nhập tài khoản **Staff**, mở mục **Yêu cầu hoàn trả** (`/staff/returns`) trên thanh menu bên trái.
2. Lọc theo tab **Chờ xử lý** và mở chi tiết yêu cầu (`/staff/returns/<id>`).
3. Kiểm tra ảnh minh chứng từ Cloudinary hiển thị rõ ràng (bấm phóng to xem chi tiết).
4. Bấm **"Chấp nhận hoàn trả"** và xác nhận:
   - Yêu cầu chuyển sang **"Đã chấp nhận"**, đơn hàng chính chuyển sang **"Đã hoàn trả"** (`returned`).
   - Tồn kho sản phẩm trong đơn được tự động cộng lại đúng số lượng.
   - Nếu đơn đã thanh toán `ONLINE`, hệ thống hiển thị badge **"Cần hoàn tiền"** phục vụ đối soát.
   - Tài chính & Báo cáo không cộng đơn `"Đã hoàn trả"` vào doanh thu Hoàn thành.

### Kịch bản C — Staff Từ chối hoàn trả kèm lý do (`US2`, `Q3: A`)
1. Mở một yêu cầu đang **Chờ xử lý** khác trên `/staff/returns/<id>`.
2. Thử bấm **"Từ chối hoàn trả"** khi để trống lý do -> bị chặn (yêu cầu tối thiểu 5 ký tự).
3. Nhập lý do từ chối cụ thể và xác nhận -> yêu cầu chuyển sang **"Đã từ chối"**.
4. Quay lại `/orders/<id>` bằng tài khoản **Customer**: xác nhận thấy rõ **lý do từ chối**, nút **"Đã nhận được hàng"** hoạt động trở lại bình thường, và **không** còn nút gửi lại yêu cầu hoàn trả.

### Kịch bản D — Bảo vệ tự động hoàn thành sau 3 ngày & phân quyền (`US1`, `US3`)
1. Kiểm tra một đơn `shipping` quá 72 giờ nhưng đang có `returnRequest.status === "pending"` -> chạy `autoCompleteOverdueShippingOrders` xác nhận đơn **không** bị tự động hoàn thành.
2. Kiểm tra Customer B truy cập `/orders/<id_cua_A>/return` hoặc `POST /api/v1/orders/<id_cua_A>/return` -> nhận `404`. Customer/Admin truy cập `/api/v1/staff/returns` -> nhận `403 FORBIDDEN`.

