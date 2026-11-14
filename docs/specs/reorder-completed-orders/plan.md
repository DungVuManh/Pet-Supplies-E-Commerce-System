# Implementation Plan: Tính Năng Mua Lại Cho Các Đơn Hàng Đã Hoàn Thành (Reorder Completed Orders)

**Branch**: `feature/reorder-completed-orders` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/reorder-completed-orders/spec.md`

---

## 1. Summary

Triển khai tính năng **"Mua lại" (Re-order) 1-click cho các đơn hàng trực tuyến đã ở trạng thái Hoàn thành (`completed`)**:

1. **Tầng Backend**:
   - **Router (`backend/src/routers/order.router.js`)**: Đăng ký route `POST /:id/reorder` với middleware `noStore, requireAuth, requireRole("customer"), protectMutation`.
   - **Validator (`backend/src/validators/order.validator.js`)**: Tận dụng `parseOrderId` có sẵn để kiểm tra format ID đơn hàng.
   - **Controller (`backend/src/controllers/order.controller.js`)**: Viết hàm `reorderCompletedOrder`:
     - Kiểm tra đơn hàng tồn tại, thuộc quyền sở hữu của `request.user._id`, và có `orderStatus === "completed"`.
     - Tra cứu thông tin sản phẩm và biến thể trong DB, tính toán tồn kho khả dụng hiện hành `availableStock = Math.max(0, stock - reservedStock)`.
     - Phân loại sản phẩm:
       - Nếu sản phẩm còn hàng (`availableStock > 0`): thêm hoặc cộng dồn vào `Cart` của khách hàng theo giá niêm yết mới nhất (không vượt quá `availableStock`).
       - Nếu sản phẩm hết hàng hoặc ngừng kinh doanh (`isActive: false`): ghi nhận vào danh sách `unavailableItems`.
     - Nếu không có bất kỳ sản phẩm nào thêm được: trả về 400 `ALL_ITEMS_UNAVAILABLE`.
     - Nếu có ít nhất 1 sản phẩm thêm thành công: lưu `cart.save()` và trả về 200 kèm báo cáo `addedItems`, `unavailableItems`, `summary`.
2. **Tầng Frontend**:
   - **Service (`frontend/features/orders/services/order.service.ts` hoặc `reorder.service.ts`)**: Viết hàm `reorderCompletedOrderApi(orderId: string)` lấy CSRF token và gọi `POST /api/v1/orders/:id/reorder`.
   - **Hook (`frontend/features/orders/hooks/use-reorder.ts`)**: Quản lý trạng thái `isReordering`, `reorderError`, gọi API reorder, kích hoạt sự kiện `cart-updated`, lưu thông báo kết quả và điều hướng sang `/cart`.
   - **Component UI**:
     - Cập nhật [frontend/features/orders/components/order-summary-sidebar.tsx](../../../frontend/features/orders/components/order-summary-sidebar.tsx): Thêm nút **"Mua lại đơn hàng"** nổi bật khi `order.orderStatusCode === "completed"`.
     - Cập nhật [frontend/features/orders/components/orders-table.tsx](../../../frontend/features/orders/components/orders-table.tsx): Thêm nút **"Mua lại"** trong cột thao tác khi `order.status === "completed"`.
3. **Kiểm thử & Đảm bảo Chất lượng**:
   - Viết unit test backend trong `backend/tests/reorder.test.js` hoặc `backend/tests/orders.test.js`.
   - Chạy toàn bộ test suites frontend và backend, kiểm tra build production.

---

## 2. Technical Context

- **Backend**: Node.js 24.x, Express 5.3.0, Mongoose 9.11.2, Vitest 5.0.5.
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Architecture Principles**:
  - Tuân thủ CSRF Protection (`protectMutation` và `X-CSRF-Token`).
  - Phân quyền nghiêm ngặt: Chỉ khách hàng sở hữu đơn hàng mới được phép reorder.
  - Tính tiền độc lập: Giỏ hàng chỉ nhận giá niêm yết hiện hành của biến thể, không tin cậy giá cũ trong lịch sử đơn hàng.
  - Tách bạch cấu trúc feature: UI blocks trong `components/`, state/handlers trong `hooks/`, API calls trong `services/`.

---

## 3. Constitution & Governance Check

*Kiểm tra tuân thủ các nguyên tắc thiết kế và quy ước của dự án (`CLAUDE.md`):*

- [x] **No Ghost Expire Scheduler**: Thao tác reorder chỉ cập nhật `Cart`, không can thiệp hay sửa đổi trạng thái của đơn hàng cũ.
- [x] **Auth & Role Enforcement**: Sử dụng `requireAuth` và `requireRole("customer")` kết hợp kiểm tra `order.customerId.toString() === request.user._id.toString()`.
- [x] **Zero New External Dependencies**: Hoàn toàn tận dụng các model Mongoose (`Order`, `Product`, `Cart`) và helper CSRF có sẵn.
- [x] **Backward Compatibility**: Không làm thay đổi cấu trúc bảng đơn hàng hay phá vỡ các luồng thanh toán hiện có.

---

## 4. Project Structure & File Layout

### Documentation

```text
docs/specs/reorder-completed-orders/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ
├── plan.md                                     # Kế hoạch triển khai (file này)
├── research.md                                 # Khảo sát hiện trạng & 4 quyết định kỹ thuật
├── data-model.md                               # Sơ đồ thực thể & DTO phản hồi
├── quickstart.md                               # Hướng dẫn kiểm thử tự động & thủ công
└── contracts/
    └── reorder-api.yaml                        # Hợp đồng API OpenAPI cho POST /orders/:id/reorder
