# Implementation Plan: Tự Động Bỏ Qua Chuyển Khoản Cho Đơn Dưới 1.000đ

**Branch**: `feature/bypass-transfer-under-1000` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/bypass-transfer-under-1000/spec.md`

---

## 1. Summary

Triển khai cơ chế **tự động hoàn tất thanh toán và bỏ qua bước quét mã QR VietQR khi khách hàng chọn phương thức Chuyển khoản (ONLINE / SePay) cho các đơn hàng có tổng thanh toán dưới 1.000 VNĐ** (`total < 1000`, bao gồm cả đơn 0đ và đơn vài trăm đồng do voucher giảm giá sâu):

1. **Tầng Backend (`backend/src/controllers/order.controller.js`)**:
   - Trong hàm `createOrder`, sau khi tính `total = subtotal - discount + shippingFee`:
   - Nếu `paymentMethod === "ONLINE"` và `total < 1000`:
     - Khởi tạo `Order` với:
       - `paymentStatus: "paid"`
       - `paidAmount: total`
       - `orderStatus: "pending"`
       - `paymentExpiredAt: undefined` (không gán hạn 15 phút, ngăn scheduler hủy đơn)
       - `statusHistory`: ghi nhận mốc khởi tạo kèm ghi chú hệ thống tự động hoàn tất thanh toán.
     - Tạo 1 bản ghi `Payment` với trạng thái `"paid"` để ghi nhận giao dịch kế toán phục vụ đối soát.
2. **Tầng Frontend (`frontend/features/checkout/`)**:
   - Trong `use-checkout.ts`: Sau khi nhận phản hồi đơn hàng từ backend, nếu đơn đã ở trạng thái `"paid"`, bổ sung param `isPaid=true` vào URL chuyển hướng sang `/checkout/result`.
   - Trong `payment-result-view.tsx`:
     - Nhận diện `isPaid` từ `searchParams`.
     - Cập nhật điều kiện `isSepayPending`: bắt buộc `total >= 1000`.
     - Với `total < 1000`, bỏ qua hoàn toàn component `SepayTransferCard` và hiển thị trực tiếp thẻ **"Đặt hàng thành công / Thanh toán thành công"**.
3. **Kiểm thử & Đảm bảo Chất lượng (`backend/tests/` & `frontend/tests/`)**:
   - Bổ sung unit tests cho trường hợp `createOrder` với `paymentMethod === "ONLINE"` và `total < 1000` trong `orders.test.js`.
   - Chạy toàn bộ test suite backend và frontend kiểm tra tính tương thích và hồi quy.

---

## 2. Technical Context

- **Backend**: Node.js 24.x, Express 5.3.0, Mongoose 9.11.2, Vitest 5.0.5.
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Banking Constraint**: VietQR / Napas / SePay chỉ chấp nhận giao dịch >= 1.000 VNĐ.
- **Architecture Principle**:
  - Backend là nguồn chân lý duy nhất xác định `total` và trạng thái `paymentStatus`.
  - Frontend chỉ hiển thị theo trạng thái thực tế từ backend và thông số `total`.
  - Không cài đặt thêm bất kỳ thư viện ngoài nào.

---

## 3. Constitution & Governance Check

*Kiểm tra tuân thủ các nguyên tắc thiết kế và quy ước của dự án (`CLAUDE.md`):*

- [x] **Single Source of Truth on Server**: Toàn bộ tính toán giá tiền, chiết khấu voucher và quyết định `paymentStatus = "paid"` đều diễn ra ở `backend/src/controllers/order.controller.js`. Client không thể giả mạo.
- [x] **No Ghost Expire Scheduler**: Khi `paymentStatus === "paid"` và `paymentExpiredAt` không được gán, cron job quét đơn hết hạn thanh toán (`expireUnpaidOrders`) sẽ bỏ qua đơn hàng này một cách tự nhiên.
- [x] **Zero New Dependencies**: Tận dụng logic và thư viện hiện có (`Payment.create`, `Order.create`).
- [x] **Backward Compatibility**: Các đơn hàng `total >= 1000` hoặc phương thức `COD` giữ nguyên 100% logic hiện tại.

---

## 4. Project Structure

### Documentation (this feature)

```text
docs/specs/bypass-transfer-under-1000/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ
├── plan.md                                     # Kế hoạch triển khai (file này)
├── research.md                                 # Khảo sát hiện trạng & 4 quyết định kỹ thuật
├── data-model.md                               # Trạng thái Order & Payment cho đơn < 1.000đ
├── quickstart.md                               # Hướng dẫn kiểm thử tự động và thủ công
└── contracts/
    └── bypass-transfer-api.yaml                # Hợp đồng API giữa Client và Server
