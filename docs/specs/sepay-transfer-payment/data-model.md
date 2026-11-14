# Data Model: Tích Hợp Thanh Toán Chuyển Khoản Qua SePay (VietQR)

**Feature**: `sepay-transfer-payment` | **Spec**: [spec.md](./spec.md)

Tài liệu này định nghĩa chi tiết mô hình dữ liệu, các thuộc tính, mối quan hệ thực thể, ràng buộc xác thực và máy trạng thái (State Machine) phục vụ tính năng thanh toán chuyển khoản qua SePay.

---

## 1. Sơ đồ thực thể và mối quan hệ (ERD)

```mermaid
erDiagram
    ORDER ||--o{ PAYMENT : "has one or more"
    ORDER ||--o| USER : "belongs to (optional for guest)"
    SETTING ||--|| ORDER : "provides default payment config"

    ORDER {
        ObjectId _id PK
        string orderCode UK "Duy nhất, định dạng ORD..."
        ObjectId customerId FK "Tham chiếu User (nullable khi là khách)"
        object guestInfo "Thông tin khách vãng lai"
        array items "Danh sách sản phẩm snapshot"
        object shippingAddress "Địa chỉ giao hàng snapshot"
        number subtotal "Tổng tiền hàng"
        number discount "Số tiền giảm giá voucher"
        number shippingFee "Phí vận chuyển"
        number total "Tổng tiền đơn hàng"
        number paidAmount "Số tiền đã thanh toán tích lũy (mới)"
        boolean needsReview "Cờ cảnh báo giao dịch ngoại lệ (mới)"
        date paymentExpiredAt "Thời điểm hết hạn phiên QR (mới)"
        string paymentMethod "COD | ONLINE | CASH"
        string paymentStatus "unpaid | pending | paid | failed"
        string orderStatus "pending | confirmed | processing | shipping | completed | cancelled"
        string channel "online | offline"
        array statusHistory "Lịch sử chuyển dịch trạng thái"
        date createdAt
        date updatedAt
    }

    PAYMENT {
        ObjectId _id PK
        ObjectId orderId FK "Tham chiếu Order"
        string method "ONLINE"
        number amount "Số tiền thực chuyển trong giao dịch"
        string status "unpaid | pending | paid | failed"
        string transactionRef UK "Mã giao dịch duy nhất từ SePay/Ngân hàng"
        string qrPayload "Dữ liệu payload chuỗi VietQR"
        object rawResult "Dữ liệu JSON gốc webhook từ SePay (select: false)"
        date createdAt
        date updatedAt
    }

    SETTING {
        string _id PK "'global'"
        boolean bankTransfer "Bật/tắt thanh toán chuyển khoản"
        string bankCode "Mã ngân hàng nhận (VD: MB, VCB, ICB)"
        string accountNumber "Số tài khoản ngân hàng thụ hưởng"
        string accountHolder "Tên chủ tài khoản ngân hàng"
        date updatedAt
    }
```

---

## 2. Chi tiết các trường dữ liệu và ràng buộc

### 2.1. Cập nhật Model `Order` (`backend/src/models/order.model.js`)

| Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Ràng buộc |
| :--- | :--- | :---: | :---: | :--- |
| `paidAmount` | `Number` | Có | `0` | Số tiền thực tế khách hàng đã chuyển khoản thành công tích lũy. Ràng buộc: Số nguyên không âm (`nonNegativeInteger`). |
| `needsReview` | `Boolean` | Có | `false` | Cờ cảnh báo đơn hàng phát sinh giao dịch ngoại lệ (chuyển thừa tiền, hoặc chuyển khoản sau khi đã đổi phương thức sang COD) cần nhân viên liên hệ đối soát/hoàn tiền. |
| `paymentExpiredAt` | `Date` | Không | `now + 15m` | Thời điểm hết hạn phiên thanh toán VietQR hiện tại (được cập nhật mới khi gia hạn). |

### 2.2. Model `Payment` (`backend/src/models/payment.model.js`)

| Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Ràng buộc |
| :--- | :--- | :---: | :---: | :--- |
| `orderId` | `ObjectId` | Có | - | Tham chiếu `Order._id`. Index hỗ trợ truy vấn `{ orderId: 1, createdAt: -1 }`. |
| `method` | `String` | Có | - | Giá trị: `"ONLINE"`. |
| `amount` | `Number` | Có | - | Số tiền nhận được trong lần chuyển khoản này. Ràng buộc: Số nguyên dương an toàn (`nonNegativeInteger`). |
| `status` | `String` | Có | `"paid"` | Trạng thái của lần giao dịch: `"paid"` khi webhook hợp lệ được ghi nhận. |
| `transactionRef` | `String` | Có | - | Mã định danh duy nhất của giao dịch do SePay gửi về (`id` hoặc `referenceCode`). Index duy nhất: `unique: true, partialFilterExpression: { transactionRef: { $type: "string" } }`. Đảm bảo tính bất biến (Idempotency). |
| `qrPayload` | `String` | Không | - | Chuỗi văn bản VietQR được tạo ra cho phiên thanh toán. |
| `rawResult` | `Mixed` | Không | - | Toàn bộ payload JSON của Webhook gửi từ SePay. Cấu hình `select: false` để bảo mật và không lộ ra API công khai (tuân thủ CR-08). |

### 2.3. Cập nhật Model `Setting` (`backend/src/models/setting.model.js`)

| Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `bankTransfer` | `Boolean` | Có | `true` | Bật hoặc tắt phương thức thanh toán chuyển khoản trên hệ thống. |
| `bankCode` | `String` | Không | `"MB"` | Mã ngân hàng nhận tiền theo chuẩn VietQR (VD: `MB`, `VCB`, `TCB`, `ICB`). |
| `accountNumber` | `String` | Không | `""` | Số tài khoản ngân hàng nhận tiền. |
| `accountHolder` | `String` | Không | `""` | Tên chủ tài khoản thụ hưởng. |

---

## 3. Máy trạng thái thanh toán & Đơn hàng (State Machine Transitions)

### 3.1. Vòng đời Trạng thái Thanh toán (`Order.paymentStatus`)

```mermaid
stateDiagram-v2
    [*] --> unpaid: Tạo đơn hàng chọn Chuyển khoản (SePay)
    
    unpaid --> unpaid: Nhận chuyển thiếu tiền (paidAmount < total)\nSinh mã VietQR mới cho số tiền còn thiếu
    
    unpaid --> paid: Nhận đủ tiền (paidAmount >= total) qua Webhook
    
    paid --> paid: Nhận thêm tiền thừa (paidAmount > total)\nGắn cờ needsReview = true
    
    unpaid --> cancelled: Đơn hàng bị hủy thủ công hoặc hủy bởi khách
    
    paid --> refunded: Hoàn tiền (xử lý đối soát thủ công ngoài hệ thống)
```

### 3.2. Vòng đời Trạng thái Đơn hàng (`Order.orderStatus`) và Mối liên hệ với Thanh toán

| Trạng thái hiện tại | Sự kiện kích hoạt | Điều kiện kiểm tra | Trạng thái tiếp theo | Ghi chú nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `pending` (unpaid) | Hết hạn 15 phút | Chưa nhận được tiền | `pending` (unpaid) | Mã QR hết hạn; giao diện cho phép tạo mã mới hoặc chuyển sang COD. |
| `pending` (unpaid) | Khách bấm "Đổi sang COD" | Phiên QR hết hạn | `pending` (COD / unpaid) | Đổi `paymentMethod = "COD"`. Đơn giữ nguyên để chuẩn bị giao hàng. |
| `pending` (unpaid) | Webhook SePay nhận đủ tiền | `paidAmount >= total` | `pending` (paid) | Thanh toán hoàn tất, đơn hàng đủ điều kiện để nhân viên xác nhận (`BR-18`). |
| `pending` (paid) | Nhân viên bấm "Xác nhận đơn" | `paymentStatus === "paid"` và đủ tồn kho | `confirmed` (paid) | Tuân thủ nghiêm ngặt `BR-18`. Nếu chưa `paid` thì hành động bị từ chối với mã lỗi `PAYMENT_NOT_VERIFIED`. |
| `confirmed` (paid) | Xử lý kho và đóng gói | - | `processing` | Luồng xử lý đơn hàng tiêu chuẩn. |