```

### Source Code Layout

```text
backend/
├── src/
│   ├── controllers/
│   │   └── order.controller.js                 # [MODIFY] Thêm hàm reorderCompletedOrder
│   └── routers/
│       └── order.router.js                     # [MODIFY] Đăng ký route POST /:id/reorder
└── tests/
    └── reorder.test.js                         # [NEW] Test suite toàn diện cho reorder

frontend/
├── features/
│   └── orders/
│       ├── services/
│       │   └── reorder.service.ts              # [NEW] reorderCompletedOrderApi kèm CSRF
│       ├── hooks/
│       │   └── use-reorder.ts                  # [NEW] Hook xử lý logic nút Mua lại & điều hướng
│       └── components/
│           ├── order-summary-sidebar.tsx       # [MODIFY] Thêm nút Mua lại đơn hàng trong chi tiết đơn
│           └── orders-table.tsx                # [MODIFY] Thêm nút Mua lại trong danh sách đơn hàng
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Backend API Implementation (`order.controller.js` & `order.router.js`)
- **Bước 1.1**: Viết hàm `reorderCompletedOrder` trong `backend/src/controllers/order.controller.js`:
  - Lấy `id` từ `parseOrderId(request.params)`.
  - Tìm `order = await Order.findOne({ _id: id, customerId: request.user._id })`. Nếu không thấy, ném `AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND")`.
  - Nếu `order.orderStatus !== "completed"`, ném `AppError("Chỉ có thể mua lại các đơn hàng đã hoàn thành.", 400, "ORDER_NOT_COMPLETED")`.
  - Lấy danh sách sản phẩm từ DB: `Product.find({ _id: { $in: productIds }, isActive: true })`.
  - Lấy hoặc tạo mới `Cart` của khách hàng: `await Cart.findOne({ userId: request.user._id })`.
  - Lặp qua từng item trong `order.items`, kiểm tra biến thể và `availableStock`, cộng dồn vào `cart.items`.
  - Nếu `addedItems.length === 0`, ném `AppError("Rất tiếc, tất cả các sản phẩm trong đơn hàng này hiện đã hết hàng hoặc ngừng kinh doanh.", 400, "ALL_ITEMS_UNAVAILABLE", { unavailableItems })`.
  - Lưu `await cart.save()` và trả về HTTP 200 kèm `data: { orderCode, addedCount, unavailableCount, addedItems, unavailableItems }`.
- **Bước 1.2**: Đăng ký route trong `backend/src/routers/order.router.js`:
  ```javascript
  router.post(
    "/:id/reorder",
    noStore,
    requireAuth,
    requireRole("customer"),
    protectMutation,
    reorderCompletedOrder,
  );
  ```

### Phase 2: Frontend Service & Hook (`reorder.service.ts` & `use-reorder.ts`)
- **Bước 2.1**: Tạo `frontend/features/orders/services/reorder.service.ts`:
  - Gọi `/api/v1/auth/csrf` lấy token.
  - Gọi `POST /api/v1/orders/${id}/reorder` với `credentials: "include"`, `cache: "no-store"`.
  - Định nghĩa kiểu dữ liệu `ReorderResult` và lớp lỗi `ReorderApiError`.
- **Bước 2.2**: Tạo `frontend/features/orders/hooks/use-reorder.ts`:
  - Quản lý `isReordering: boolean`, `errorMessage: string | null`.
  - Hàm `handleReorder(orderId: string)`:
    - Khi thành công: dispatch `cart-updated`, lưu thông báo flash vào sessionStorage (hoặc hiển thị toast), chuyển hướng sang `/cart`.
    - Khi thất bại: hiển thị thông báo lỗi thân thiện.

### Phase 3: Frontend UI Integration (`order-summary-sidebar.tsx` & `orders-table.tsx`)
- **Bước 3.1**: Trong `order-summary-sidebar.tsx`:
  - Khi `order.orderStatusCode === "completed"`: hiển thị nút lớn **"Mua lại đơn hàng"** với icon giỏ hàng / lặp lại.
  - Bấm vào kích hoạt `handleReorder(order.id)`.
- **Bước 3.2**: Trong `orders-table.tsx`:
  - Tại cột thao tác, nếu dòng đơn hàng có `order.status === "completed"`, hiển thị thêm nút **"Mua lại"** bên cạnh link "Chi tiết →".

### Phase 4: Unit Testing & Verification
- **Bước 4.1**: Viết bộ test `backend/tests/reorder.test.js`:
  - Test case: Đơn hàng hoàn thành hợp lệ (reorder thành công).
  - Test case: Đơn hàng chưa hoàn thành (báo lỗi `ORDER_NOT_COMPLETED`).
  - Test case: Đơn hàng của người dùng khác (báo lỗi 404).
  - Test case: Sản phẩm một phần hết hàng (partial success).
  - Test case: Tất cả sản phẩm hết hàng (báo lỗi `ALL_ITEMS_UNAVAILABLE`).
- **Bước 4.2**: Chạy hồi quy:
  - `npm.cmd --prefix backend test`
  - `npm.cmd --prefix frontend test`
  - `npm.cmd --prefix frontend run build`
