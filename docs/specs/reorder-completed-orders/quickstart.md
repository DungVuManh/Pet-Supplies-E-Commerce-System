# Quickstart Validation Guide: Mua Lại Đơn Hàng Đã Hoàn Thành (Reorder Completed Orders)

**Feature**: `reorder-completed-orders`  
**Date**: 2026-11-14  

Tài liệu này hướng dẫn cách kiểm thử tự động và thủ công tính năng Mua lại đơn hàng đã hoàn thành.

---

## 1. Điều kiện Tiên quyết (Prerequisites)

- Đảm bảo môi trường phát triển đã cài đặt các gói đầy đủ:
  ```powershell
  npm.cmd --prefix backend test
  npm.cmd --prefix frontend test
  ```

---

## 2. Kịch bản Kiểm thử Tự động (Automated Test Scenarios)

### Kịch bản 1: Mua lại đơn hàng hoàn thành hợp lệ (Toàn bộ sản phẩm còn hàng)
- **Mục tiêu**: Gọi `POST /api/v1/orders/:id/reorder` với đơn hàng `orderStatus: "completed"`.
- **Kỳ vọng**:
  - `status: 200`
  - `body.success: true`
  - Các sản phẩm trong `order.items` được thêm vào `Cart` của khách hàng với số lượng chính xác.
  - `body.data.addedCount > 0` và `body.data.unavailableCount === 0`.

### Kịch bản 2: Từ chối mua lại đơn hàng chưa hoàn thành
- **Mục tiêu**: Gọi `POST /api/v1/orders/:id/reorder` với đơn hàng đang ở trạng thái `pending`, `shipping`, hoặc `cancelled`.
- **Kỳ vọng**:
  - `status: 400`
  - `body.error.code: "ORDER_NOT_COMPLETED"`
  - Giỏ hàng của khách hàng không bị thay đổi.

### Kịch bản 3: Từ chối khi cố tình mua lại đơn hàng của khách hàng khác
- **Mục tiêu**: Tài khoản A gọi reorder với `orderId` của Tài khoản B.
- **Kỳ vọng**:
  - `status: 404` hoặc `403`
  - Giỏ hàng của Tài khoản A không bị ảnh hưởng.

### Kịch bản 4: Xử lý khi một phần sản phẩm hết hàng hoặc ngừng bán
- **Mục tiêu**: Đơn hàng có 2 sản phẩm, 1 sản phẩm còn hàng và 1 sản phẩm có tồn kho bằng 0 (hoặc `isActive === false`).
- **Kỳ vọng**:
  - `status: 200`
  - `body.data.addedCount === 1`
  - `body.data.unavailableCount === 1`
  - Giỏ hàng chỉ thêm sản phẩm còn hàng.

### Kịch bản 5: Xử lý khi toàn bộ sản phẩm trong đơn cũ đều hết hàng
- **Mục tiêu**: Đơn hàng cũ mà tất cả các sản phẩm đều không còn tồn kho khả dụng.
- **Kỳ vọng**:
  - `status: 400`
  - `body.error.code: "ALL_ITEMS_UNAVAILABLE"`
  - `body.data.unavailableItems` chứa danh sách chi tiết các sản phẩm hết hàng.

---

## 3. Kịch bản Kiểm thử Thủ công trên Giao diện (E2E / Browser Flow)

### Kịch bản 3.1: Mua lại từ trang Chi tiết đơn hàng (`/orders/[id]`)
1. Đăng nhập với tài khoản khách hàng có ít nhất 1 đơn hàng trạng thái **"Hoàn thành"**.
2. Truy cập `/orders` và bấm vào đơn hàng đó để mở trang Chi tiết đơn hàng.
3. **Kiểm tra giao diện**:
   - Ở thanh tóm tắt bên phải (sidebar), xuất hiện nút **"Mua lại đơn hàng"** (màu xanh thương hiệu).
4. **Bấm "Mua lại đơn hàng"**:
   - Nút hiển thị trạng thái đang xử lý (`Đang xử lý...` / disabled).
   - Hệ thống tự động thêm sản phẩm vào giỏ hàng và chuyển hướng sang `/cart`.
   - Badge số lượng giỏ hàng trên thanh điều hướng TopBar tăng tương ứng.
   - Tại trang `/cart`, các sản phẩm từ đơn hàng cũ xuất hiện đầy đủ trong giỏ hàng với giá niêm yết hiện hành.

### Kịch bản 3.2: Mua lại từ Bảng danh sách đơn hàng (`/orders`)
1. Truy cập trang `/orders`.
2. Tìm đơn hàng có badge màu xanh lá **"Hoàn thành"**.
3. Tại cột Thao tác, bấm nút **"Mua lại"**.
4. Trình duyệt thêm sản phẩm vào giỏ và chuyển hướng sang `/cart` thành công.
