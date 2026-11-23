# Research: Staff Xem Đánh Giá Sản Phẩm (Staff Product Reviews)

**Feature Branch**: `feature/staff-product-reviews`  
**Created**: 2026-11-14

---

## 1. Nghiên cứu & Quyết định Kiến trúc

### Quyết định 1: Cung cấp API chuyên biệt cho Staff thay vì dùng API công khai
- **Vấn đề**: Backend đã có API công khai `GET /api/v1/catalog/products/:id/reviews`. Có nên để Staff tái sử dụng API này không?
- **Khảo sát**:
  - API catalog công khai được thiết kế cho người mua sắm: tên khách hàng bị che (`maskName`), không hiển thị email, số điện thoại, và không trả về `orderId`/`orderCode`.
  - Nhân viên cần thông tin danh tính khách hàng thực tế và mã đơn hàng đã mua để có thể hỗ trợ khách nếu sản phẩm gặp lỗi hoặc khách đánh giá thấp cần chăm sóc khách hàng.
- **Quyết định**: Tạo endpoint mới `GET /api/v1/staff/products/:sku/reviews` dưới router workspace `/staff/products/:sku/reviews`.
- **Lý do**:
  - Đảm bảo an toàn thông tin: Chỉ nhân viên đã đăng nhập và có role `staff` mới truy cập được thông tin khách hàng chi tiết.
  - Tách bạch trách nhiệm (Separation of Concerns): API catalog giữ nguyên cho khách, API staff cung cấp thêm `author` (fullName, email, phone) và `order` (id, orderCode).

### Quyết định 2: Tích hợp trực tiếp vào trang Chi tiết sản phẩm của Staff (`/staff/products/[sku]`)
- **Vấn đề**: Hiển thị đánh giá ở đâu là tiện lợi nhất cho nhân viên?
- **Phương án cân nhắc**:
  1. *Tạo trang riêng `/staff/reviews`*: Phù hợp khi cần duyệt đánh giá (nhưng hệ thống hiện tại áp dụng chính sách auto-publish đánh giá của khách mua thật).
  2. *Tích hợp trực tiếp trên trang Chi tiết sản phẩm `/staff/products/[sku]`*: Khi nhân viên kiểm tra thông tin, tồn kho của sản phẩm, họ có thể cuộn xuống xem ngay phản hồi của khách hàng về sản phẩm đó mà không cần rời trang.
  3. *Hiển thị thêm điểm ⭐ trên danh sách `/staff/products`*: Giúp nhân viên nhận biết ngay sản phẩm nào được đánh giá cao/thấp khi lướt danh sách.
- **Quyết định**: Áp dụng Phương án 2 (khối đánh giá chi tiết trên `/staff/products/[sku]`) và Phương án 3 (rating badge trên danh sách `/staff/products`).

### Quyết định 3: Component Client-Side với Fetch linh hoạt cho bộ lọc & phân trang
- **Khảo sát**:
  - Trang `/staff/products/[sku]/page.tsx` là Server Component tải dữ liệu sản phẩm tĩnh nhanh chóng.
  - Các thao tác: chọn số sao lọc (1★, 2★,...), tích chọn ảnh, chuyển trang phân trang diễn ra tương tác nhiều lần.
- **Quyết định**: Xây dựng component `<ProductReviewsSection sku={sku} productId={productId} />` là Client Component ("use client"), nhận `sku` và gọi API fetch danh sách đánh giá khi người dùng thay đổi bộ lọc hoặc trang mà không phải tải lại toàn bộ trang SSR của sản phẩm.

---

## 2. Ma trận Phân quyền & Bảo mật (Security Matrix)

| Endpoint | Guest | Customer | Staff | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/staff/products/:sku/reviews` | 401 UNAUTHENTICATED | 403 FORBIDDEN | **200 OK** | 403 FORBIDDEN |

- **Giải thích**: Tuân thủ triệt để nguyên tắc ma trận quyền trong `CLAUDE.md`: "Staff and Admin do not inherit each other's access". Admin và Customer tuyệt đối không truy cập được endpoint của Staff.

