# Implementation Plan: Tích Hợp Thanh Toán Chuyển Khoản Qua SePay (VietQR)

**Branch**: `feature/sepay-transfer-payment` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/sepay-transfer-payment/spec.md`

## Summary

Xây dựng và tích hợp hoàn chỉnh phương thức thanh toán **Chuyển khoản ngân hàng (VietQR qua SePay)** vào hệ thống Pet Supplies E-Commerce:
1. **Phía Khách hàng (Storefront Checkout)**: Bổ sung tùy chọn chuyển khoản SePay tại bước thanh toán; tạo màn hình hiển thị mã VietQR động theo chuẩn Napas với đầy đủ thông tin tài khoản, số tiền và nội dung chuyển khoản `PETLY <orderCode>`; cơ chế đồng bộ trạng thái thanh toán thời gian thực theo mô hình kết hợp (Polling 3s + nút kiểm tra chủ động); hỗ trợ chuyển bù khi thiếu tiền và xử lý khi phiên 15 phút hết hạn (gia hạn hoặc đổi sang COD).
2. **Phía Cổng thanh toán & Webhook (Backend Integration)**: Cung cấp Webhook endpoint an toàn tiếp nhận thông báo từ SePay (chạy qua ngrok tunnel trong môi trường kiểm thử); đối soát tự động mã đơn và số tiền; đảm bảo tính bất biến (Idempotency - BR-16); ghi nhận giao dịch vào `Payment` và cập nhật `Order.paymentStatus = "paid"` (BR-15); hỗ trợ gắn cờ cảnh báo `needs_review` cho nhân viên khi phát sinh ngoại lệ.
3. **Phía Quản trị & Nhân viên (Workspace UI)**: Hiển thị chi tiết phương thức thanh toán, mã tham chiếu ngân hàng, trạng thái thanh toán và ngăn chặn nhân viên xác nhận đơn hàng khi chưa hoàn tất thanh toán (BR-18).

---

## Technical Context

**Language/Version**:
- Backend: Node.js 24.x (ES Modules `import/export`), Express 5.3.0
- Frontend: TypeScript 5.x, React 19, Next.js 16 (App Router), Tailwind CSS 4

**Primary Dependencies**:
- Backend: `express` (5.3.0), `mongoose` (9.11.2), `zod` (4.6.7), `cors`, `helmet`, `express-rate-limit`, `dotenv`
- Frontend: `next` (16.x), `react` (19.x), `lucide-react`, `tailwind-merge`

**Storage**:
- MongoDB 7+ (Standalone / MongoDB Atlas) thông qua Mongoose 9 ODM.
- Không sử dụng distributed transactions; đảm bảo tính toàn vẹn thông qua các thao tác nguyên tử (atomic updates `$set`, `$inc`, Unique index) và compensating writes.

**Testing**:
- Backend: Vitest 5.0.5, Supertest 7.3.1
- Frontend: Unit/Component testing với Vitest/Testing Library, API mocks

**Target Platform**:
- Web application (Next.js storefront cổng 3000, Express API cổng 3001)
- Tunneling: `ngrok` chuyển tiếp webhook từ Internet về `localhost:3001` trong quá trình phát triển

**Project Type**:
- Web application (Hai package riêng biệt: `backend/` và `frontend/`)

**Performance Goals**:
- Sinh mã VietQR và trả về trang thanh toán trong dưới **2 giây**.
- Cập nhật trạng thái đơn hàng khi nhận Webhook trong dưới **4 giây** (bao gồm độ trễ ngrok và chu kỳ polling 3 giây).

**Constraints**:
- Tuân thủ các nguyên tắc nghiệp vụ cốt lõi trong SRS:
  - `BR-15`: Đơn hàng online chỉ được đánh dấu `paid` sau khi đối soát thành công kết quả thanh toán khớp mã đơn và số tiền.
  - `BR-16`: Idempotency - Không xử lý lặp lại nếu cùng một mã giao dịch SePay được gửi nhiều lần.
  - `BR-18`: Nhân viên chỉ được phép xác nhận (Confirm) đơn hàng khi đơn hàng online đã thanh toán thành công (`paymentStatus === "paid"`).
  - `CR-06`: Tách biệt hoàn toàn `orderStatus` và `paymentStatus`.
  - `CR-08`: Bảo mật thông tin, không để lộ API Key, Secret Token hoặc stack trace trong các phản hồi công khai.

**Scale/Scope**:
- Hỗ trợ lưu trữ nhiều giao dịch thanh toán con cho cùng một đơn hàng khi khách hàng chuyển khoản bù tiền.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Technical Debt Leakage**: Mọi schema, index và DTO đều được định nghĩa chặt chẽ với Mongoose schema và Zod validator.
- [x] **Separation of Concerns**: Bộ định tuyến (routers), bộ điều khiển (controllers), tầng dịch vụ SePay (sepay-service) và tầng dữ liệu (models) được phân tách rõ ràng theo kiến trúc chuẩn của dự án.
- [x] **Security & Zero Trust**: Endpoint Webhook được bảo vệ bằng API Key; các API thông tin thanh toán công khai chỉ trả về thông tin cần thiết, ẩn toàn bộ `rawResult` và thông tin quản trị nhạy cảm.
- [x] **Standalone Compatibility**: Tương thích hoàn toàn với MongoDB standalone, không bắt buộc cấu hình Replica Set đa node.

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/sepay-transfer-payment/
├── spec.md                          # Tài liệu đặc tả yêu cầu nghiệp vụ
├── plan.md                          # Bản kế hoạch triển khai kiến trúc (tập tin này)
├── research.md                      # Nghiên cứu giải pháp kỹ thuật & quyết định thiết kế
├── data-model.md                    # Mô hình thực thể, ERD, Schema & Máy trạng thái
├── quickstart.md                    # Hướng dẫn thiết lập ngrok và các kịch bản kiểm thử
├── contracts/
│   └── sepay-payment-api.yaml       # Hợp đồng chuẩn OpenAPI 3.0 cho các endpoint
└── checklists/
    └── requirements.md              # Bảng kiểm tra chất lượng yêu cầu (16/16 Đạt)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── common/
│   │   ├── sepay-service.js         # Dịch vụ sinh VietQR, định dạng nội dung memo và regex parser
│   │   └── middlewares/
│   │       └── sepay-auth.js        # Middleware xác thực API Key của SePay Webhook
│   ├── config/
│   │   └── env.js                   # Bổ sung các biến SEPAY_API_KEY, SEPAY_BANK_CODE,...
│   ├── controllers/
│   │   └── payment.controller.js    # Xử lý Webhook, kiểm tra trạng thái, gia hạn QR, chuyển sang COD
│   ├── models/
│   │   ├── order.model.js           # Bổ sung paidAmount, needsReview, paymentExpiredAt
│   │   ├── payment.model.js         # Kiểm tra Unique Index transactionRef, quan hệ với Order
│   │   └── setting.model.js         # Cấu hình tài khoản ngân hàng nhận tiền
│   ├── routers/
│   │   ├── payment.router.js        # Khởi tạo router thanh toán và webhook
│   │   └── app.js                   # Đăng ký /api/v1/payments vào Express App
│   └── validators/
│       └── payment.validator.js     # Schema kiểm tra dữ liệu đầu vào với Zod
└── tests/
    └── sepay-payment.test.js        # Kiểm thử tích hợp Webhook, Idempotency, Partial Payment

frontend/
├── features/
│   └── checkout/
│       ├── components/
│       │   ├── payment-method-card.tsx      # Thêm tùy chọn "Chuyển khoản VietQR qua SePay"
│       │   ├── vietqr-payment-modal.tsx     # Giao diện modal/màn hình hiển thị mã VietQR động
│       │   └── payment-result-view.tsx      # Hỗ trợ hiển thị kết quả cho phương thức SePay
│       ├── hooks/
│       │   ├── use-checkout.ts              # Hỗ trợ lựa chọn phương thức thanh toán 'sepay'
│       │   └── use-sepay-payment.ts         # Hook quản lý đồng hồ đếm ngược, polling 3s và nút kiểm tra
│       └── types.ts                         # Cập nhật PaymentMethodType: "vnpay" | "cod" | "sepay"
└── services/
    └── payment-api.ts                       # Các hàm gọi API thanh toán phía client
```

