# Technical Research: Quy Trình Nhân Viên Chọn & Nhập Lý Do Khi Hủy Đơn Hàng

**Feature Branch**: `feature/staff-cancel-order-reason`  
**Date**: 2026-11-14  
**Context**: [spec.md](./spec.md)

---

## 1. Research Questions & Decisions

### Q1: Cấu trúc danh mục lý do hủy định sẵn cho Staff
- **Decision**: Cung cấp danh sách các lý do phổ biến mà nhân viên thường gặp trong vận hành cửa hàng:
  1. `"Hết hàng / Tồn kho không đủ"` (Out of stock)
  2. `"Không thể giao tới địa chỉ người mua"` (Address unreachable / delivery failed)
  3. `"Người mua yêu cầu hủy"` (Customer requested cancellation via call/chat)
  4. `"Không liên lạc được với người mua"` (Customer unreachable)
  5. `"other"`: Khác (tự nhập lý do riêng)
- **Rationale**: Khớp với yêu cầu của người dùng, phân loại rõ ràng nguồn gốc lỗi (do kho, do vận chuyển, do khách hay bất khả kháng), giúp báo cáo và phân tích vận hành chính xác.

### Q2: Cơ chế lưu trữ trong cơ sở dữ liệu MongoDB
- **Decision**: Tái sử dụng trực tiếp 2 trường đã có trên model `Order` (`backend/src/models/order.model.js`):
  - `cancellationReason`: `String` (lưu nhãn lý do đã chọn hoặc nội dung lý do tự viết nếu chọn "Khác").
  - `cancellationNote`: `String` (ghi chú bổ sung của nhân viên, tùy chọn).
  - Ghi nhận vào `statusHistory`: `{ from: expectedStatus, to: "cancelled", by: request.user._id, at: new Date() }`.
- **Rationale**: Schema `Order` đã khai báo sẵn `cancellationReason` và `cancellationNote` trong lần nâng cấp trước. Không cần migration cơ sở dữ liệu, đảm bảo tương thích ngược 100%.

### Q3: Giao diện người dùng (UI/UX) trên form chuyển trạng thái Staff
- **Decision**: Trong component `OrderStatusAction` (`frontend/features/staff/components/order-status-action.tsx`):
  - Khi nhân viên chọn `nextStatus === "cancelled"`:
    - Hiển thị thêm nhóm lựa chọn lý do (Select dropdown hoặc Radio list).
    - Mặc định chọn lý do đầu tiên (`"Hết hàng / Tồn kho không đủ"`).
    - Nếu nhân viên chọn `"other"` (Khác), hiển thị ô nhập Textarea bắt buộc nhập nội dung (tối thiểu 5 ký tự).
    - Thêm ô ghi chú bổ sung (tùy chọn).
  - Nút xác nhận đổi nhãn thành **"Xác nhận hủy đơn"** với tone cảnh báo màu đỏ (`bg-danger text-white` hoặc cảnh báo rõ ràng).
- **Rationale**: Giúp nhân viên nhận thức rõ hành động hủy đơn là không thể đảo ngược và bắt buộc hoàn tất lý do trước khi submit.

### Q4: Xác thực tại Backend API (`updateStaffOrderStatus`)
- **Decision**: 
  - Cập nhật Zod schema `staffOrderStatusSchema`:
    ```javascript
    cancellationReason: z.string().trim().max(200).optional(),
    cancellationNote: z.string().trim().max(500).optional(),
    ```
    Kèm refine check: nếu `orderStatus === "cancelled"`, `cancellationReason` bắt buộc phải là chuỗi không rỗng (`min(1)`).
  - Trong controller `updateStaffOrderStatus`: nếu `input.orderStatus === "cancelled"`, gán `changes.cancellationReason = input.cancellationReason` và `changes.cancellationNote = input.cancellationNote || null`.
- **Rationale**: Chặn đứng mọi trường hợp bypass từ API, đảm bảo 100% đơn hủy đều có dữ liệu lý do.

