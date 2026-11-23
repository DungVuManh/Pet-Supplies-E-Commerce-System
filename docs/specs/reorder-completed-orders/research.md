# Research & Technical Decisions: Mua Lại Đơn Hàng Đã Hoàn Thành (Reorder Completed Orders)

**Feature**: `reorder-completed-orders`  
**Date**: 2026-11-14  
**Status**: Completed  

---

## 1. Khảo sát Hiện trạng & Vấn đề

### 1.1. Luồng mua hàng lặp lại (Repeat Purchase) tại Petjoy
- Khách hàng sau khi nhận hàng thành công (`orderStatus: "completed"`) thường muốn đặt lại đúng những sản phẩm đó định kỳ (thức ăn chó mèo, cát vệ sinh, pate dinh dưỡng).
- Trên giao diện hiện tại:
  - Bảng danh sách đơn hàng (`/orders` - [orders-table.tsx](../../../frontend/features/orders/components/orders-table.tsx)) chỉ có nút "Chi tiết →".
  - Trang chi tiết đơn hàng (`/orders/[id]` - [order-summary-sidebar.tsx](../../../frontend/features/orders/components/order-summary-sidebar.tsx)) khi hoàn thành chỉ có các nút hỗ trợ, không có thao tác mua lại.
  - Khách hàng phải tự tìm lại từng sản phẩm trên trang chủ hoặc danh mục, chọn lại biến thể/SKU, rất dễ nhầm lẫn hoặc tốn nhiều thời gian.

### 1.2. Các Rủi ro Kỹ thuật khi Mua Lại (Reorder Risks)
1. **Sản phẩm hoặc biến thể bị ngừng kinh doanh (`isActive: false`) hoặc bị xóa**: Không thể thêm vào giỏ hàng bình thường.
2. **Tồn kho khả dụng thấp hơn số lượng mua cũ (`availableStock < orderItem.qty`)**: Nếu ép số lượng cũ thì sẽ bị lỗi `OUT_OF_STOCK` (hoặc bán âm kho).
3. **Giá sản phẩm đã thay đổi**: Giá trong `order.items` là giá lịch sử tại thời điểm đặt hàng cũ. Nếu áp giá cũ sẽ gây thất thoát nếu giá đã tăng, hoặc thiệt thòi cho khách nếu giá đã giảm.
4. **Voucher / Khuyến mãi cũ**: Mã voucher trong đơn cũ có thể đã hết hạn, hết lượt dùng, hoặc không áp dụng được cho giỏ hàng mới.
5. **Tranh chấp quyền sở hữu**: Người dùng không được phép mua lại đơn hàng của tài khoản khác.

---

## 2. Các Quyết định Kỹ thuật (Technical Decisions)

### Quyết định 1: Thiết kế Endpoint Chuyên Dụng trên Backend (`POST /api/v1/orders/:id/reorder`)
- **Phương án lựa chọn**: Tạo 1 endpoint nghiệp vụ chuyên dụng tại Backend: `POST /api/v1/orders/:id/reorder` với middleware xác thực `requireAuth, requireRole("customer"), protectMutation`.
- **Lý do**:
  - **Atomic & Batch Processing**: Thay vì Frontend phải gửi nhiều request `addToCart` tuần tự (dễ bị lỗi mạng ở giữa chừng dẫn đến giỏ hàng bị thiếu nửa chừng), Backend xử lý toàn bộ danh sách sản phẩm trong một lần gọi nguyên tử.
  - **Kiểm soát Tồn kho & Tính khả dụng tức thời**: Backend đọc trực tiếp dữ liệu mới nhất từ MongoDB `Product` và `Cart` của khách hàng.
  - **Bảo mật tuyệt đối**: Đảm bảo `order.customerId` khớp với `request.user._id` và `order.orderStatus === "completed"`.
- **Các phương án thay thế đã xem xét**:
  - *Frontend tự lặp qua `order.items` rồi gọi `addToCartApi` nhiều lần*: Dễ phát sinh race condition, làm chậm mạng, không thể hoàn tác nếu request thứ 3 bị lỗi mạng, và không báo cáo được tổng quan sản phẩm hết hàng một cách đồng bộ.

---