---

## Phase Breakdown & Execution Roadmap

### Giai đoạn 1: Backend Foundation & Cấu hình Cổng thanh toán
1. **Cấu hình & Biến môi trường**:
   - Thêm `SEPAY_API_KEY`, `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_HOLDER` vào `backend/src/config/env.js`.
2. **Nâng cấp Schema & Models**:
   - Mở rộng `Order` schema: `paidAmount` (mặc định 0), `needsReview` (mặc định false), `paymentExpiredAt`.
   - Cập nhật `Setting` schema để lưu cấu hình ngân hàng thụ hưởng.
3. **Phát triển Tầng dịch vụ `sepay-service.js`**:
   - Hàm sinh URL VietQR động (`generateVietQrUrl`).
   - Hàm trích xuất mã đơn hàng từ nội dung chuyển khoản (`extractOrderCodeFromMemo`).
   - Hàm kiểm tra tính hợp lệ của số tiền và đối soát.

### Giai đoạn 2: Webhook Endpoint & Bộ điều khiển Thanh toán
1. **Middleware xác thực `sepay-auth.js`**:
   - Kiểm tra `Authorization: Apikey ...` khớp với `SEPAY_API_KEY`.
2. **Bộ điều khiển `payment.controller.js`**:
   - `handleSepayWebhook`: Tiếp nhận webhook, kiểm tra idempotency qua `transactionRef`, cập nhật `paidAmount`, đổi trạng thái đơn `paymentStatus = "paid"` khi đủ tiền, gắn cờ `needsReview` khi có ngoại lệ.
   - `getPaymentInfo`: Trả về thông tin mã QR động, số tiền còn thiếu, thời gian hết hạn cho đơn hàng.
   - `getPaymentStatus`: Endpoint phản hồi nhanh phục vụ Polling 3s.
   - `renewPaymentSession`: Gia hạn phiên QR thêm 15 phút.
   - `convertToCod`: Chuyển đổi phương thức đơn sang COD khi mã QR hết hạn.
