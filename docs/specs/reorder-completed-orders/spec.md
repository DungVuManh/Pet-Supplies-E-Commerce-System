# Feature Specification: Tính Năng Mua Lại Cho Các Đơn Hàng Đã Hoàn Thành (Reorder Completed Orders)

**Feature Name**: `reorder-completed-orders`  
**Feature Directory**: `docs/specs/reorder-completed-orders`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: "tính năng mua lại cho các đơn hàng đã hoàn thành"  

---

## 1. Bối cảnh & Vấn đề (Context & Problem Statement)

### 1.1. Hiện trạng
- Cửa hàng Petjoy cung cấp các sản phẩm tiêu dùng định kỳ cho thú cưng (thức ăn hạt, pate, cát vệ sinh, tã lót, thực phẩm chức năng, v.v.). Khách hàng có xu hướng mua lại đúng những món đồ quen thuộc sau mỗi 2 - 4 tuần.
- Hiện tại, sau khi đơn hàng được giao thành công và chuyển sang trạng thái **"Hoàn thành"** (`completed`):
  - Khách hàng không có cách nào đặt lại nhanh các sản phẩm trong đơn hàng đó.
  - Khách hàng buộc phải duyệt lại danh mục hoặc tìm kiếm từng sản phẩm, chọn lại biến thể/phân loại (SKU, trọng lượng, mùi vị) rồi thêm từng món vào giỏ hàng. Quy trình này tốn nhiều thao tác, dễ nhầm lẫn phân loại và làm giảm tỷ lệ chuyển đổi mua lại (Retention / Repeat Purchase Rate).

### 1.2. Mục tiêu Giải pháp
- Cung cấp tính năng **"Mua lại" (Re-order)** với thao tác 1-click cho các đơn hàng đã ở trạng thái **Hoàn thành** (`orderStatus: "completed"`).
- Khi khách hàng bấm "Mua lại":
  1. Hệ thống tự động kiểm tra tính khả dụng và tồn kho hiện tại của từng sản phẩm/biến thể trong đơn hàng cũ.
  2. Nạp các sản phẩm còn hàng vào giỏ hàng (`Cart`) của khách hàng theo giá bán hiện hành.
  3. Xử lý thông minh khi có sản phẩm hết hàng hoặc ngừng kinh doanh (vẫn thêm sản phẩm còn hàng và thông báo minh bạch cho khách).
  4. Cập nhật số lượng giỏ hàng trên TopBar và chuyển hướng khách hàng đến trang Giỏ hàng (`/cart`) để sẵn sàng tiến hành thanh toán.

---

## 2. Kịch bản Người dùng & User Stories (User Scenarios)

### User Story 1: Mua lại nhanh từ Chi tiết đơn hàng và Danh sách đơn hàng (Priority: P1) 🎯 MVP

Khách hàng truy cập vào trang **Chi tiết đơn hàng** (`/orders/[id]`) hoặc bảng **Danh sách đơn hàng** (`/orders`). Với bất kỳ đơn hàng nào có trạng thái **"Hoàn thành"**, khách hàng nhìn thấy nút **"Mua lại"** rõ ràng.

Khi bấm **"Mua lại"**:
- Nút chuyển sang trạng thái đang tải (Loading spinner / disabled) để chống bấm đúp (double click).
- Hệ thống gọi API `POST /api/v1/orders/:id/reorder`.
- Toàn bộ sản phẩm còn khả dụng từ đơn hàng được thêm vào giỏ hàng của khách.
- Hệ thống phát sự kiện cập nhật giỏ hàng (`cart-updated`), đồng bộ badge giỏ hàng trên thanh điều hướng.
- Trình duyệt tự động chuyển hướng khách hàng sang trang **Giỏ hàng** (`/cart`) kèm thông báo thành công.

**Why this priority**: Đây là luồng nghiệp vụ cốt lõi mang lại giá trị trực tiếp cho người dùng, tối ưu hóa hành trình mua hàng lặp lại.

**Independent Test**: Đăng nhập tài khoản khách hàng có ít nhất một đơn hàng ở trạng thái `completed`. Bấm nút "Mua lại", xác nhận các sản phẩm trong đơn được thêm vào giỏ hàng và trình duyệt chuyển hướng đến `/cart`.

