# Feature Specification: Nhân viên chọn hoặc nhập lý do khi hủy đơn hàng (Staff Cancel Order Reason)

**Feature Branch**: `feature/staff-cancel-order-reason`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: User description: "tôi muốn khi nhân viên hủy đơn hàng phải chọn lý do (hết hàng , Không thể giao tới địa chỉ người mua , Người mua yêu cầu hủy ,... hoặc tự viết riêng)"

---

## 1. Context & Business Goals

Hiện tại, khách hàng khi hủy đơn trên hệ thống đã có giao diện chọn lý do hủy (`order-cancel-view.tsx`) và backend đã lưu trữ `cancellationReason` cũng như `cancellationNote` vào MongoDB `Order`.

Tuy nhiên, ở phía Nhân viên (Staff workspace):
- Tại màn hình chi tiết đơn hàng (`frontend/features/staff/components/order-status-action.tsx`), khi nhân viên chọn chuyển trạng thái đơn sang **"Đã hủy"** (`cancelled`), hệ thống chỉ hiện một câu xác nhận chung chung: *"Chuyển đơn từ [Trạng thái cũ] sang Đã hủy?"* mà **chưa bắt buộc nhân viên chọn hoặc nhập lý do hủy**.
- Backend API cập nhật trạng thái đơn của Staff (`PATCH /api/v1/staff/orders/:id/status` do `updateStaffOrderStatus` xử lý) chưa tiếp nhận và xác thực `cancellationReason` và `cancellationNote` khi chuyển sang trạng thái `cancelled`.

**Mục tiêu của tính năng:**
1. Khi nhân viên chọn trạng thái **"Đã hủy"** (từ `pending` hoặc `confirmed`), giao diện bắt buộc nhân viên phải chọn một lý do hủy chuẩn từ danh sách định sẵn (Hết hàng / Tồn kho không đủ, Không thể giao tới địa chỉ người mua, Người mua yêu cầu hủy, Không liên lạc được với người mua, Khác...), hoặc tự nhập lý do riêng.
2. Nếu chọn lý do "Khác" (hoặc muốn bổ sung chi tiết), nhân viên có thể nhập ghi chú giải thích cụ thể.
3. Backend bắt buộc xác thực: nếu chuyển sang `orderStatus: "cancelled"`, phải có `cancellationReason` hợp lệ, đồng thời lưu vết vào đơn hàng (`cancellationReason`, `cancellationNote`, và `statusHistory`).
4. Dữ liệu lý do hủy này được hiển thị rõ ràng trên cả giao diện Staff (Chi tiết đơn hàng nhân viên, Lịch sử đơn) và giao diện Khách hàng (Chi tiết đơn hàng của khách hàng).

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhân viên hủy đơn với lý do định sẵn (Priority: P1)
Khi nhân viên đang ở màn hình chi tiết đơn hàng (trạng thái `pending` hoặc `confirmed`), nhân viên chọn chuyển trạng thái tiếp theo là **"Đã hủy"**. Hệ thống mở rộng phần chọn lý do hủy, bắt buộc nhân viên phải chọn một trong các lý do có sẵn:
- **Hết hàng / Tồn kho không đủ**
- **Không thể giao tới địa chỉ người mua**
- **Người mua yêu cầu hủy**
- **Không liên lạc được với người mua**
- **Khác (tự nhập lý do)**

Nhân viên chọn một lý do (ví dụ: *"Hết hàng / Tồn kho không đủ"*), có thể nhập thêm ghi chú tùy chọn, sau đó nhấn **"Xác nhận hủy đơn"**. Hệ thống cập nhật đơn hàng thành công, hiển thị thông báo và cập nhật giao diện.

**Independent Test**: Đăng nhập tài khoản Staff, mở đơn hàng đang ở `pending` hoặc `confirmed`. Chọn chuyển sang "Đã hủy", chọn lý do "Hết hàng / Tồn kho không đủ", bấm xác nhận. Kiểm tra trạng thái đơn chuyển sang "Đã hủy" và lý do hủy hiển thị chính xác.

**Acceptance Scenarios**:
1. **Given** đơn hàng đang ở trạng thái `pending` hoặc `confirmed`, **When** nhân viên chọn trạng thái tiếp theo là "Đã hủy", **Then** hệ thống hiển thị khối chọn lý do hủy đơn hàng bắt buộc.
2. **Given** nhân viên chọn một trong các lý do có sẵn, **When** nhân viên nhấn xác nhận, **Then** hệ thống gọi API cập nhật trạng thái kèm lý do hủy, đơn hàng chuyển sang `cancelled` và hiển thị lý do vừa chọn.

---

### User Story 2 - Nhân viên chọn "Khác" và tự viết lý do riêng (Priority: P1)
Khi lý do hủy không nằm trong danh mục định sẵn, nhân viên chọn tùy chọn **"Khác (tự nhập lý do)"**. Khi đó, một ô văn bản (textarea hoặc input) xuất hiện bắt buộc nhân viên phải nhập lý do cụ thể (tối thiểu 5 ký tự, tối đa 500 ký tự). Nếu nhân viên để trống hoặc chỉ nhập khoảng trắng, nút xác nhận bị vô hiệu hóa hoặc báo lỗi yêu cầu nhập lý do.

**Independent Test**: Chọn "Đã hủy", chọn "Khác (tự nhập lý do)", thử bấm gửi khi ô nhập trống -> hệ thống báo lỗi. Nhập *"Sản phẩm bị lỗi bao bì trong kho"* -> bấm gửi -> thành công, đơn lưu lý do hủy này.

