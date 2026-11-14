# Quickstart & Verification: Staff Xem Đánh Giá Sản Phẩm (Staff Product Reviews)

**Feature Branch**: `feature/staff-product-reviews`  
**Created**: 2026-11-14

---

## 1. Mục đích
Tài liệu hướng dẫn các bước kiểm thử và xác nhận tính năng **Staff Xem Đánh Giá Từ Khách Hàng Cho Sản Phẩm** hoạt động chính xác từ Backend đến Frontend.

---

## 2. Kịch bản Kiểm thử

### Kịch bản 1: Phân quyền API (RBAC)
- **Hành động**: Gọi `GET /api/v1/staff/products/:sku/reviews` với các phiên đăng nhập khác nhau.
- **Kết quả mong đợi**:
  - Không có cookie: Trả về `401 UNAUTHENTICATED`.
  - Phiên Customer: Trả về `403 FORBIDDEN`.
  - Phiên Admin: Trả về `403 FORBIDDEN` (không thừa kế quyền Staff).
  - Phiên Staff: Trả về `200 OK` với dữ liệu tóm tắt và danh sách đánh giá.

### Kịch bản 2: Xem tổng quan & danh sách đánh giá tại trang Chi tiết sản phẩm Staff
- **Điều kiện**: Sản phẩm đã có các đánh giá từ khách hàng trong DB.
- **Hành động**: Đăng nhập tài khoản nhân viên, vào menu **Sản phẩm** -> bấm vào một sản phẩm cụ thể để vào `/staff/products/[sku]`.
- **Kết quả mong đợi**:
  - Xuất hiện khối **"Đánh giá từ khách hàng"**.
  - Hiển thị điểm số trung bình (ví dụ: ⭐ 4.8 / 5.0) và tổng số nhận xét.
  - Các thanh tỉ lệ sao (5★ -> 1★) hiển thị đúng số lượng và phần trăm.
  - Danh sách đánh giá hiển thị họ tên đầy đủ của khách, số sao, ngày giờ, nội dung bình luận, mã đơn hàng.

### Kịch bản 3: Thử nghiệm Bộ lọc & Sắp xếp
- **Hành động**:
  1. Bấm nút lọc "5 sao": Danh sách chỉ hiển thị các nhận xét 5 sao.
  2. Bấm lọc "1 sao": Chỉ hiển thị các nhận xét 1 sao (nếu có).
  3. Tích chọn "Chỉ hiển thị có hình ảnh": Danh sách chỉ lọc ra các nhận xét có ảnh tải lên.
  4. Đổi sắp xếp sang "Đánh giá thấp nhất": Các nhận xét ít sao nhất sẽ đẩy lên đầu.
- **Kết quả mong đợi**: Danh sách cập nhật tức thì, không làm reload cả trang.

### Kịch bản 4: Xem phóng to ảnh đánh giá
- **Hành động**: Click vào một ảnh thumbnail trong nhận xét của khách.
- **Kết quả mong đợi**: Mở modal popup phóng to ảnh rõ nét, có nút đóng (X) và đóng bằng phím ESC.

---

## 3. Lệnh chạy kiểm tra tự động

```powershell
# 1. Chạy Backend Tests cho phân quyền và tính năng
npm --prefix backend test -- tests/staff-product-reviews.test.js

# 2. Chạy Frontend Tests
npm --prefix frontend test

# 3. Chạy Production Build Frontend
npm --prefix frontend run build
```