#### Acceptance Scenarios:
1. **Given** một đơn hàng của khách hàng đang ở trạng thái `orderStatus: "completed"` và tất cả các sản phẩm trong đơn vẫn đang kinh doanh và còn tồn kho,  
   **When** khách hàng bấm nút "Mua lại" tại trang Chi tiết đơn hàng hoặc Danh sách đơn hàng,  
   **Then** hệ thống thêm toàn bộ sản phẩm vào giỏ hàng, cập nhật badge giỏ hàng và chuyển hướng đến trang `/cart` với thông báo *"Đã thêm các sản phẩm vào giỏ hàng thành công"*.
2. **Given** một đơn hàng ở trạng thái khác (ví dụ: `pending`, `confirmed`, `shipping`, `cancelled`, `returned`),  
   **When** hiển thị trên giao diện hoặc gọi API reorder,  
   **Then** nút "Mua lại" không hiển thị và API từ chối với mã lỗi `ORDER_NOT_COMPLETED` (400).
3. **Given** khách hàng bấm nút "Mua lại" liên tiếp,  
   **When** yêu cầu đầu tiên đang được xử lý,  
   **Then** nút ở trạng thái disabled, không gửi request trùng lặp.

---

### User Story 2: Xử lý thông minh khi một phần hoặc toàn bộ sản phẩm hết hàng / ngừng bán (Priority: P1)

Trong thực tế, một đơn hàng hoàn thành từ nhiều tuần trước có thể có sản phẩm hiện tại đã hết hàng hoặc ngừng kinh doanh (`isActive: false` hoặc biến thể bị xóa). Hệ thống phải xử lý khéo léo để không chặn toàn bộ trải nghiệm của khách:

- **Nếu một số sản phẩm hết hàng hoặc ngừng bán, nhưng vẫn còn ít nhất 1 sản phẩm còn hàng**:
  - Hệ thống vẫn thêm các sản phẩm còn hàng vào giỏ hàng.
  - Hiển thị thông báo chi tiết: *"Đã thêm X sản phẩm vào giỏ hàng. Có Y sản phẩm không thể thêm do đã hết hàng hoặc ngừng kinh doanh."*
- **Nếu số lượng tồn kho khả dụng ít hơn số lượng trong đơn cũ**:
  - Hệ thống thêm số lượng tối đa hiện có (`availableStock`) vào giỏ hàng và thông báo cho khách.
- **Nếu TẤT CẢ các sản phẩm trong đơn đều đã hết hàng hoặc ngừng kinh doanh**:
  - Không thay đổi giỏ hàng.
  - Hiển thị thông báo rõ ràng: *"Rất tiếc, tất cả các sản phẩm trong đơn hàng này hiện đã hết hàng hoặc ngừng kinh doanh."*

**Why this priority**: Bảo đảm tính toàn vẹn của dữ liệu giỏ hàng, không cho phép đưa sản phẩm hết hàng vào giỏ, đồng thời thông báo minh bạch giúp khách hàng không bị bất ngờ.

**Independent Test**: Tạo đơn hàng gồm 2 sản phẩm A (còn hàng) và B (đã hết hàng hoặc bị tắt kinh doanh). Khi bấm mua lại, giỏ hàng chỉ có sản phẩm A, và giao diện hiển thị thông báo sản phẩm B không còn khả dụng.

#### Acceptance Scenarios:
1. **Given** đơn hàng gồm sản phẩm A (còn 10 cái, đơn cũ mua 2) và sản phẩm B (tồn kho = 0 hoặc ngừng kinh doanh),  
   **When** khách hàng bấm "Mua lại",  
   **Then** chỉ sản phẩm A được thêm vào giỏ hàng (số lượng 2), sản phẩm B bị bỏ qua và thông báo phản hồi nêu rõ sản phẩm B đã hết hàng.
2. **Given** đơn hàng gồm sản phẩm C với số lượng mua cũ là 5, nhưng tồn kho khả dụng hiện tại chỉ còn 2,  
   **When** khách hàng bấm "Mua lại",  
   **Then** sản phẩm C được thêm vào giỏ với số lượng là 2 kèm cảnh báo điều chỉnh số lượng theo tồn kho khả dụng.
