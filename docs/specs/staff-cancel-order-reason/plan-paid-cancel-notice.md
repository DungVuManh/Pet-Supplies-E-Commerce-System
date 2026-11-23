# Implementation Plan: Popup Xác Nhận Hủy Đơn Hàng Đã Thanh Toán (Refund Notice Modal)

**Branch**: `feature/customer-paid-order-cancel-notice` | **Date**: 2026-11-14 | **Spec**: [Customer Paid Order Cancel Notice]

---

## 1. Summary & Problem Statement

Hiện tại, khi khách hàng truy cập trang Hủy đơn hàng (`/orders/[id]/cancel` - `OrderCancelView`):
- Bất kể đơn hàng là COD chưa thanh toán hay đơn đã thanh toán Online trước (`paymentStatusCode === "paid"` hoặc `paymentStatus === "Đã thanh toán"`), khi khách bấm **"Xác nhận hủy đơn"**, hệ thống lập tức gọi API hủy và hiển thị thông báo chuyển hướng đơn thuần sau 1.5s.
- Khách hàng không nhận được xác nhận rõ ràng về việc số tiền đã thanh toán trước sẽ được xử lý ra sao, gây hoang mang, lo lắng về việc mất tiền.

**Yêu cầu mới**:
- Khi khách hàng nhấn **"Xác nhận hủy đơn"** trên trang `OrderCancelView`:
  - **Nếu đơn hàng ĐÃ thanh toán** (`paymentStatusCode === "paid"` hoặc `paymentStatus === "Đã thanh toán"`):
    - Không gọi API hủy ngay, mà mở một **Pop-up / Modal xác nhận hoàn tiền**:
      - Tiêu đề: **"Xác nhận hủy đơn hàng đã thanh toán"**
      - Nội dung thông báo: *"Đơn hàng này đã được thanh toán thành công với số tiền [Tổng tiền]. Nhân viên chăm sóc khách hàng của Petjoy sẽ liên hệ với bạn trong vòng 24h qua số điện thoại đặt hàng để xác nhận thông tin và tiến hành hoàn tiền."*
      - Nút **"Đồng ý hủy đơn"**: Tiến hành gọi API hủy đơn hàng, hiển thị thông báo thành công và chuyển hướng về `/orders`.
      - Nút **"Giữ lại đơn hàng"** (hoặc đóng): Đóng popup, không thực hiện hủy đơn.
  - **Nếu đơn hàng CHƯA thanh toán** (đơn COD hoặc chưa thanh toán):
    - Khách hàng có thể xác nhận hủy trực tiếp như hiện tại (hoặc hiển thị pop-up xác nhận hủy thông thường nhẹ nhàng), không cần thông báo hoàn tiền.

---

## 2. Technical Context

- **Frontend Component**: `frontend/features/orders/components/order-cancel-view.tsx`
- **Data Model**: `OrderDetail` (`order.paymentStatusCode`, `order.paymentStatus`, `order.totalAmount`, `order.orderCode`, `order.customerPhone`).
- **Dependencies**: Tận dụng icon từ `lucide-react` (`AlertCircle`, `PhoneCall`, `CheckCircle2`, `X`), Tailwind CSS styling nhất quán với các modal trong hệ thống (`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200`).

---

## 3. UI/UX Contract & Modal Specification

### Component: `PaidCancelConfirmModal` (hoặc tích hợp trực tiếp trong `order-cancel-view.tsx`)

#### Giao diện Modal khi đơn đã thanh toán:
- **Icon**: Hộp bo góc nền xanh dương hoặc hổ phách với biểu tượng `PhoneCall` hoặc `AlertCircle`.
- **Badge/Nhãn trạng thái**: `Đã thanh toán: [formatVND(order.totalAmount)]`.
- **Thông điệp chính**:
  - *"Đơn hàng của bạn đã được thanh toán thành công."*
  - *"Sau khi bạn xác nhận hủy, nhân viên Petjoy sẽ chủ động liên hệ qua số điện thoại **[SĐT khách hàng]** để hướng dẫn và thực hiện hoàn tiền lại cho bạn (thời gian xử lý dự kiến từ 1 - 3 ngày làm việc)."*
- **Hành động**:
  - Nút chính (Confirm): **"Tôi hiểu & Xác nhận hủy"** (màu đỏ/rose nguy hiểm hoặc cảnh báo, có trạng thái loading khi đang gửi).
  - Nút phụ (Cancel): **"Không hủy nữa, Giữ đơn"** (màu viền xám, đóng popup).

---

## 4. Phased Implementation Steps

### Phase 1: Tạo/Cập nhật UI Component Popup trong `order-cancel-view.tsx`
- [ ] **Step 1.1**: Xác định điều kiện đơn đã thanh toán:
  ```typescript
  const isPaid = order.paymentStatusCode === "paid" || order.paymentStatus === "Đã thanh toán";
  ```
- [ ] **Step 1.2**: Thêm state `isModalOpen` (boolean).
- [ ] **Step 1.3**: Khi khách bấm nút *"Xác nhận hủy đơn"* ở form:
  - Nếu `isPaid`: Mở `setIsModalOpen(true)`.
  - Nếu không `isPaid`: Gọi trực tiếp hàm xử lý `executeCancelOrder()`.
- [ ] **Step 1.4**: Thiết kế modal xác nhận nổi bật, trang nhã, đúng semantic tokens và chuẩn accessibility (`role="dialog"`, `aria-modal="true"`).

### Phase 2: Xử lý Submit API & Trải nghiệm sau khi hủy
- [ ] **Step 2.1**: Trong modal, khi bấm *"Tôi hiểu & Xác nhận hủy"*, gọi API `cancelOrderApi(orderId, selectedReason, cancelNote)`.
- [ ] **Step 2.2**: Sau khi hủy thành công:
  - Đóng modal và hiển thị banner thông báo xanh lá: *"Hủy đơn thành công! Nhân viên Petjoy sẽ liên hệ với bạn sớm nhất để hoàn tiền."*
  - Tự động chuyển hướng về `/orders` sau 2 giây.

### Phase 3: Kiểm thử & Xác minh
- [ ] **Step 3.1**: Kiểm thử tự động frontend (`npm --prefix frontend test`).
- [ ] **Step 3.2**: Kiểm tra TypeScript & build production (`npm --prefix frontend run build`).
- [ ] **Step 3.3**: Kiểm tra thủ công:
  - Đơn COD chưa thanh toán: Bấm hủy đơn -> hủy ngay, không hiện popup hoàn tiền.
  - Đơn Online đã thanh toán: Bấm hủy đơn -> mở popup thông báo nhân viên sẽ liên hệ hoàn tiền -> bấm xác nhận -> hủy thành công.

