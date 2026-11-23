# Tasks: Staff Xem Các Đánh Giá Từ Khách Hàng Cho Sản Phẩm (Staff Product Reviews)

**Branch**: `feature/staff-product-reviews`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **API Contract**: [contracts/staff-product-reviews-api.yaml](./contracts/staff-product-reviews-api.yaml)

---

## Task Summary

- **Total Tasks**: 10
- **Completed**: 10
- **Phase 1 (Backend Core & RBAC Endpoint)**: 3/3 tasks completed
- **Phase 2 (Frontend Client Service & Types - US1)**: 2/2 tasks completed
- **Phase 3 (Frontend Reviews UI & Product Detail Page - US1 & US2)**: 3/3 tasks completed
- **Phase 4 (Polish & Comprehensive Verification)**: 2/2 tasks completed

---

## User Stories Mapped

- **US1 (P1 - Xem chi tiết đánh giá sản phẩm)**: Nhân viên xem chi tiết phản hồi của khách hàng tại trang `/staff/products/[sku]`, bao gồm điểm trung bình, phân bổ sao, lọc theo sao/ảnh, sắp xếp, thông tin khách hàng, mã đơn hàng, và ảnh đính kèm.
- **US2 (P2 - Thống kê rating trên danh sách sản phẩm)**: Nhân viên thấy nhanh điểm số ⭐ và số lượng đánh giá của sản phẩm ngay tại bảng danh sách `/staff/products`.

---

## Execution Tasks

### Phase 1: Backend Core & RBAC Endpoint

- [x] T001 Xây dựng handler `getStaffProductReviews` trong `backend/src/controllers/product.controller.js`:
  - Tìm sản phẩm theo `variants.sku` (hoặc `_id`).
  - Lấy tất cả `Review` có `status === "published"` tương ứng với `productId`.
  - Populate thông tin người đánh giá `userId` (`fullName`, `email`, `phone`) và thông tin đơn hàng `orderId` (`orderCode`).
  - Tính toán `summary`: `averageRating` (thập phân 1 chữ số), `totalReviews`, và `breakdown` (số lượng và phần trăm cho 5, 4, 3, 2, 1 sao).
  - Áp dụng các bộ lọc: `rating` (1-5 hoặc all), `hasImages` (boolean), `sort` (`recent`, `rating_desc`, `rating_asc`), và phân trang `page`, `limit`.
  - Trả về payload chuẩn `{ success: true, data: { summary, reviews, pagination } }`.
- [x] T002 [P] Đăng ký route `GET /staff/products/:sku/reviews` với middleware `readCookies, requireAuth, requireRole("staff")` trong `backend/src/routers/workspace.router.js`, đồng thời khai báo đường dẫn trong danh sách `staffRoutes` tại `backend/src/common/permissions.js`.
- [x] T003 [P] Tạo tệp kiểm thử `backend/tests/staff-product-reviews.test.js` kiểm tra toàn diện:
  - Cho phép người dùng vai trò `staff` truy cập thành công (200 OK).
  - Chặn người dùng chưa đăng nhập (`guest` -> 401 UNAUTHENTICATED).
  - Chặn người dùng vai trò `customer` và `admin` (403 FORBIDDEN - tuân thủ ma trận phân quyền không kế thừa quyền chéo).
  - Kiểm tra tính đúng đắn của dữ liệu tổng hợp (`averageRating`, `breakdown`, thông tin `author`, `orderCode`).

---

### Phase 2: Frontend Client Service & Types (US1)

- [x] T004 [P] [US1] Định nghĩa các kiểu dữ liệu cho đánh giá sản phẩm phía Staff trong `frontend/features/staff/products/types.ts`:
  - `StaffProductReview`, `StaffReviewAuthor`, `StaffReviewOrder`, `StaffProductReviewsSummary`, `StaffProductReviewsPagination`, `StaffProductReviewsResponse`.
- [x] T005 [P] [US1] Cập nhật `frontend/features/staff/products/api.ts` với hàm `fetchStaffProductReviews(sku, query)` gọi đến backend `/api/v1/staff/products/:sku/reviews` kèm credentials same-origin.

---

### Phase 3: Frontend Reviews UI & Integration (US1 & US2)

- [x] T006 [US1] Xây dựng component `frontend/features/staff/components/product-reviews-section.tsx`:
  - Khối tổng quan đánh giá: Điểm số trung bình to đẹp kèm 5 ngôi sao, tổng số đánh giá, các thanh Progress bar biểu thị tỉ lệ phần trăm từng mức sao 5★ -> 1★.
  - Thanh công cụ bộ lọc: Nút chuyển nhanh theo mức sao (Tất cả, 5★, 4★, 3★, 2★, 1★), ô tích chọn "Chỉ hiển thị có hình ảnh", và dropdown sắp xếp (Mới nhất, Đánh giá cao nhất, Đánh giá thấp nhất).
  - Danh sách thẻ nhận xét khách hàng: Hiển thị tên đầy đủ của khách, thông tin liên hệ (email/SĐT), huy hiệu mã đơn hàng `Đơn #ORD...` có link sang `/staff/orders/[id]`, số sao, mốc thời gian, nội dung nhận xét, và thumbnail ảnh thực tế.
  - Modal phóng to ảnh (Lightbox): Cho phép nhân viên click vào ảnh đính kèm để xem ảnh gốc rõ nét, có nút đóng và hỗ trợ phím ESC.
  - Phân trang: Các nút điều hướng chuyển trang mượt mà (Trước, Sau, trang hiện tại).
  - Xử lý trạng thái đang tải (Loading spinner) và trạng thái rỗng ("Chưa có đánh giá nào cho sản phẩm này.").
- [x] T007 [US1] Tích hợp component `ProductReviewsSection` vào trang Chi tiết sản phẩm của nhân viên tại `frontend/app/(workspace)/staff/products/[sku]/page.tsx` ngay dưới phần mô tả sản phẩm.
- [x] T008 [P] [US2] Cập nhật bảng danh sách sản phẩm `frontend/features/staff/components/products-list.tsx` để hiển thị huy hiệu số sao trung bình ⭐ và số lượng đánh giá dưới tên sản phẩm.

---

### Phase 4: Polish & Comprehensive Verification

- [x] T009 Chạy kiểm thử tự động phía Backend: `npm --prefix backend test -- tests/staff-product-reviews.test.js`.
- [x] T010 Chạy kiểm thử tự động phía Frontend `npm --prefix frontend test` và chạy lệnh build `npm --prefix frontend run build` để đảm bảo hệ thống đạt chuẩn kiểm tra tĩnh TypeScript và Next.js không có lỗi.
