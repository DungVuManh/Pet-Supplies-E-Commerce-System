# Implementation Plan: Nhân Viên Chọn Hoặc Nhập Lý Do Khi Hủy Đơn Hàng

**Branch**: `feature/staff-cancel-order-reason` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

---

## 1. Summary

Nâng cấp luồng chuyển trạng thái sang **"Đã hủy"** (`cancelled`) của nhân viên tại trang chi tiết đơn hàng Staff:
1. **Frontend**: Bổ sung bộ chọn lý do hủy (danh mục định sẵn + lựa chọn tự viết riêng) kèm ghi chú bổ sung vào component `OrderStatusAction`. Bắt buộc chọn hoặc nhập trước khi xác nhận.
2. **Backend Validation**: Cập nhật Zod schema `staffOrderStatusSchema` bắt buộc có `cancellationReason` (không rỗng) khi `orderStatus === "cancelled"`.
3. **Backend Controller**: Controller `updateStaffOrderStatus` cập nhật `cancellationReason` và `cancellationNote` vào tài liệu đơn hàng và lưu trong lịch sử chuyển đổi.
4. **Staff UI Display**: Hiển thị rõ ràng lý do hủy trên màn hình chi tiết đơn hàng của nhân viên nếu đơn đã bị hủy.

---

## 2. Technical Context

- **Backend**: Node.js 24.x, Express 5, Mongoose 9, Zod, Vitest.
- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- **Data Model**: Collection `orders` (trường `cancellationReason`, `cancellationNote`, `statusHistory`).
- **Authorization**: Endpoint `PATCH /api/v1/staff/orders/:id/status` yêu cầu quyền Staff và xác thực CSRF.

---

## 3. Constitution & Architecture Checklist

- [x] **Layered Architecture**: Tách bạch validator (`order.validator.js`), controller (`order-status.controller.js`), client service (`frontend/features/staff/orders/api.ts`) và React component (`order-status-action.tsx`).
- [x] **Strict Input Validation**: Zod schema từ chối mọi payload chuyển sang `cancelled` mà không kèm lý do hủy hợp lệ.
- [x] **Backward Compatibility**: Các trạng thái khác (`confirmed`, `processing`, `shipping`) không bị ảnh hưởng.
- [x] **Audit Trail**: Ghi nhận đầy đủ nhân viên thực hiện hủy vào `statusHistory`.

---

## 4. Phased Implementation Steps

### Phase 1: Backend Validation & Controller Updates
- [ ] **Step 1.1**: Cập nhật `staffOrderStatusSchema` trong `backend/src/validators/order.validator.js`:
  - Thêm `cancellationReason: z.string().trim().max(200).optional()`
  - Thêm `cancellationNote: z.string().trim().max(500).optional()`
  - Thêm refine check: nếu `orderStatus === "cancelled"` thì `cancellationReason` bắt buộc phải có nội dung sau khi trim.
- [ ] **Step 1.2**: Cập nhật `updateStaffOrderStatus` trong `backend/src/controllers/order-status.controller.js`:
  - Khi `input.orderStatus === "cancelled"`:
    - Gán `changes.cancellationReason = input.cancellationReason`
    - Gán `changes.cancellationNote = input.cancellationNote || null`
- [ ] **Step 1.3**: Bổ sung Unit Tests trong `backend/tests/staff-orders.test.js` kiểm tra validation và kết quả hủy đơn kèm lý do.

### Phase 2: Frontend Types & API Service
- [ ] **Step 2.1**: Cập nhật interface `StaffOrderStatusUpdate` trong `frontend/features/staff/orders/types.ts`:
  - Thêm `cancellationReason?: string`
  - Thêm `cancellationNote?: string`

### Phase 3: Frontend Staff UI Components
- [ ] **Step 3.1**: Cập nhật `frontend/features/staff/components/order-status-action.tsx`:
  - Thêm state quản lý `selectedReason`, `customReason`, `cancellationNote`.
  - Khai báo danh mục lý do:
    - `"Hết hàng / Tồn kho không đủ"`
    - `"Không thể giao tới địa chỉ người mua"`
    - `"Người mua yêu cầu hủy"`
    - `"Không liên lạc được với người mua"`
    - `"other"` (*"Khác (tự nhập lý do)"*)
  - Khi `nextStatus === "cancelled"`:
    - Hiển thị danh sách lựa chọn lý do.
    - Nếu chọn `"other"`, hiển thị Textarea nhập lý do tự viết (validate không để trống).
    - Hiển thị ô Textarea nhập ghi chú bổ sung (tùy chọn).
    - Nút bấm xác nhận hiển thị tone cảnh báo rõ ràng.
- [ ] **Step 3.2**: Cập nhật hiển thị lý do hủy trên màn hình chi tiết đơn hàng nhân viên (nếu đơn hàng đã ở trạng thái `cancelled`).

### Phase 4: Verification & Automated Testing
- [ ] **Step 4.1**: Chạy backend tests: `npm --prefix backend test -- tests/staff-orders.test.js`.
- [ ] **Step 4.2**: Chạy frontend typecheck: `npm --prefix frontend test`.
- [ ] **Step 4.3**: Chạy build kiểm tra tổng thể: `npm --prefix frontend run build`.