3. **Đăng ký Router**:
   - Gắn `payment.router.js` vào `backend/src/app.js` tại `/api/v1/payments`.

### Giai đoạn 3: Frontend Storefront - Giao diện Thanh toán VietQR
1. **Tùy chọn thanh toán tại Checkout**:
   - Bổ sung tùy chọn `sepay` vào `PaymentMethodCard` với logo ngân hàng và mô tả quét VietQR.
2. **Màn hình hiển thị VietQR & Đồng hồ đếm ngược**:
   - Component hiển thị ảnh VietQR động sắc nét, số tiền, thông tin tài khoản và nút sao chép nhanh.
   - Hiển thị đồng hồ đếm ngược 15:00 và trạng thái "Đang chờ thanh toán...".
3. **Hook đồng bộ thời gian thực `use-sepay-payment.ts`**:
   - Quản lý vòng lặp Polling mỗi 3 giây gọi API `getPaymentStatus`.
   - Nút "Tôi đã chuyển tiền / Kiểm tra trạng thái" gọi kiểm tra tức thì.
   - Tự động chuyển màn hình thành công khi `paymentStatus === "paid"`.
4. **Xử lý chuyển thiếu tiền & Hết hạn**:
   - Hiển thị số tiền còn thiếu và mã QR bù tiền khi thanh toán thiếu.
   - Hiển thị 2 nút lựa chọn: "Tạo lại mã thanh toán" hoặc "Chuyển sang COD" khi đồng hồ về 0.

### Giai đoạn 4: Quản lý Đơn hàng (Staff/Admin Workspace) & Kiểm thử
1. **Kiểm soát nghiệp vụ Staff Order**:
   - Ngăn chặn nút Confirm Order nếu đơn hàng chuyển khoản chưa có `paymentStatus === "paid"` (BR-18).
   - Hiển thị cờ `needs_review` trên danh sách và chi tiết đơn hàng nếu có chênh lệch tiền.
2. **Kiểm thử tích hợp (Integration Tests)**:
   - Viết bộ test Vitest cho webhook: kiểm tra luồng thanh toán đủ tiền, thiếu tiền, lặp lại webhook (idempotency), và sai API Key.
   - Kiểm thử thực tế với ngrok tunnel và SePay sandbox.

---

## Complexity Tracking

| Thành phần | Vì sao cần | Phương án đơn giản hơn bị từ chối vì |
| :--- | :--- | :--- |
| **Cơ chế Polling 3s + Nút kiểm tra** | Đảm bảo màn hình thanh toán tự chuyển trang ngay khi có tiền về | WebSocket/SSE phức tạp hơn về hạ tầng; Polling thuần túy không có nút bấm khiến người mua phải chờ thụ động. |
| **Cộng dồn nhiều giao dịch (`paidAmount`)** | Cho phép khách quét mã bù khi lỡ chuyển thiếu tiền | Bắt khách liên hệ tổng đài ngay lập tức làm giảm tỷ lệ thanh toán thành công và gây quá tải hỗ trợ. |
| **Cờ `needs_review` trên Order** | Giúp nhân viên nhận biết đơn hàng cần hoàn tiền thừa hoặc xác nhận COD | Ghi âm thầm vào log khiến nhân viên kế toán dễ bỏ sót giao dịch của khách. |

