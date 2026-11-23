# Implementation Plan: Staff Xem Đánh Giá Từ Khách Hàng Cho Sản Phẩm (Staff Product Reviews)

**Branch**: `feature/staff-product-reviews` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

---

## 1. Summary & Architecture

Kế hoạch triển khai hoàn thiện tính năng **Staff Xem Đánh Giá Khách Hàng Cho Sản Phẩm**:
1. **Backend Layer**:
   - Thêm handler `getStaffProductReviews` trong `backend/src/controllers/product.controller.js` (hoặc `review.controller.js`).
   - Đăng ký route `GET /staff/products/:sku/reviews` với middleware `readCookies, requireAuth, requireRole("staff")` trong `backend/src/routers/workspace.router.js`.
   - Cập nhật ma trận phân quyền `backend/src/common/permissions.js` để bao gồm route này.
   - Viết unit/HTTP test kiểm tra quyền truy cập (Staff được phép, Customer/Admin bị chặn 403).
2. **Frontend Layer**:
   - Thêm client API & types tại `frontend/features/staff/products/` (`types.ts`, `api.ts`).
   - Tạo component `ProductReviewsSection` (`frontend/features/staff/components/product-reviews-section.tsx`) bao gồm:
     - Card thống kê tổng quan (Điểm ⭐ trung bình, tổng số đánh giá, breakdown từng mức sao 1-5★).
     - Bộ lọc tương tác (Tất cả, 5★, 4★, 3★, 2★, 1★, checkbox có ảnh).
     - Bộ sắp xếp (Mới nhất, Đánh giá cao nhất, Đánh giá thấp nhất).
     - Danh sách thẻ nhận xét khách hàng (Tên đầy đủ, SĐT/email, mã đơn hàng link sang chi tiết đơn, bình luận, ảnh đính kèm có thể click phóng to qua modal).
     - Phân trang mượt mà.
   - Nhúng `ProductReviewsSection` vào trang Chi tiết sản phẩm của Staff: `frontend/app/(workspace)/staff/products/[sku]/page.tsx`.
   - Bổ sung hiển thị rating badge ⭐ trên bảng danh sách sản phẩm `frontend/features/staff/components/products-list.tsx`.

---

## 2. Technical Context

- **Backend**: Express 5, Mongoose 9, Node.js 24.x, Vitest.
- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `lucide-react`.
- **Database**: Collection `reviews`, `products`, `orders`, `users`.
- **Security**: Cookie session HttpOnly `petly-session` / `__Host-petly-session`, strict role check `requireRole("staff")`.

---

## 3. Phased Implementation Roadmap

### Phase 1: Backend Endpoint & Permissions
- [ ] **Step 1.1**: Viết hàm `getStaffProductReviews` trong `backend/src/controllers/product.controller.js`.
  - Tìm sản phẩm theo `variants.sku` (hoặc `_id`).
  - Truy vấn `Review.find({ productId: product._id, status: "published" })`.
  - Populate thông tin khách hàng `userId` (`fullName`, `email`, `phone`) và thông tin đơn hàng `orderId` (`orderCode`).
  - Tính toán `summary` (`averageRating`, `totalReviews`, `breakdown`).
  - Áp dụng các bộ lọc: `rating` (1-5), `hasImages` (boolean), sắp xếp `sort` (`recent`, `rating_desc`, `rating_asc`), và phân trang `page`, `limit`.
- [ ] **Step 1.2**: Đăng ký route `GET /staff/products/:sku/reviews` trong `backend/src/routers/workspace.router.js`.
- [ ] **Step 1.3**: Thêm `"GET /staff/products/:sku/reviews"` vào `staffRoutes` trong `backend/src/common/permissions.js`.
- [ ] **Step 1.4**: Viết kiểm thử HTTP `backend/tests/staff-product-reviews.test.js` kiểm tra RBAC (Staff OK, Admin/Customer 403, Guest 401) và dữ liệu trả về.

### Phase 2: Frontend Client Service & Types
- [ ] **Step 2.1**: Mở rộng `frontend/features/staff/products/types.ts` với các kiểu dữ liệu `StaffProductReview`, `StaffProductReviewsSummary`, `StaffProductReviewsResponse`.
- [ ] **Step 2.2**: Thêm hàm gọi API `fetchStaffProductReviewsApi(sku, filters)` trong `frontend/features/staff/products/api.ts`.

### Phase 3: Frontend UI Components
- [ ] **Step 3.1**: Tạo `frontend/features/staff/components/product-reviews-section.tsx`:
  - Khối thống kê: Điểm số to, thanh progress bar tỉ lệ sao từ 5★ đến 1★.
  - Thanh bộ lọc sao và tùy chọn có ảnh, sắp xếp dropdown.
  - Danh sách thẻ nhận xét khách hàng với huy hiệu đơn hàng, avatar, nội dung, ảnh chụp.
  - Modal xem ảnh phóng to khi click vào thumbnail ảnh đánh giá.
  - Bộ điều hướng chuyển trang.
- [ ] **Step 3.2**: Cập nhật `frontend/app/(workspace)/staff/products/[sku]/page.tsx` để nhúng `ProductReviewsSection`.
- [ ] **Step 3.3**: Cập nhật `frontend/features/staff/components/products-list.tsx` để hiển thị rating ⭐ và số đánh giá trên bảng danh sách sản phẩm.

### Phase 4: Verification & Quality Assurance
- [ ] **Step 4.1**: Chạy backend tests: `npm --prefix backend test -- tests/staff-product-reviews.test.js`.
- [ ] **Step 4.2**: Chạy frontend unit tests: `npm --prefix frontend test`.
- [ ] **Step 4.3**: Chạy build kiểm tra Next.js: `npm --prefix frontend run build`.

