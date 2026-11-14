# Research & Decision Log: Tự Động Bỏ Qua Chuyển Khoản Cho Đơn Dưới 1.000đ

**Feature**: `bypass-transfer-under-1000`  
**Date**: 2026-11-14  
**Status**: Completed  

---

## 1. Nghiên cứu Hiện trạng & Rào cản Kỹ thuật

### 1.1. Rào cản Hệ thống Ngân hàng (VietQR / Napas / SePay)
- **Hạ tầng Napas & Quy định Ngân hàng Nhà nước**: Các lệnh chuyển tiền nhanh Napas 24/7 và mã chuẩn VietQR bắt buộc số tiền giao dịch tối thiểu là **1.000 VNĐ**.
- **Ứng dụng Ngân hàng Người dùng**: Khi người dùng quét mã VietQR có giá trị 0đ hoặc dưới 1.000đ (ví dụ 500đ), hầu hết các ứng dụng Mobile Banking của các ngân hàng (Vietcombank, MB, Techcombank, VPBank, ACB, v.v.) sẽ chặn ngay tại bước nhập/quét số tiền với thông báo lỗi: *"Số tiền chuyển tối thiểu là 1.000 VND"*.
- **Vấn đề phát sinh tại Petjoy**:
  - Khi khách hàng sử dụng voucher giảm giá sâu (ví dụ voucher giảm 100% hoặc voucher giảm số tiền lớn khiến `subtotal - discount <= 0`), nếu phí vận chuyển là 0đ, tổng tiền đơn hàng `total` sẽ bằng `0đ` hoặc `< 1.000đ`.
  - Nếu khách hàng vẫn chọn phương thức "Chuyển khoản (VietQR / SePay)", hệ thống hiện tại vẫn xuất mã QR và mở phiên thanh toán 15 phút.
  - Khách hàng không thể quét chuyển tiền được, và sau 15 phút đơn hàng tự động bị hủy do hết hạn thanh toán (`CANCELLED_PAYMENT_EXPIRED`), làm mất voucher đã dùng và gây ức chế cho khách hàng.

---

## 2. Các Quyết định Kỹ thuật (Technical Decisions)

### Quyết định 1: Ngưỡng kích hoạt bỏ qua chuyển khoản (Threshold)
- **Phương án lựa chọn**: `total < 1000` (đơn hàng có tổng tiền sau giảm giá và phí vận chuyển nhỏ hơn 1.000 VNĐ).
- **Lý do**:
  - Trùng khớp hoàn toàn với hạn mức giao dịch tối thiểu của hạ tầng Napas và các ngân hàng thương mại Việt Nam.
  - Bao quát cả 2 trường hợp: đơn hàng 0đ (miễn phí 100%) và đơn hàng vài trăm đồng (ví dụ 100đ, 500đ).
- **Các phương án thay thế đã xem xét**:
  - *Chỉ áp dụng cho `total === 0`*: Bị sót các trường hợp voucher còn dư vài trăm đồng (ví dụ 500đ), khách hàng vẫn bị kẹt không chuyển được.
  - *Chuyển phương thức sang COD*: Khách hàng vẫn phải gặp shipper để nhận hàng với số tiền 0đ hoặc vài trăm đồng, nhưng quy trình chuyển sang COD làm thay đổi phương thức khách hàng mong muốn và shipper có thể phải thu tiền lẻ. Đánh dấu "đã thanh toán" là trực quan và tinh gọn nhất.

---

### Quyết định 2: Điểm xử lý đánh dấu thanh toán thành công (Backend vs Frontend)
- **Phương án lựa chọn**: **Backend là nguồn chân lý duy nhất (Single Source of Truth)** trong `createOrder` ([backend/src/controllers/order.controller.js](../../../backend/src/controllers/order.controller.js)).
- **Lý do**:
  - An toàn bảo mật tuyệt đối: `total` được tính toán độc lập tại server (`subtotal - discount + shippingFee`). Không phụ thuộc hay tin cậy bất kỳ tham số nào từ client gửi lên.
  - Ngay khi `Order.create` được gọi:
    - Nếu `paymentMethod === "ONLINE"` và `total < 1000`:
      - `paymentStatus` được đặt ngay là `"paid"`.
      - `paidAmount` được gán bằng `total`.
      - `orderStatus` là `"pending"` (chờ chuẩn bị hàng).
      - `paymentExpiredAt` không được gán (`undefined`/`null`), loại bỏ nguy cơ scheduler tự động hủy đơn sau 15 phút.
      - Tạo ngay 1 bản ghi `Payment` với `status: "paid"` và `rawResult: { source: "system", note: "Tự động hoàn tất thanh toán do đơn hàng dưới 1.000đ" }`.
      - Bổ sung ghi chú vào `statusHistory`.