3. **Given** tất cả sản phẩm trong đơn hàng đều có tồn kho bằng 0 hoặc `isActive === false`,  
   **When** khách hàng bấm "Mua lại",  
   **Then** hệ thống không thêm món nào vào giỏ hàng và hiển thị thông báo lỗi rõ ràng.

---

### User Story 3: Bảo mật, Kiểm soát quyền sở hữu và Quy tắc giá bán / Giỏ hàng hiện tại (Priority: P2)

- **Quyền sở hữu (Authorization)**: Chỉ khách hàng sở hữu đơn hàng (`customerId === request.user._id`) mới có quyền thực hiện thao tác mua lại đơn hàng đó. Nếu cố tình gọi reorder đơn của người khác, backend trả về lỗi 403 `FORBIDDEN` hoặc 404 `ORDER_NOT_FOUND`.
- **Cộng dồn giỏ hàng (Cart Merging)**: Nếu trong giỏ hàng hiện tại của khách hàng ĐÃ CÓ sẵn một số sản phẩm trùng với đơn cũ:
  - Hệ thống cộng dồn số lượng: `newQuantity = currentCartQty + reorderQty`.
  - Nếu tổng số lượng sau khi cộng vượt quá `availableStock`, gán bằng chính `availableStock`.
- **Giá bán & Khuyến mãi hiện hành**:
  - Sản phẩm được thêm vào giỏ với **giá bán hiện tại** (được đọc trực tiếp từ bảng sản phẩm, không áp dụng giá cũ của đơn hàng lịch sử).
  - Mã giảm giá (voucher) của đơn hàng cũ **không được tự động sao chép sang**, khách hàng sẽ chọn hoặc nhập voucher mới tại màn hình thanh toán.

**Why this priority**: Chống thất thoát doanh thu (do chênh lệch giá cũ/mới), chống khai thác trái phép dữ liệu đơn hàng của khách hàng khác.

**Independent Test**: Thử nghiệm thêm sản phẩm vào giỏ hàng đã có sẵn sản phẩm đó; kiểm tra giá trị đơn giá trong giỏ hàng phản ánh giá hiện tại chứ không phải đơn giá cũ trong đơn lịch sử.

#### Acceptance Scenarios:
1. **Given** sản phẩm trong đơn cũ có giá 100.000đ, nhưng hiện tại giá niêm yết là 120.000đ,  
   **When** khách hàng bấm "Mua lại",  
   **Then** sản phẩm trong giỏ hàng có đơn giá là 120.000đ.
2. **Given** tài khoản A cố tình gửi request mua lại đơn hàng thuộc sở hữu của tài khoản B,  
   **When** gửi `POST /api/v1/orders/:id/reorder`,  
   **Then** backend trả về 403 hoặc 404 và không thay đổi giỏ hàng của tài khoản A.
3. **Given** giỏ hàng của khách hàng đã có 1 sản phẩm X (số lượng 2), đơn mua lại cũng có sản phẩm X (số lượng 1), và tồn kho khả dụng là 10,  
   **When** thực hiện mua lại,  
   **Then** số lượng sản phẩm X trong giỏ hàng trở thành 3.

---

## 3. Yêu cầu Chức năng (Functional Requirements)

- **FR-01**: Cung cấp API `POST /api/v1/orders/:id/reorder` yêu cầu xác thực người dùng (`requireAuth`):
  - Kiểm tra đơn hàng tồn tại, thuộc quyền sở hữu của `request.user._id`, và có `orderStatus === "completed"`.
  - Duyệt danh sách `items` trong đơn hàng:
    - Tìm kiếm sản phẩm trong database theo `productId` với điều kiện `isActive: true`.
    - Tìm biến thể tương ứng theo `variantSku`.
    - Tính toán tồn kho khả dụng `availableStock = Math.max(0, variant.stock - variant.reservedStock)`.
    - Xác định số lượng thêm vào giỏ: `addQty = Math.min(item.qty, availableStock)`.
  - Thêm hoặc cộng dồn vào `Cart` của khách hàng.
  - Trả về kết quả phân loại: `addedItems` (các món thêm thành công kèm số lượng), `unavailableItems` (các món hết hàng/ngừng bán), `summary` giỏ hàng mới.