### Quyết định 2: Chiến lược Xử lý Tồn kho & Sản phẩm Ngừng Bán (Partial Availability Strategy)
- **Phương án lựa chọn**: **Thêm tối đa các sản phẩm còn hàng (`Partial Success`) kèm báo cáo phân loại rõ ràng**.
- **Chi tiết thuật toán xử lý**:
  1. Duyệt qua từng sản phẩm trong `order.items`:
     - Tra cứu sản phẩm trong DB: `Product.findOne({ _id: item.productId, isActive: true })`.
     - Tìm biến thể theo `item.variantSku`.
     - Tính tồn kho khả dụng: `availableStock = Math.max(0, (variant.stock || 0) - (variant.reservedStock || 0))`.
     - Lấy số lượng đã có sẵn trong giỏ của user: `currentCartQty`.
     - Số lượng còn có thể thêm vào giỏ: `maxCanAdd = Math.max(0, availableStock - currentCartQty)`.
  2. Phân loại sản phẩm:
     - **Nếu `maxCanAdd > 0`**: Thêm số lượng `qtyToAdd = Math.min(item.qty, maxCanAdd)` vào giỏ hàng. Đưa vào danh sách `addedItems: [{ name, variantSku, quantity: qtyToAdd }]`.
     - **Nếu `maxCanAdd === 0` hoặc sản phẩm không khả dụng**: Đưa vào danh sách `unavailableItems: [{ name, variantSku, reason: "OUT_OF_STOCK" | "PRODUCT_INACTIVE" }]`.
  3. Kết quả trả về:
     - Nếu `addedItems.length > 0`: Cập nhật `Cart` trong DB, trả về HTTP 200 kèm `addedItems`, `unavailableItems`, và `summary` giỏ hàng.
     - Nếu `addedItems.length === 0`: Không cập nhật `Cart`, trả về HTTP 400 hoặc 409 với mã lỗi `ALL_ITEMS_UNAVAILABLE` và danh sách chi tiết các mặt hàng không thể thêm.

---

### Quyết định 3: Quy tắc Giá bán & Khuyến mãi (Pricing & Voucher Rules)
- **Phương án lựa chọn**:
  - **Giá bán**: Sử dụng giá niêm yết hiện hành của biến thể (`variant.price ?? product.price`), TUYỆT ĐỐI KHÔNG dùng giá cũ trong lịch sử đơn hàng.
  - **Voucher**: KHÔNG mang mã giảm giá cũ sang giỏ hàng mới. Khách hàng sẽ tự áp voucher mới (nếu có) tại trang checkout.
- **Lý do**:
  - Đảm bảo tuân thủ nguyên tắc tính tiền của hệ thống (BR-11): giá sản phẩm trong giỏ hàng và đơn hàng mới phản ánh đúng chính sách giá và chương trình khuyến mãi hiện tại của cửa hàng.

---

### Quyết định 4: Trải nghiệm Người dùng (UX & Flow)
- **Điểm xuất hiện nút "Mua lại"**:
  1. **Bảng Danh sách đơn hàng (`/orders`)**: Thêm nút icon/text "Mua lại" trong cột Thao tác (kế bên link "Chi tiết →") cho các dòng có trạng thái "Hoàn thành".
  2. **Trang Chi tiết đơn hàng (`/orders/[id]`)**: Đặt nút "Mua lại đơn hàng" nổi bật (màu xanh dương hoặc xanh lá thương hiệu) trong khối thao tác bên thanh sidebar phải ([order-summary-sidebar.tsx](../../../frontend/features/orders/components/order-summary-sidebar.tsx)) khi `order.orderStatusCode === "completed"`.
- **Hành động sau khi bấm**:
  - Nút chuyển trạng thái loading spinner (`disabled`).
  - Gọi API reorder.
  - Khi thành công:
    - Bắn sự kiện `window.dispatchEvent(new Event("cart-updated"))` để đồng bộ số lượng badge giỏ hàng trên TopBar.
    - Lưu thông báo kết quả (thông qua sessionStorage hoặc query params) và chuyển hướng khách hàng sang `/cart`.
    - Tại trang `/cart`: hiển thị banner/toast thông báo:
      - Nếu toàn bộ thành công: *"Đã thêm X sản phẩm từ đơn hàng #{orderCode} vào giỏ hàng."*
      - Nếu có sản phẩm hết hàng: *"Đã thêm X sản phẩm vào giỏ hàng. Có Y sản phẩm đã hết hàng hoặc ngừng kinh doanh."*
  - Nếu tất cả hết hàng: hiển thị modal/alert cảnh báo ngay tại trang đơn hàng, không chuyển trang.

---

## 3. Ma trận Đánh giá Rủi ro (Risk Assessment)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| Khách bấm liên tục nút Mua lại tạo nhiều request trùng lặp | Trung bình | Frontend áp dụng cờ `busy` / `loading` disable nút ngay khi bấm; Backend áp dụng kiểm tra tồn kho theo thời gian thực. |
| Người dùng cố reorder đơn của người khác bằng cách đổi ID | Cao | Backend kiểm tra bắt buộc `order.customerId.toString() === request.user._id.toString()`, từ chối ngay lập tức bằng 404/403. |
| Đơn hàng chưa hoàn thành (đang giao, đang chờ xử lý, đã hủy) bị reorder | Thấp | Backend kiểm tra nghiêm ngặt `order.orderStatus === "completed"`, từ chối bằng `ORDER_NOT_COMPLETED` (400). |
| Trùng lặp SKU trong giỏ hàng sau khi reorder | Thấp | Backend tìm SKU trong mảng `cart.items`, nếu đã có thì cộng dồn số lượng thay vì thêm phần tử mới. |
| Vượt quá tồn kho thực tế do khách đã có sẵn hàng trong giỏ | Trung bình | Backend trừ đi số lượng hiện có trong giỏ hàng `currentCartQty` trước khi tính `maxCanAdd`. |
