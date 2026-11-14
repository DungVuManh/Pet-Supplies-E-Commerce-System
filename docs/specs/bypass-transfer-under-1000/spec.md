# Feature Specification: Tự Động Bỏ Qua Chuyển Khoản & Đặt Đơn Thành Công Cho Đơn Dưới 1000đ

**Feature Name**: `bypass-transfer-under-1000`  
**Feature Directory**: `docs/specs/bypass-transfer-under-1000`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: "tôi muốn đơn hàng có giá dưới 1000đ thì khi sử dụng phương thức chuyển khoản thì bỏ qua mục chuyển khoản và đặt đơn thành công luôn"

---

## 1. Bối cảnh & Vấn đề (Context & Problem Statement)

### 1.1. Hiện trạng
- Hệ thống thanh toán trực tuyến của Petjoy hiện sử dụng **VietQR / SePay** (`paymentMethod: "ONLINE"`) để tạo mã QR thanh toán động cho đơn hàng trực tuyến.
- Khi khách hàng chọn phương thức "Chuyển khoản ngân hàng (VietQR / SePay)" tại trang `/checkout`:
  1. Frontend gọi API `POST /api/v1/orders` để tạo đơn hàng mới với `paymentStatus: "unpaid"` (hoặc `"pending"`).
  2. Frontend chuyển hướng người dùng sang trang `/checkout/result?orderCode=...&total=...&paymentMethod=ONLINE&paymentProvider=sepay`.
  3. Tại `/checkout/result`, hệ thống hiển thị thẻ `SepayTransferCard` chứa mã QR VietQR kèm đồng hồ đếm ngược 15 phút, yêu cầu khách hàng quét mã chuyển tiền qua ứng dụng ngân hàng.

### 1.2. Vấn đề thực tế
- **Giới hạn kỹ thuật của hệ thống ngân hàng (Napas / VietQR)**: Các ngân hàng tại Việt Nam và hạ tầng thanh toán Napas **không hỗ trợ giao dịch chuyển khoản liên ngân hàng có giá trị dưới 1.000 VNĐ** (hầu hết app ngân hàng báo lỗi "Số tiền chuyển tối thiểu là 1.000đ" hoặc từ chối tạo/quét QR).
- **Trường hợp đơn hàng < 1.000đ**:
  - Khi khách hàng áp dụng voucher giảm giá lớn (ví dụ voucher giảm 100%, hoặc voucher giảm giá khiến tổng tiền đơn hàng chỉ còn 0đ hoặc vài trăm đồng như 500đ).
  - Nếu khách hàng vẫn chọn phương thức "Chuyển khoản ngân hàng", hệ thống sẽ hiển thị mã QR VietQR với số tiền < 1.000đ. Khách hàng không thể chuyển khoản được qua app ngân hàng, dẫn đến đơn hàng bị treo và tự động bị hủy sau 15 phút.
  - Trải nghiệm người dùng bị đứt gãy nghiêm trọng và gây hoang mang cho khách hàng.

### 1.3. Mục tiêu giải pháp
- Đối với bất kỳ đơn hàng nào có tổng tiền thanh toán **dưới 1.000 VNĐ** (`total < 1000`, bao gồm cả đơn 0đ):
  - Khi khách hàng chọn phương thức thanh toán **Chuyển khoản (ONLINE / SePay)**:
    - **Bỏ qua hoàn toàn bước quét mã QR chuyển khoản**.
    - **Đánh dấu đơn hàng là đặt thành công và đã thanh toán ngay lập tức** (`paymentStatus = "paid"`, `paidAmount = total`).
    - Tạo bản ghi thanh toán `Payment` tương ứng với trạng thái `"paid"`.
    - Điều hướng khách hàng thẳng đến màn hình **"Đặt hàng thành công" / "Thanh toán thành công"** mà không yêu cầu quét mã VietQR.
    - Không đặt hạn thanh toán 15 phút (`paymentExpiredAt` là null), không kích hoạt scheduler hủy đơn.

---

## 2. Yêu cầu Chức năng (Functional Requirements)