- **FR-02**: Hiển thị nút "Mua lại" trên giao diện:
  - Tại bảng danh sách đơn hàng ([frontend/features/orders/components/orders-table.tsx](file:///e:/Pet-Supplies-E-Commerce-System/frontend/features/orders/components/orders-table.tsx)): hiển thị nút thao tác nhanh "Mua lại" đối với các dòng đơn hàng có trạng thái Hoàn thành.
  - Tại trang chi tiết đơn hàng ([frontend/features/orders/components/order-summary-sidebar.tsx](file:///e:/Pet-Supplies-E-Commerce-System/frontend/features/orders/components/order-summary-sidebar.tsx)): hiển thị nút lớn "Mua lại đơn hàng" trong khối thao tác khi `order.orderStatusCode === "completed"`.
- **FR-03**: Xử lý phản hồi trên Frontend:
  - Khi API trả về thành công:
    - Kích hoạt sự kiện `cart-updated` để TopBar cập nhật số lượng badge.
    - Điều hướng người dùng sang `/cart`.
    - Nếu có một số sản phẩm không thể thêm (do hết hàng), hiển thị thông báo toast cảnh báo kèm tên sản phẩm.
  - Nếu toàn bộ sản phẩm không thể thêm: giữ nguyên tại trang hiện tại và hiển thị thông báo lỗi (Alert/Toast).
- **FR-04**: Đảm bảo an toàn giao dịch:
  - Sử dụng cập nhật giỏ hàng nguyên tử hoặc atomic save trên Mongoose để tránh tranh chấp dữ liệu khi khách hàng mở nhiều tab.

---

## 4. Tiêu chí Chấp nhận (Acceptance Criteria)

- [ ] **AC-1**: Nút "Mua lại" xuất hiện ở cả màn hình Danh sách đơn hàng (`/orders`) và Chi tiết đơn hàng (`/orders/[id]`) **chỉ khi đơn hàng ở trạng thái `completed`**.
- [ ] **AC-2**: Khi bấm "Mua lại", các mặt hàng hợp lệ được đưa vào giỏ hàng và trình duyệt tự động điều hướng sang trang `/cart`.
- [ ] **AC-3**: Nếu có sản phẩm trong đơn đã hết hàng hoặc ngừng kinh doanh, các sản phẩm còn hàng vẫn được thêm vào giỏ, và hệ thống hiển thị thông báo chi tiết danh sách sản phẩm không thể thêm.
- [ ] **AC-4**: Nếu toàn bộ sản phẩm trong đơn đều không thể thêm, hệ thống báo lỗi rõ ràng và không điều hướng sang giỏ hàng trống.
- [ ] **AC-5**: Giá sản phẩm đưa vào giỏ hàng là giá hiện hành tại thời điểm mua lại, không lấy đơn giá lịch sử của đơn hàng cũ.
- [ ] **AC-6**: Không cho phép mua lại đơn hàng của người dùng khác (kiểm tra phân quyền chặt chẽ tại Backend).
- [ ] **AC-7**: Unit tests backend và frontend tests vượt qua 100%, Next.js production build thành công 0 lỗi.

---

## 5. Ranh giới & Giới hạn (Non-goals)

- Không tự động đặt đơn hàng mới ngay lập tức (không bỏ qua bước giỏ hàng/thanh toán), vì khách hàng cần xác nhận lại địa chỉ nhận hàng, phương thức thanh toán và kiểm tra lại giá cả hiện tại.
- Không tự động áp dụng lại mã voucher cũ của đơn hàng (voucher cũ có thể đã hết hạn hoặc hết lượt dùng).
- Không áp dụng tính năng này cho đơn hàng bán trực tiếp tại quầy của nhân viên (POS / offline orders) trên giao diện khách hàng.
- Không can thiệp vào các đơn hàng chưa hoàn thành (đang giao, đang chuẩn bị, đã hủy, v.v.).