---

### Quyết định 3: Trải nghiệm người dùng tại màn hình kết quả đặt hàng (`/checkout/result`)
- **Phương án lựa chọn**: Bỏ qua hoàn toàn thẻ `SepayTransferCard` và hiển thị trực tiếp màn hình "Đặt hàng thành công / Thanh toán thành công".
- **Chi tiết triển khai**:
  - Tại [frontend/features/checkout/hooks/use-checkout.ts](../../../frontend/features/checkout/hooks/use-checkout.ts):
    - Đơn hàng trả về từ `createOrderApi` đã có `paymentStatus: "paid"`.
    - Truyền thêm param `isPaid=true` lên URL kết quả: `/checkout/result?...&total=${order.total}&isPaid=${order.paymentStatus === "paid"}`.
  - Tại [frontend/features/checkout/components/payment-result-view.tsx](../../../frontend/features/checkout/components/payment-result-view.tsx):
    - Khởi tạo `isPaid` từ query param: `const isPaidParam = searchParams.get("isPaid") === "true";`.
    - Cập nhật biến `isSepayPending`:
      ```typescript
      const isSepayPending =
        (paymentProvider === "sepay" || initialPaymentMethod === "ONLINE") &&
        currentMethod === "ONLINE" &&
        !isPaid &&
        total >= 1000;
      ```
    - Nếu `total < 1000`, `isSepayPending` luôn là `false`. Màn hình hiển thị ngay thẻ thành công màu xanh lá, kèm nhãn "Thanh toán thành công (Đã xác nhận tự động)" hoặc "Đặt hàng thành công".

---

### Quyết định 4: Tính nhất quán với các chức năng liên quan (Voucher, Hủy đơn, Đánh giá)
- **Voucher**: Quy trình giữ lượt dùng `reserveVoucher` đã chạy trước khi tính `total`. Không có thay đổi nào làm ảnh hưởng đến tính toàn vẹn của mã giảm giá.
- **Tồn kho & Giỏ hàng**: Vẫn trừ tồn kho và xóa sản phẩm khỏi giỏ hàng chuẩn xác như các đơn đặt hàng bình thường khác.
- **Thanh toán lại (Resume Payment)**:
  - Hàm `canResumeOnlinePayment` trong `backend/src/common/order-payment.js` đã có điều kiện `if (order.paymentStatus === "paid") return false;`.
  - Vì đơn hàng dưới 1.000đ đã có `paymentStatus: "paid"`, khách hàng sẽ không bao giờ thấy nút "Thanh toán lại" hay bị kích hoạt lại mã QR.
- **Hủy đơn & Hoàn voucher**:
  - Nếu sau này khách hàng hoặc Staff hủy đơn, hàm `releaseVoucher` vẫn hoạt động bình thường trên `orderId`.

---

## 3. Ma trận Đánh giá Rủi ro (Risk Assessment)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| Khách hàng cố tình gửi body `total: 0` để gian lận | Cao | Backend **tự tính toán `total` từ database** (`priceOrderItems` + `checkVoucher`), bỏ qua mọi giá trị tiền khách gửi lên. |
| Đơn hàng bị scheduler nền hủy sau 15 phút | Trung bình | `paymentExpiredAt` không được gán (`null`/`undefined`), scheduler hủy đơn quá hạn (`expireUnpaidOrders`) chỉ tìm đơn có `paymentStatus !== "paid"` và `paymentExpiredAt <= now`. |
| Giao diện người dùng bị giật mã QR trước khi chuyển thành công | Thấp | Frontend kiểm tra điều kiện `total < 1000` ngay tại component render đầu tiên, không bao giờ mount `SepayTransferCard`. |
| Ảnh hưởng đến các đơn hàng >= 1.000đ | Không | Điều kiện phân nhánh kiểm tra rạch ròi `total < 1000`. Mọi đơn hàng từ 1.000đ trở lên vẫn chạy đúng 100% flow VietQR SePay hiện tại. |