**Acceptance Scenarios**:
1. **Given** nhân viên chọn lý do "Khác (tự nhập lý do)", **When** ô nhập lý do riêng bị để trống, **Then** hệ thống không cho phép gửi và hiển thị thông báo "Vui lòng nhập lý do hủy đơn".
2. **Given** nhân viên đã nhập lý do riêng hợp lệ, **When** nhân viên nhấn xác nhận, **Then** đơn hàng được hủy với lý do tùy chỉnh đó.

---

### User Story 3 - Tính toàn vẹn dữ liệu và hiển thị đa màn hình (Priority: P1)
Lý do hủy đơn do nhân viên ghi nhận phải được lưu trữ đồng nhất trên hệ thống:
- Được lưu vào trường `cancellationReason` và `cancellationNote` của đơn hàng.
- Được ghi nhận trong lịch sử trạng thái `statusHistory` với người thực hiện là nhân viên đó (`request.user._id`).
- Hiển thị trên màn hình Chi tiết đơn hàng của Staff (khối thông báo đơn đã hủy).
- Hiển thị trên màn hình Chi tiết đơn hàng của Khách hàng (`/orders/[id]`) để khách hàng nắm rõ nguyên nhân đơn hàng bị hủy.

**Independent Test**: Sau khi nhân viên hủy đơn với lý do cụ thể, dùng tài khoản khách hàng mở lại đơn hàng đó tại `/orders/[id]`. Xác minh banner hủy đơn của khách hiển thị đúng lý do mà nhân viên đã chọn/nhập.

**Acceptance Scenarios**:
1. **Given** đơn hàng đã bị hủy bởi nhân viên kèm lý do, **When** nhân viên hoặc khách hàng xem lại chi tiết đơn hàng, **Then** cả hai bên đều thấy rõ dòng lý do hủy tương ứng.

---

## 3. Edge Cases & Error Handling

1. **Nhân viên cố tình gửi API không có lý do hủy khi chọn cancelled**:
   - Backend Zod schema từ chối với mã lỗi `400 VALIDATION_ERROR` và thông báo `"Vui lòng cung cấp lý do hủy đơn hàng."`.
2. **Đơn hàng đã bị thay đổi trạng thái trước đó (Race condition)**:
   - Nếu khách hàng đã tự hủy hoặc đơn đã sang trạng thái khác trước khi nhân viên nhấn xác nhận, hệ thống giữ nguyên kiểm tra `ORDER_STATUS_CONFLICT` (`409`) và yêu cầu tải lại đơn.
3. **Đơn hàng đã thanh toán Online trước (`paymentStatus === "paid"`)**:
   - Khi nhân viên hủy đơn đã thanh toán trước (ví dụ do hết hàng), voucher được hoàn lại ngay lập tức (`releaseVoucher`).
   - Đơn hàng chuyển sang `cancelled` nhưng giữ nguyên `paymentStatus: "paid"` để làm căn cứ hoàn tiền cho khách.
4. **Nhập quá dài**:
   - Ghi chú hoặc lý do riêng giới hạn tối đa 500 ký tự; backend cắt khoảng trắng thừa hoặc từ chối nếu vượt quá giới hạn.

---

## 4. Functional Requirements

### Frontend (Staff Workspace)
- **FR-01**: Trong `OrderStatusAction` (`frontend/features/staff/components/order-status-action.tsx`), khi `nextStatus === "cancelled"`, hiển thị thêm form lựa chọn lý do:
  - Radio group hoặc Select box gồm:
    1. `"Hết hàng / Tồn kho không đủ"`
    2. `"Không thể giao tới địa chỉ người mua"`
    3. `"Người mua yêu cầu hủy"`
    4. `"Không liên lạc được với người mua"`
    5. `"other"` (*"Khác (tự nhập lý do)"*)
  - Nếu chọn `"other"`, bắt buộc hiển thị trường nhập text/textarea để nhập nội dung lý do tự viết.
  - Trường ghi chú bổ sung (`cancellationNote`) dạng textarea (tùy chọn).
- **FR-02**: Hiển thị lý do hủy rõ ràng trên giao diện Chi tiết đơn hàng phía Staff (`StaffOrderDetail`) khi đơn hàng đang ở trạng thái `cancelled`.

### Backend API & Validation
- **FR-03**: Cập nhật `staffOrderStatusSchema` trong `backend/src/validators/order.validator.js`:
  - Thêm trường `cancellationReason` (string, max 200 ký tự).
  - Thêm trường `cancellationNote` (string, max 500 ký tự, optional).
  - Thêm quy tắc refine: Nếu `orderStatus === "cancelled"`, bắt buộc `cancellationReason` phải có giá trị không rỗng (sau khi trim).
- **FR-04**: Cập nhật controller `updateStaffOrderStatus` trong `backend/src/controllers/order-status.controller.js`:
  - Nếu `input.orderStatus === "cancelled"`, bổ sung `cancellationReason` và `cancellationNote` vào `changes`.
  - Giữ nguyên cơ chế hoàn trả voucher `releaseVoucher(id)` khi hủy đơn.

---

## 5. Success Criteria

1. **100%** thao tác hủy đơn từ nhân viên trên giao diện quản lý đơn hàng đều có lý do hủy được lưu lại.
2. Nhân viên không thể gửi xác nhận hủy đơn nếu chưa chọn lý do hoặc chưa nhập nội dung khi chọn "Khác".
3. Màn hình chi tiết đơn hàng của Staff và Khách hàng hiển thị chính xác lý do hủy sau khi đơn bị hủy.
4. Tất cả các unit/integration test liên quan đến `updateStaffOrderStatus` và schema validation đều vượt qua không phát sinh lỗi thoái lui.

