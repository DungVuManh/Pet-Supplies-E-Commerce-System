# Feature Specification: Hệ Thống Thông Báo Dành Cho Khách Hàng (Customer Notification System)

**Feature Branch**: `feature/customer-notifications`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: User description: "hiện tại tính năng thông báo chưa hoạt động của khách hàng chưa hoạt động giúp tôi lên plan cho các action nên được thông báo cho người dùng như đơn hàng bị hủy , ..."

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

Hiện tại, hệ thống đã có:
- Schema `Notification` trong MongoDB (`backend/src/models/notification.model.js`).
- Màn hình thông báo nội bộ cho Quản trị viên (`/admin/notifications`).
- Mục điều hướng **"Thông báo"** trên thanh menu tài khoản khách hàng (`AccountSidebar` tại `/account`), nhưng đang trỏ vào link chết (`href="#"`) và chưa có trang hiển thị thông báo khách hàng hay chuông thông báo trên Header.

**Mục tiêu tính năng:**
Xây dựng hệ thống thông báo đa kênh trong ứng dụng (In-app Notification Center) hoàn chỉnh dành riêng cho Khách hàng (Customer), tự động phát sinh và cập nhật tức thì các biến động quan trọng liên quan đến tài khoản, đơn hàng, thanh toán và khuyến mãi.

---

## 2. Danh mục các Hành động / Sự kiện kích hoạt thông báo (Action Trigger Catalog)

Hệ thống thông báo cho khách hàng được chia thành 4 nhóm nghiệp vụ chính:

### Nhóm 1: Biến động Đơn hàng (Order Lifecycle) - *Độ ưu tiên cao nhất (P1)*
1. **Đơn hàng bị hủy (`order_cancelled`)**:
   - *Khi nào*: Đơn hàng bị hủy bởi nhân viên (hết hàng, sự cố vận chuyển) hoặc khách hàng tự hủy thành công.
   - *Nội dung*: Mã đơn hàng, lý do hủy, và thông báo hướng dẫn liên hệ hoàn tiền (nếu đơn đã thanh toán trước).
   - *Hành động khi click*: Dẫn thẳng tới chi tiết đơn hàng `/orders/:id`.
2. **Đơn hàng được xác nhận (`order_confirmed`)**:
   - *Khi nào*: Nhân viên bấm duyệt đơn hàng từ `pending` sang `confirmed`.
   - *Nội dung*: *"Đơn hàng #ORD... của bạn đã được nhân viên tiếp nhận và xác nhận thành công."*
3. **Đơn hàng đang giao (`order_shipping`)**:
   - *Khi nào*: Đơn hàng được bàn giao cho đơn vị vận chuyển (`shipping`).
   - *Nội dung*: Đơn vị vận chuyển, mã vận đơn (nếu có), dự kiến thời gian giao hàng.
4. **Giao hàng thành công (`order_completed`)**:
   - *Khi nào*: Khách hàng xác nhận "Đã nhận được hàng" hoặc hệ thống tự động hoàn tất sau thời gian giao.
   - *Nội dung*: Chúc mừng nhận hàng thành công kèm lời mời đánh giá sản phẩm để tích lũy ưu đãi.

### Nhóm 2: Đổi trả & Hoàn tiền (Returns & Refunds) - *Ưu tiên P1*
5. **Yêu cầu đổi trả được chấp thuận (`return_approved`)**:
   - *Khi nào*: Nhân viên chấp nhận yêu cầu hoàn trả ban đầu.
   - *Nội dung*: Hướng dẫn đóng gói và gửi bưu kiện về địa chỉ cửa hàng trong vòng 3 ngày.
6. **Cửa hàng đã nhận được kiện hàng hoàn trả (`return_received`)**:
   - *Khi nào*: Nhân viên bấm "Đã nhận được hàng" hoàn về.
   - *Nội dung*: Shop đang tiến hành kiểm tra sản phẩm thực tế.
7. **Hoàn tiền thành công (`return_refunded`)**:
   - *Khi nào*: Nhân viên xác nhận hoàn tiền qua chuyển khoản vào số tài khoản của khách.
   - *Nội dung*: Số tiền đã hoàn, ngân hàng thụ hưởng, mã đơn hàng tương ứng.
8. **Yêu cầu hoàn trả bị từ chối (`return_rejected`)**:
   - *Khi nào*: Nhân viên từ chối tiếp nhận yêu cầu hoặc từ chối hoàn tiền kèm lý do giải thích.

### Nhóm 3: Thanh toán & Giao dịch (Payment) - *Ưu tiên P2*
9. **Thanh toán trực tuyến thành công (`payment_success`)**:
   - *Khi nào*: Cổng thanh toán chuyển khoản SePay / Online xác nhận tiền đã vào tài khoản cửa hàng.
   - *Nội dung*: Xác nhận thanh toán đủ cho đơn hàng #ORD...
10. **Nhắc nhở đơn hàng chờ thanh toán (`payment_reminder`)**:
    - *Khi nào*: Đơn thanh toán online quá 15 phút chưa hoàn tất (trước khi hết hạn).

### Nhóm 4: Khuyến mãi & Tài khoản (Marketing & Account) - *Ưu tiên P3*
11. **Nhận được mã giảm giá mới (`voucher_reward`)**:
    - *Khi nào*: Hệ thống tặng voucher sinh nhật thú cưng, voucher tri ân khách hàng thân thiết.
