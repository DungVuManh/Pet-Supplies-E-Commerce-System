# Feature Specification: Staff Xem Các Đánh Giá Từ Khách Hàng Cho Sản Phẩm (Staff Product Reviews)

**Feature Branch**: `feature/staff-product-reviews`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: User description: "staff xem các đánh giá từ khách hàng cho sản phẩm"

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Bối cảnh hiện tại
- **Hệ thống đánh giá khách hàng (Customer Reviews)**:
  - Khách hàng có thể viết đánh giá (1-5 sao, bình luận, đính kèm tối đa 2 ảnh) cho các sản phẩm đã mua qua đơn hàng hoàn tất (`Review` model trong MongoDB).
  - Khách hàng có thể xem đánh giá của mình tại `/reviews` và xem đánh giá công khai trên trang chi tiết sản phẩm khách hàng (`/listProduct/detailProduct?id=...`).
  - Điểm trung bình `ratingAvg` và số lượng `ratingCount` đã được cập nhật tự động vào model `Product`.
- **Hạn chế đối với nhân viên (Staff Workspace)**:
  - Trên màn hình chi tiết sản phẩm của nhân viên (`/staff/products/[sku]`), nhân viên chỉ xem được thông tin giá, thuộc tính, tồn kho và mô tả. **Hoàn toàn chưa có khu vực xem đánh giá, nhận xét của khách hàng**.
  - Nhân viên không nắm được phản hồi thực tế của khách hàng (sản phẩm có bị lỗi, khách khen hay chê chất lượng/mùi vị/đóng gói ra sao) để kịp thời tư vấn, chăm sóc khách hàng hoặc báo cáo bộ phận kho vận / chất lượng.
  - Tên và thông tin khách hàng ở API công khai bị che giấu (`maskName`), nhân viên không thể đối chiếu xem đánh giá đó thuộc về đơn hàng nào hoặc khách hàng nào để hỗ trợ đổi trả nếu khách không hài lòng.

### 1.2. Mục tiêu tính năng
Xây dựng phân hệ **Xem đánh giá từ khách hàng cho sản phẩm trong không gian làm việc của nhân viên (Staff Workspace)**:
1. **Tại trang Chi tiết sản phẩm (`/staff/products/[sku]`)**:
   - Hiển thị khối **"Đánh giá từ khách hàng"** trực quan và chuyên nghiệp.
   - Thống kê tổng quan: Điểm trung bình (⭐), tổng số đánh giá, thanh tỉ lệ phân bổ theo từng mức sao (5★, 4★, 3★, 2★, 1★).
   - Bộ lọc và sắp xếp linh hoạt: Lọc theo mức sao (1-5★ hoặc Tất cả), lọc các đánh giá có hình ảnh đính kèm, sắp xếp theo mới nhất / sao cao nhất / sao thấp nhất.
   - Danh sách đánh giá chi tiết: Hiển thị tên đầy đủ của khách hàng (không bị che giấu), thông tin liên hệ (email/SĐT), huy hiệu mã đơn hàng liên kết (nếu có), số sao, ngày giờ đánh giá, nội dung nhận xét và ảnh chụp thực tế từ khách.
   - Hỗ trợ phóng to xem ảnh đính kèm của khách hàng qua modal xem ảnh chất lượng cao.
   - Phân trang gọn gàng (mặc định 5 hoặc 10 đánh giá / trang).
2. **Tại trang Danh sách sản phẩm (`/staff/products`)**:
   - Hiển thị điểm đánh giá trung bình ⭐ và số lượng đánh giá ngay trên từng dòng sản phẩm để nhân viên có cái nhìn tổng quan nhanh.
3. **Phía Backend**:
   - Cung cấp API chuyên biệt dành riêng cho Staff: `GET /api/v1/staff/products/:sku/reviews`.
   - Bảo mật qua middleware `readCookies`, `requireAuth`, `requireRole("staff")`.
   - Khai báo đầy đủ trong `PERMISSIONS` (`backend/src/common/permissions.js`).

---

## 2. Yêu cầu Chức năng (Functional Requirements)

### FR-01: Thống kê tổng quan đánh giá sản phẩm (Review Summary Statistics)
- Hiển thị điểm số trung bình dạng thập phân (ví dụ: `4.8 / 5.0`) kèm biểu tượng 5 ngôi sao trực quan.
- Hiển thị tổng số lượng đánh giá thực tế đã được gửi cho sản phẩm.
- Hiển thị biểu đồ thanh ngang (Progress bar) thể hiện tỉ lệ phần trăm và số lượng đánh giá cho từng mức sao từ 5 sao xuống 1 sao.