```

### Source Code Changes

```text
backend/
├── src/
│   └── controllers/
│       └── order.controller.js                 # [MODIFY] Gán paymentStatus="paid", paidAmount=total, tạo Payment khi total < 1000 & paymentMethod=="ONLINE"
└── tests/
    └── orders.test.js                          # [MODIFY] Thêm test case cho createOrder với total < 1000

frontend/
├── features/
│   └── checkout/
│       ├── hooks/
│       │   └── use-checkout.ts                 # [MODIFY] Bổ sung isPaid vào query params khi điều hướng sang /checkout/result
│       └── components/
│           └── payment-result-view.tsx         # [MODIFY] Chặn isSepayPending khi total < 1000, hiển thị ngay thẻ thành công
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Backend Implementation (`backend/src/controllers/order.controller.js`)
- **Bước 1.1**: Nhập `Payment` model vào `order.controller.js`.
- **Bước 1.2**: Trong hàm `createOrder`:
  - Kiểm tra điều kiện:
    ```javascript
    const isOnlineAutoPaid = paymentMethod === "ONLINE" && total < 1000;
    const initialPaymentStatus = isOnlineAutoPaid ? "paid" : "unpaid";
    const initialPaidAmount = isOnlineAutoPaid ? total : 0;
    ```
  - Trong `Order.create`:
    - `paymentStatus: initialPaymentStatus`
    - `paidAmount: initialPaidAmount`
    - `orderStatus: "pending"`
    - Ghi nhận `statusHistory`:
      ```javascript
      statusHistory: [
        {
          to: "pending",
          at: new Date(),
          ...(isOnlineAutoPaid
            ? { note: "Đơn hàng dưới 1.000đ tự động hoàn tất thanh toán" }
            : {}),
        },
      ],
      ```
  - Sau khi `Order.create` thành công:
    - Nếu `isOnlineAutoPaid`:
      ```javascript
      await Payment.create({
        orderId: newOrder._id,
        method: "ONLINE",
        amount: total,
        status: "paid",
        transactionRef: `AUTO-PAID-${newOrder.orderCode}`,
        rawResult: {
          source: "system",
          note: "Tự động hoàn tất thanh toán do đơn hàng dưới 1.000đ",
          autoCompletedAt: new Date(),
        },
      }).catch((payErr) => {
        console.error("Lỗi tạo bản ghi thanh toán tự động:", payErr);
      });
      ```

### Phase 2: Frontend Implementation (`frontend/features/checkout/`)
- **Bước 2.1**: Cập nhật `frontend/features/checkout/hooks/use-checkout.ts`:
  - Trong hàm `handlePlaceOrder`, truyền `isPaid: String(order?.paymentStatus === "paid")` vào `queryParams`.
- **Bước 2.2**: Cập nhật `frontend/features/checkout/components/payment-result-view.tsx`:
  - Đọc `isPaid` ban đầu từ `searchParams`:
    ```typescript
    const isPaidParam = searchParams.get("isPaid") === "true";
    const [isPaid, setIsPaid] = useState(isPaidParam);
    ```
  - Cập nhật biến `isSepayPending`:
    ```typescript
    const isSepayPending =
      (paymentProvider === "sepay" || initialPaymentMethod === "ONLINE") &&
      currentMethod === "ONLINE" &&
      !isPaid &&
      total >= 1000;
    ```
  - Hiển thị thông báo phù hợp khi `isPaid || total < 1000`.

### Phase 3: Unit Testing & Verification
- **Bước 3.1**: Bổ sung unit test trong `backend/tests/orders.test.js` kiểm tra đơn hàng `ONLINE` với `total < 1000`:
  - Xác nhận `paymentStatus` là `"paid"`.
  - Xác nhận `paidAmount` bằng `total`.
  - Xác nhận `Payment.create` được gọi.
- **Bước 3.2**: Chạy kiểm thử toàn diện:
  - `npm --prefix backend test`
  - `npm --prefix frontend test`
  - `npm --prefix frontend run build`