12. **Cảnh báo bảo mật tài khoản (`account_security`)**:
    - *Khi nào*: Đổi mật khẩu thành công hoặc phát hiện đăng nhập bất thường.

---

## 3. Kiến trúc Giao diện Người dùng (UI/UX Specification)

### 3.1. Chuông thông báo trên Header Storefront (`StorefrontHeader`)
- Nằm cạnh icon Giỏ hàng và Tra cứu đơn hàng trên Header:
  - Icon Chuông (`Bell`) kèm **Badge đỏ hiển thị số lượng thông báo chưa đọc** (ví dụ: `3`).
  - Khi click vào chuông: Mở **Dropdown Popover xem nhanh** danh sách 5 thông báo mới nhất.
  - Phía dưới dropdown có nút *"Xem tất cả thông báo"* dẫn tới trang `/account/notifications`.
  - Nút bấm nhanh *"Đánh dấu đã đọc tất cả"*.

### 3.2. Trang Trung tâm Thông báo Khách hàng (`/account/notifications`)
- Nằm trong cụm tài khoản khách hàng, giữ nguyên layout `AccountSidebar`.
- Bộ lọc theo tab:
  - **Tất cả**
  - **Đơn hàng & Giao hàng**
  - **Hoàn trả & Hoàn tiền**
  - **Ưu đãi & Khuyến mãi**
- Danh sách thông báo dạng Card trực quan:
  - Icon phân loại màu sắc (Hổ phách cho Hủy/Cảnh báo, Xanh dương cho Giao hàng, Xanh lá cho Hoàn thành/Tiền về, Tím cho Voucher).
  - Trạng thái chưa đọc: Nền xanh nhạt / chấm tròn xanh báo hiệu chưa đọc.
  - Thời gian thông báo theo định dạng thân thiện: *"Vừa xong"*, *"5 phút trước"*, *"Hôm qua"*, *"14/11/2026"*.
  - Nhấp vào card: Đánh dấu đã đọc và chuyển hướng đến trang chi tiết đối tượng tương ứng (chi tiết đơn hàng, ví voucher, v.v.).

---

## 4. Đặc tả Kỹ thuật Backend & API Contract

### 4.1. Mở rộng Model `Notification` (`backend/src/models/notification.model.js`)
Bổ sung các trường phục vụ hiển thị cho khách hàng:
- `title`: `String` (Tiêu đề ngắn gọn, ví dụ: *"Đơn hàng #ORD12345 đã bị hủy"*).
- `message`: `String` (Chi tiết thông báo).
- `type`: `Enum` (`["order_cancelled", "order_confirmed", "order_shipping", "order_completed", "return_approved", "return_received", "return_refunded", "return_rejected", "payment_success", "voucher_received", "system"]`).
- `link`: `String` (Đường dẫn chuyển hướng trong frontend, ví dụ: `"/orders/6734..."`).
- `read`: `Boolean` (Mặc định `false`).
- `readAt`: `Date` (Thời điểm người dùng mở đọc).

### 4.2. API Endpoints cho Khách hàng
1. `GET /api/v1/customer/notifications`:
   - Truy xuất danh sách thông báo của tài khoản đang đăng nhập (`userId = req.user._id`).
   - Hỗ trợ phân trang (`page`, `limit`), bộ lọc (`type`, `unreadOnly`).
   - Trả về `unreadCount` để render badge chuông trên Header.
2. `PATCH /api/v1/customer/notifications/:id/read`:
   - Đánh dấu 1 thông báo là đã đọc.
3. `POST /api/v1/customer/notifications/read-all`:
   - Đánh dấu tất cả thông báo của khách là đã đọc.

### 4.3. Service Helper kích hoạt thông báo tự động (Non-blocking Trigger)
Tạo helper `createCustomerNotification({ userId, orderId, type, title, message, link })`:
- Được gọi tự động trong các controller:
  - Khi Staff hoặc Khách hủy đơn -> Bắn thông báo `order_cancelled`.
  - Khi Staff đổi trạng thái đơn sang `confirmed`, `shipping` -> Bắn thông báo tương ứng.
  - Khi luồng hoàn trả chuyển dịch trạng thái -> Bắn thông báo `return_*`.
- Ràng buộc quan trọng: **Lỗi khi tạo thông báo không được phép làm gián đoạn (rollback) transaction chính của đơn hàng**.

---

## 5. Tiêu chí thành công (Acceptance & Success Criteria)

1. Khách hàng đăng nhập nhìn thấy icon chuông và số thông báo chưa đọc cập nhật tự động trên thanh Header.
2. Khi nhân viên hủy một đơn hàng (hoặc duyệt đơn, giao hàng, duyệt hoàn tiền), thông báo tương ứng xuất hiện ngay trong trung tâm thông báo của khách hàng.
3. Khách hàng có thể bấm vào thông báo để chuyển thẳng đến màn hình chi tiết đơn hàng đó.
4. Có thể đánh dấu đọc từng thông báo hoặc "Đọc tất cả".
5. Hệ thống chạy ổn định, không làm chậm các API vận hành cốt lõi.