### FR-01: Tự động đánh dấu thanh toán thành công ở Backend khi `total < 1000`
- Trong hàm `createOrder` ([backend/src/controllers/order.controller.js](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/controllers/order.controller.js)):
  - Khi tính toán xong `total = subtotal - discount + shippingFee`:
  - Nếu `paymentMethod === "ONLINE"` và `total < 1000`:
    - Gán `paymentStatus = "paid"`.
    - Gán `paidAmount = total`.
    - Gán `orderStatus = "pending"` (trạng thái chờ xử lý giao hàng như đơn đã trả tiền bình thường).
    - Không gán thời hạn hết hạn thanh toán (`paymentExpiredAt = undefined`).
    - Tạo bản ghi `Payment`:
      ```javascript
      await Payment.create({
        orderId: newOrder._id,
        method: "ONLINE",
        amount: total,
        status: "paid",
        rawResult: {
          source: "system",
          note: "Tự động hoàn tất thanh toán do đơn hàng dưới 1.000đ",
          autoCompletedAt: new Date(),
        },
      });
      ```
    - Ghi nhận lịch sử trạng thái: thêm mốc `{ to: "pending", at: new Date(), note: "Đơn hàng dưới 1.000đ tự động hoàn tất thanh toán" }`.

### FR-02: Bỏ qua giao diện quét mã QR trên Frontend Kết quả đặt hàng (`/checkout/result`)
- Trong [frontend/features/checkout/components/payment-result-view.tsx](file:///e:/Pet-Supplies-E-Commerce-System/frontend/features/checkout/components/payment-result-view.tsx):
  - Kiểm tra `const total = Number(searchParams.get("total") || 0);`.
  - Cập nhật điều kiện hiển thị `isSepayPending`:
    - Nếu `total < 1000`, bắt buộc `isSepayPending = false`.
  - Ẩn hoàn toàn component `SepayTransferCard`.
  - Hiển thị ngay khối thông báo **"Đặt hàng thành công" / "Thanh toán thành công"** với badge màu xanh lá:
    - Hiển thị đầy đủ thông tin: Mã đơn hàng, Tổng thanh toán, Phương thức thanh toán ("Chuyển khoản ngân hàng - Đã tự động xác nhận"), và nút "Xem chi tiết đơn hàng" / "Tiếp tục mua sắm".

### FR-03: Xử lý ở luồng Thanh toán lại / Xem chi tiết đơn hàng
- Trong trang Chi tiết đơn hàng của khách hàng (`/orders/[id]`) và API `getPaymentInfo` ([backend/src/controllers/payment.controller.js](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/controllers/payment.controller.js)):
  - Nếu đơn hàng có `total < 1000` và `paymentMethod === "ONLINE"`:
    - Đơn hàng đã ở trạng thái `paymentStatus: "paid"`.
    - Không hiển thị nút "Thanh toán lại" hay link quét mã QR.
    - API `getPaymentInfo` trả về `isPaid: true` hoặc thông báo đơn hàng đã hoàn tất thanh toán.

### FR-04: Đảm bảo kiểm soát gian lận & Nhất quán Voucher
- Tổng tiền `total` được tính toán độc lập và tuyệt đối tại Backend từ `priceOrderItems` và `checkVoucher` (không bao giờ tin cậy số tiền do client gửi lên).
- Việc bỏ qua chuyển khoản chỉ kích hoạt khi `total` thực tế sau khi tính toán tại server nhỏ hơn 1.000 VNĐ.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria)

- [ ] **AC-1**: Khi khách hàng đặt đơn hàng trực tuyến có voucher giảm giá lớn khiến `total = 0đ` hoặc `total = 500đ` (< 1.000đ) và chọn phương thức Chuyển khoản (ONLINE / SePay):
  - Đơn hàng được tạo trong MongoDB với `paymentStatus: "paid"`.
  - `paidAmount` bằng chính `total`.
  - Có 1 bản ghi `Payment` với `status: "paid"`.
- [ ] **AC-2**: Sau khi bấm "Đặt hàng", trình duyệt chuyển sang `/checkout/result` hiển thị ngay màn hình **"Đặt hàng thành công"**, KHÔNG xuất hiện mã QR VietQR `SepayTransferCard` và không bắt khách chuyển khoản.
- [ ] **AC-3**: Đơn hàng không bị gắn `paymentExpiredAt` và không bị hủy tự động sau 15 phút.
- [ ] **AC-4**: Với các đơn hàng có `total >= 1000` (ví dụ 1.000đ trở lên) chọn Chuyển khoản:
  - Vẫn hoạt động theo quy trình quét mã VietQR SePay bình thường (`paymentStatus: "unpaid"`, hiển thị mã QR và đếm ngược 15 phút).
- [ ] **AC-5**: Toàn bộ unit tests backend và frontend tests vượt qua 100%, bản build Next.js thành công 0 lỗi.

---

## 4. Ranh giới & Giới hạn (Non-goals)
- Không can thiệp vào các phương thức thanh toán khác (như `COD` hay `CASH` tại quầy).
- Không thay đổi hạn mức tối thiểu của Napas/SePay (vẫn là 1.000đ).
