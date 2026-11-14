# Tasks: Nhân Viên Chọn Hoặc Nhập Lý Do Khi Hủy Đơn Hàng

**Branch**: `feature/staff-cancel-order-reason`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Task Summary

- **Total Tasks**: 8
- **Phase 1 (Foundational & Backend)**: 3 tasks
- **Phase 2 (User Story 1 - Nhân viên hủy đơn với lý do định sẵn)**: 2 tasks
- **Phase 3 (User Story 2 - Nhân viên chọn 'Khác' và tự viết lý do riêng)**: 1 task
- **Phase 4 (User Story 3 - Tính toàn vẹn dữ liệu & Hiển thị đa màn hình)**: 1 task
- **Phase 5 (Polish & Verification)**: 1 task

---

## Execution Tasks

### Phase 1: Foundational & Backend Validation

- [x] T001 [P] Cập nhật Zod validation `staffOrderStatusSchema` trong `backend/src/validators/order.validator.js` để nhận `cancellationReason` (chuỗi trim, max 200 ký tự) và `cancellationNote` (chuỗi trim, max 500 ký tự, optional), đồng thời bắt buộc `cancellationReason` không được rỗng khi `orderStatus === "cancelled"`.
- [x] T002 Cập nhật controller `updateStaffOrderStatus` trong `backend/src/controllers/order-status.controller.js` để lưu `cancellationReason` và `cancellationNote` vào `changes` khi `input.orderStatus === "cancelled"`.
- [x] T003 [P] Bổ sung Unit Test trong `backend/tests/staff-orders.test.js` kiểm tra chặn yêu cầu hủy đơn thiếu lý do (`400 VALIDATION_ERROR`) và kiểm tra lưu thành công lý do hủy khi cập nhật trạng thái `cancelled`.

---

### Phase 2: User Story 1 - Nhân viên hủy đơn với lý do định sẵn (Priority: P1)

*Goal: Nhân viên có thể chọn một trong các lý do định sẵn khi hủy đơn hàng.*  
*Independent Test: Chọn "Đã hủy", chọn "Hết hàng / Tồn kho không đủ", bấm xác nhận -> đơn hủy thành công và lưu đúng lý do.*

- [x] T004 [P] [US1] Mở rộng type `StaffOrderStatusUpdate` trong `frontend/features/staff/orders/types.ts` để bổ sung trường `cancellationReason?: string` và `cancellationNote?: string`.
- [x] T005 [US1] Cập nhật `frontend/features/staff/components/order-status-action.tsx` để render danh mục lý do hủy (Select/Radio: "Hết hàng / Tồn kho không đủ", "Không thể giao tới địa chỉ người mua", "Người mua yêu cầu hủy", "Không liên lạc được với người mua", "other") khi `nextStatus === "cancelled"`, kèm trường ghi chú tùy chọn `cancellationNote` và gửi payload đầy đủ lên API.

---

### Phase 3: User Story 2 - Nhân viên chọn 'Khác' và tự viết lý do riêng (Priority: P1)

*Goal: Nhân viên có thể tự viết lý do riêng khi các lý do định sẵn không phù hợp.*  
*Independent Test: Chọn "Khác (tự nhập lý do)", kiểm tra validation bắt buộc nhập, nhập nội dung riêng và xác nhận hủy thành công.*

- [x] T006 [US2] Bổ sung input/textarea cho lý do tự viết vào `frontend/features/staff/components/order-status-action.tsx` khi người dùng chọn option "other", kiểm tra độ dài tối thiểu 5 ký tự và không được để trống trước khi cho phép submit.

---

### Phase 4: User Story 3 - Tính toàn vẹn dữ liệu & Hiển thị chi tiết (Priority: P1)

*Goal: Đảm bảo lý do hủy hiển thị rõ ràng trên chi tiết đơn của cả Staff và Khách hàng.*  
*Independent Test: Mở đơn hàng đã hủy ở giao diện Staff và giao diện Khách hàng, xác nhận đều thấy đúng lý do và ghi chú hủy.*

- [x] T007 [US3] Hiển thị banner/hộp thông tin lý do hủy đơn hàng trên màn hình chi tiết đơn hàng của Staff (`frontend/features/staff/components/order-detail-view.tsx` hoặc component liên quan) khi đơn ở trạng thái `cancelled`, tương đồng với giao diện hiển thị của Khách hàng.

---

### Phase 5: Polish & Comprehensive Verification

- [x] T008 Chạy toàn bộ kiểm thử tập trung `cmd /c "npm.cmd --prefix backend test -- tests/staff-orders.test.js"`, `cmd /c "npm.cmd --prefix frontend test"`, và build production `cmd /c "npm.cmd --prefix frontend run build"` để đảm bảo không có lỗi TypeScript, lint hay regression.

