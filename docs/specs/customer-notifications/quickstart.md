# Quickstart Guide: Customer Notification Verification

**Feature**: `customer-notifications`  
**Context**: [spec.md](./spec.md)

---

## 1. Kiểm thử tự động (Automated Verification)

### Backend API Tests
```powershell
cmd /c "npm.cmd --prefix backend test -- tests/customer-notifications.test.js"
```
Kịch bản kiểm thử backend:
1. `GET /api/v1/customer/notifications` trả về đúng thông báo của user đang đăng nhập và đúng `unreadCount`.
2. Không trả về thông báo của người khác (bảo mật dữ liệu cá nhân).
3. `PATCH /:id/read` cập nhật `read: true` và giảm `unreadCount`.
4. `POST /read-all` cập nhật toàn bộ thông báo chưa đọc thành đã đọc.

### Frontend Unit Tests & Build
```powershell
cmd /c "npm.cmd --prefix frontend test"
cmd /c "npm.cmd --prefix frontend run build"
```

---

## 2. Kiểm thử thủ công trên trình duyệt (E2E Manual Scenarios)

### Kịch bản 1: Hủy đơn hàng và nhận thông báo
1. Khách hàng đặt một đơn hàng mới (hoặc mở đơn đang chờ xử lý).
2. Dùng tài khoản Staff vào chi tiết đơn hàng đó, thực hiện thao tác **Hủy đơn hàng** với lý do *"Hết hàng / Tồn kho không đủ"*.
3. Khách hàng tải lại hoặc chuyển trang:
   - Trên Header, chuông thông báo hiển thị badge đỏ (ví dụ: `1`).
   - Bấm vào chuông: Popover mở ra hiển thị thông báo: *"Đơn hàng #ORD... đã bị hủy: Hết hàng / Tồn kho không đủ"*.
   - Bấm vào thông báo: Tự động chuyển thẳng tới trang chi tiết đơn hàng đó, thông báo chuyển sang trạng thái đã đọc và badge giảm về `0`.

### Kịch bản 2: Truy cập trang Trung tâm thông báo
1. Khách hàng truy cập menu tài khoản -> chọn **"Thông báo"** (`/account/notifications`).
2. Xem danh sách toàn bộ thông báo phân theo các tab (Tất cả, Đơn hàng, Hoàn tiền, Ưu đãi).
3. Bấm nút **"Đánh dấu đã đọc tất cả"**: Tất cả thông báo chuyển sang trạng thái đã đọc.