### FR-02: Bộ lọc và Sắp xếp đánh giá (Filtering & Sorting)
- **Lọc theo số sao**: Tab hoặc nút chọn [Tất cả], [5 sao], [4 sao], [3 sao], [2 sao], [1 sao] kèm số lượng đếm tương ứng.
- **Lọc có hình ảnh**: Checkbox hoặc nút gạt "Chỉ hiển thị đánh giá có hình ảnh".
- **Sắp xếp**: Dropdown lựa chọn:
  - *Mới nhất* (`recent`): Ưu tiên đánh giá vừa gửi lên đầu (mặc định).
  - *Đánh giá cao nhất* (`rating_desc`): Đánh giá 5 sao lên đầu.
  - *Đánh giá thấp nhất* (`rating_asc`): Đánh giá 1 sao lên đầu (giúp nhân viên nhanh chóng tìm các phản hồi tiêu cực để xử lý).

### FR-03: Hiển thị Danh sách Đánh giá (Review List Items)
Mỗi thẻ đánh giá bao gồm:
- **Thông tin khách hàng**: Họ và tên khách hàng, email/số điện thoại (giúp nhân viên nhận diện khách).
- **Huy hiệu Đơn hàng**: Nếu đánh giá có gắn với đơn hàng (`orderId`), hiển thị mã đơn hàng dạng badge `Đơn #ORD...` có thể click để mở trang chi tiết đơn hàng `/staff/orders/[id]`.
- **Đánh giá & Thời gian**: Số sao màu vàng và mốc thời gian đánh giá (định dạng ngày giờ Việt Nam trực quan, ví dụ: `14/11/2026 10:30`).
- **Nội dung nhận xét**: Hiển thị rõ ràng nhận xét văn bản của khách hàng.
- **Thư viện ảnh đính kèm**: Hiển thị thumbnail của 1 hoặc 2 ảnh do khách tải lên từ Cloudinary. Click vào ảnh sẽ mở cửa sổ phóng to (Image Lightbox/Modal).

### FR-04: Phân trang (Pagination)
- Khi số lượng đánh giá vượt quá kích thước trang (mặc định 5 hoặc 10 đánh giá), hiển thị bộ điều hướng phân trang (Trước, số trang, Sau).
- Giữ nguyên trạng thái bộ lọc khi chuyển trang.

---

## 3. Yêu cầu Phi chức năng & Kiến trúc (Non-Functional Requirements)

1. **Bảo mật & Phân quyền (RBAC)**:
   - Endpoint `GET /api/v1/staff/products/:sku/reviews` chỉ cho phép người dùng có vai trò `staff` truy cập. Khách vãng lai (`guest`) trả về 401, khách hàng (`customer`) hoặc quản trị viên (`admin`) trả về 403 (tuân thủ nguyên tắc không thừa kế quyền chéo).
2. **Hiệu năng & Khả năng mở rộng**:
   - Sử dụng index hiện có `{ productId: 1, status: 1, createdAt: -1 }` trên collection `reviews`.
   - Populate có chọn lọc các trường cần thiết: `userId` (fullName, email, phone) và `orderId` (orderCode).
   - Tốc độ phản hồi API < 200ms với tập dữ liệu thông thường.
3. **Thiết kế Giao diện (UI/UX)**:
   - Tuân thủ bộ semantic tokens trong `globals.css` và `design.md`.
   - Màu sắc nhận diện Staff: Giữ tone xanh dương thương hiệu (`bg-brand`, `text-brand`).
   - Giao diện đáp ứng mượt mà trên cả thiết bị di động, tablet và màn hình máy tính lớn.

---

## 4. Tiêu chí Chấp nhận (Acceptance Criteria)

- [ ] **AC-1**: Khi truy cập `/staff/products/[sku]`, nhân viên thấy khối "Đánh giá từ khách hàng" hiển thị đầy đủ điểm trung bình, tổng số đánh giá và biểu đồ phân bổ sao.
- [ ] **AC-2**: Khi chọn lọc theo 1 mức sao cụ thể (ví dụ 1 sao), danh sách chỉ hiển thị các đánh giá 1 sao.
- [ ] **AC-3**: Khi tích chọn "Có hình ảnh", danh sách chỉ hiển thị các đánh giá có ảnh đính kèm.
- [ ] **AC-4**: Nhân viên thấy tên thật của khách hàng (không bị mask) và mã đơn hàng tương ứng.
- [ ] **AC-5**: Click vào ảnh đính kèm mở modal xem ảnh phóng to sắc nét.
- [ ] **AC-6**: Nếu sản phẩm chưa có đánh giá nào, hiển thị empty state lịch sự: "Chưa có đánh giá nào cho sản phẩm này."
- [ ] **AC-7**: Unit test backend xác thực quyền staff truy cập endpoint và cấm customer/admin/guest.
- [ ] **AC-8**: Next.js build (`npm run build`) và test chạy qua 100% không có lỗi.

