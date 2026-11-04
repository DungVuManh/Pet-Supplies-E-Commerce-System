# Quickstart & Verification Guide: Thanh Toán Chuyển Khoản SePay (VietQR qua Ngrok)

**Feature**: `sepay-transfer-payment` | **Spec**: [spec.md](./spec.md) | **API Contract**: [sepay-payment-api.yaml](./contracts/sepay-payment-api.yaml)

Tài liệu này hướng dẫn chi tiết các bước thiết lập môi trường phát triển, khởi chạy ngrok tunnel và các kịch bản kiểm thử (test scenarios) từ đầu đến cuối cho tính năng thanh toán chuyển khoản qua SePay.

---

## 1. Yêu cầu tiên quyết (Prerequisites)

- **Node.js**: Phiên bản 24.x
- **MongoDB**: Máy chủ MongoDB cục bộ hoặc MongoDB Atlas
- **ngrok**: Đã cài đặt ngrok CLI trên máy (`winget install ngrok` hoặc `npm install -g ngrok`) và đã xác thực authtoken (`ngrok config add-authtoken <TOKEN>`).
- **Tài khoản SePay**: Tài khoản tại [sepay.vn](https://my.sepay.vn) (hoặc sử dụng curl mô phỏng webhook).

---

## 2. Thiết lập cấu hình môi trường

Thêm các biến môi trường cấu hình SePay vào tập tin `backend/.env`:

```env
# =============================================================
# CẤU HÌNH CỔNG THANH TOÁN SEPAY (VIETQR)
# =============================================================
SEPAY_API_KEY=sepay_dev_secret_key_9999
SEPAY_BANK_CODE=MB
SEPAY_ACCOUNT_NUMBER=0377041280
SEPAY_ACCOUNT_HOLDER=CONG TY TNHH PETJOY VIET NAM
```

---

## 3. Khởi chạy hệ thống và thiết lập Ngrok Tunnel

### Bước 1: Khởi động Backend và Frontend
Mở Terminal 1 và Terminal 2:
```powershell
# Terminal 1: Khởi động Backend (cổng 3001)
npm run dev:backend

# Terminal 2: Khởi động Frontend (cổng 3000)
npm run dev:frontend
```

### Bước 2: Mở đường hầm Ngrok tới Backend
Mở Terminal 3:
```powershell
ngrok http 3001
```

Giao diện ngrok sẽ hiển thị URL công khai (Forwarding URL):
```text
Forwarding   https://abc1-234-56-78.ngrok-free.app -> http://localhost:3001
```

### Bước 3: Cấu hình Webhook trên SePay Dashboard
1. Đăng nhập [my.sepay.vn](https://my.sepay.vn).
2. Vào mục **Cấu hình Webhook** (Tích hợp Webhook).
3. Nhập URL: `https://abc1-234-56-78.ngrok-free.app/api/v1/payments/sepay/webhook`
4. Cấu hình Kiểu xác thực: **API Key** (Nhập giá trị: `sepay_dev_secret_key_9999`).
5. Lưu cấu hình.

---

## 4. Các kịch bản kiểm thử mẫu (Runnable Scenarios)

### Kịch bản 1: Tạo đơn hàng và kiểm tra thông tin VietQR
1. Truy cập giao diện khách hàng tại `http://localhost:3000`.
2. Thêm một sản phẩm vào giỏ hàng và tiến hành vào trang **Thanh toán**.
3. Chọn phương thức thanh toán: **"Chuyển khoản ngân hàng (VietQR qua SePay)"**.
4. Nhấn **"Đặt hàng"**.
5. Giao diện chuyển sang màn hình hiển thị mã VietQR.
6. Xác minh:
   - Mã đơn hàng hiển thị (VD: `ORD173000123`).
   - Nội dung chuyển khoản hiển thị đúng chuẩn: `PETJOY ORD173000123`.
   - Ảnh mã QR hiển thị rõ nét, quét thử bằng điện thoại để kiểm tra số tiền và nội dung đã tự điền chính xác.
   - Đồng hồ đếm ngược 15:00 bắt đầu chạy lùi.

---

### Kịch bản 2: Giả lập SePay gửi Webhook thanh toán thành công (Happy Path)
Sử dụng cURL hoặc Postman để giả lập SePay gửi tín hiệu tiền đã vào tài khoản (gửi qua ngrok hoặc localhost):

```powershell
curl -X POST "http://localhost:3001/api/v1/payments/sepay/webhook" `
  -H "Content-Type: application/json" `
  -H "Authorization: Apikey sepay_dev_secret_key_9999" `
  -d '{
    "id": 998811,
    "gateway": "MBBank",
    "transactionDate": "2026-11-04 11:50:00",
    "accountNumber": "0377041280",
    "content": "PETJOY ORD173000123 chuyen tien",
    "transferType": "in",
    "transferAmount": 350000,
    "accumulated": 10500000,
    "referenceCode": "MB.TEST.001"
  }'
```

**Kết quả mong đợi:**
- Backend phản hồi HTTP 200 `{ "success": true, "message": "Payment verified and order updated" }`.
- Màn hình khách hàng đang mở sẽ tự động chuyển sang thông báo **"Đặt hàng và Thanh toán thành công"** trong vòng dưới 3 giây mà không cần bấm F5.
- Trong cơ sở dữ liệu: `Order.paymentStatus` đổi thành `"paid"`, `Payment` document mới được tạo.

---

### Kịch bản 3: Giả lập gửi lặp lại Webhook (Kiểm tra tính bất biến - Idempotency BR-16)
Thực hiện lại chính xác lệnh cURL ở Kịch bản 2 với cùng `id: 998811`.

**Kết quả mong đợi:**
- Backend lập tức trả về HTTP 200 `{ "success": true, "message": "Transaction already processed" }`.
- Không tạo thêm bản ghi `Payment` mới, không làm sai lệch doanh thu hay trạng thái đơn hàng.

---

### Kịch bản 4: Giả lập chuyển thiếu tiền (Partial Payment)
Khách hàng mua đơn 350.000 đ nhưng chỉ chuyển 200.000 đ:

```powershell
curl -X POST "http://localhost:3001/api/v1/payments/sepay/webhook" `
  -H "Content-Type: application/json" `
  -H "Authorization: Apikey sepay_dev_secret_key_9999" `
  -d '{
    "id": 998812,
    "gateway": "MBBank",
    "transactionDate": "2026-11-04 11:52:00",
    "accountNumber": "0377041280",
    "content": "PETJOY ORD173000123 chuyen lan 1",
    "transferType": "in",
    "transferAmount": 200000,
    "accumulated": 10700000,
    "referenceCode": "MB.TEST.002"
  }'
```

**Kết quả mong đợi:**
- `Order.paidAmount` cập nhật thành 200.000 đ, `Order.paymentStatus` vẫn là `"unpaid"`.
- Giao diện màn hình thanh toán của khách hàng cập nhật:
  - "Đã nhận: 200.000 đ - Còn thiếu: 150.000 đ".
  - Mã VietQR được sinh lại với số tiền đúng 150.000 đ để khách quét tiếp lần 2.

---

### Kịch bản 5: Kiểm tra xác thực Webhook (Bảo mật CR-08)
Gửi Webhook với API Key sai:

```powershell
curl -X POST "http://localhost:3001/api/v1/payments/sepay/webhook" `
  -H "Content-Type: application/json" `
  -H "Authorization: Apikey SAI_KEY" `
  -d '{"id": 12345}'
```

**Kết quả mong đợi:**
- Backend phản hồi HTTP 401 với mã lỗi `"UNAUTHORIZED"`. Không tiết lộ chi tiết lỗi hệ thống hay stack trace.

---

### Kịch bản 6: Kiểm tra hết hạn phiên 15 phút và chuyển đổi sang COD
1. Chờ đồng hồ đếm ngược 15 phút về 0 (hoặc test với thời gian giả lập).
2. Màn hình hiển thị "Mã thanh toán đã hết hạn".
3. Nhấn nút **"Chuyển sang thanh toán khi nhận hàng (COD)"**.
4. Màn hình cập nhật phương thức sang COD, giữ nguyên các voucher và giỏ hàng, chuyển hướng thành công.

