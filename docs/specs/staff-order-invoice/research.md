# Research & Architectural Decisions: Staff Xuất Hóa Đơn Đơn Hàng

**Feature**: `staff-order-invoice` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

Tài liệu này tổng hợp kết quả khảo sát mã nguồn hiện tại của dự án và các quyết định kỹ thuật trọng tâm cho tính năng **Staff Xuất Hóa Đơn Đơn Hàng**.

---

## 1. Khảo sát hiện trạng mã nguồn liên quan

- **Mô hình đơn hàng ([`backend/src/models/order.model.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/models/order.model.js))**:
  - Đã lưu trữ đầy đủ ảnh chụp tại thời điểm đặt hàng (`orderCode`, `channel`, `items[]` với `productId`, `variantSku`, `name`, `unitPrice`, `qty`, cùng `subtotal`, `discount`, `shippingFee`, `total`, `paidAmount`, `needsReview`, `promotionCode`, `paymentMethod`, `paymentStatus`, `orderStatus`, `shippingAddress`, `guestInfo`, `createdByStaffId`, `creationState`).
  - Không có collection `Invoice` riêng cần sinh thêm vì dữ liệu chứng từ bán lẻ nội bộ (A4/A5, không VAT doanh nghiệp) lấy toàn bộ từ bản ghi `Order` bất biến và cấu hình cửa hàng `Setting`.
- **Thông tin cửa hàng ([`backend/src/models/setting.model.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/models/setting.model.js))**:
  - Collection `settings` (`_id: "global"`) lưu `storeName`, `contactEmail`, `hotline`, `address`. Một số môi trường chưa cấu hình có thể trả về chuỗi rỗng, cần fallback an toàn.
- **Nhật ký kiểm toán ([`backend/src/models/audit-log.model.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/models/audit-log.model.js) & [`backend/src/common/audit.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/common/audit.js))**:
  - Hàm `recordAudit(request, { action, target, after, result, summary })` đã hỗ trợ ghi log không chặn luồng chính (secondary audit write), ẩn bí mật tự động qua `stripSecrets`, lưu theo `actorId`, `action`, `target: { collectionName, id }`, `at`.
- **Phân quyền Staff Workspace ([`backend/src/common/permissions.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/common/permissions.js) & [`backend/tests/admin-permissions.test.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/tests/admin-permissions.test.js))**:
  - Mọi route `/staff/*` trong `workspace.router.js` bắt buộc dùng `readCookies`, `requireAuth`, `requireRole("staff")` (và `protectMutation` cho route ghi), đồng thời **phải được khai báo khớp 1-1** trong `PERMISSIONS[].staffRoutes` để vượt qua bộ kiểm thử `admin-permissions.test.js`.
- **Khung giao diện Staff ([`frontend/features/staff/components/staff-shell.tsx`](file:///e:/Pet-Supplies-E-Commerce-System/frontend/features/staff/components/staff-shell.tsx))**:
  - Layout `/staff/*` bọc mọi trang con trong `StaffShell` (gồm thanh bên `<aside>` và thanh trên `<header>`). Hiện chưa có class `@media print` (`print:hidden`) trên `<aside>` và `<header>`.

---

## 2. Các quyết định kỹ thuật (Technical Decisions)

### Decision 1: Hình thức xuất & in hóa đơn khổ chuẩn A4/A5 (Print-ready Web Invoice + Save as PDF)

- **Decision**: Triển khai trang xem trước hóa đơn chuyên dụng tại `/staff/orders/[id]/invoice` tối ưu CSS `@media print` cho khổ A4/A5 (`@page` + `print:hidden` trên `StaffShell` và thanh công cụ), kết hợp nút **"In hóa đơn / Lưu PDF"** gọi `window.print()`.
- **Rationale**:
  1. Phản hồi tức thì (`< 2s`), không phụ thuộc thư viện sinh PDF phía server (`pdfkit`/`puppeteer`) vốn nặng nề, dễ lỗi font Unicode tiếng Việt có dấu hoặc tốn RAM trên server Node.js.
  2. Trình duyệt hiện đại (Chrome/Edge/Firefox) cho phép chọn trực tiếp **Lưu dưới dạng PDF (Save as PDF)** hoặc chọn **máy in vật lý** với khổ **A4 hoặc A5** trên cùng một bố cục vector sắc nét, chữ tiếng Việt chuẩn font `Inter`.
  3. Toàn bộ thành phần điều hướng quản trị (`<aside>`, `<header>`, nút bấm thao tác) được ẩn bằng Tailwind `print:hidden`, đảm bảo bản in/PDF tuyệt đối sạch sẽ (đạt SC-004).
- **Alternatives considered**:
  - *Sinh binary PDF bằng `pdfkit` ở backend*: Đòi hỏi đóng gói tệp font `.ttf` tiếng Việt (Roboto/Inter), khó bảo trì bố cục bảng dài nhiều dòng bằng HTML/CSS, tăng độ trễ tải. Không phù hợp với yêu cầu "xem trước theo mẫu A4/A5 tiêu chuẩn và In/Lưu PDF".
  - *Dùng `html2canvas` + `jspdf` ở client*: Biến chữ thành ảnh bitmap nên mờ khi zoom, kích thước file lớn, hay bị cắt đôi dòng chữ qua trang. HTML `@media print` vượt trội hơn hẳn về chất lượng vector và chia trang bảng (`break-inside-avoid`, `thead { display: table-header-group }`).

### Decision 2: Tách biệt API đọc dữ liệu hóa đơn (`GET`) và API ghi nhật ký xuất (`POST`)

- **Decision**:
  - `GET /api/v1/staff/orders/:id/invoice`: Đọc dữ liệu hóa đơn đã tổng hợp (Order snapshot + Store settings + Invoice eligibility + Staff name), không gây side-effect ghi DB. Dùng cho Server Component `/staff/orders/[id]/invoice` tải SSR.
  - `POST /api/v1/staff/orders/:id/invoice/exports`: Được bảo vệ bởi `protectMutation` (JSON + Origin + CSRF). Được gọi khi nhân viên chủ động nhấn **"In hóa đơn / Lưu PDF"** (hoặc kích hoạt sự kiện in), ghi 1 bản ghi `AuditLog` (`action: "order.invoice.export"`).
- **Rationale**:
  1. Tuân thủ chuẩn HTTP: `GET` là idempotent và thuần đọc (refresh trang không làm tăng giả số lần xuất trong nhật ký kiểm toán).
  2. Ghi nhận `AuditLog` qua `POST` sử dụng `recordAudit` sẵn có, không ảnh hưởng tới `Order` hay tồn kho, và nếu việc ghi log gặp sự cố tạm thời vẫn không chặn thao tác in khẩn cấp cho khách tại quầy.
- **Alternatives considered**:
  - *Ghi `AuditLog` ngay trong `GET /invoice`*: Mỗi lần nhân viên mở trang xem thử hoặc F5 đều tạo log xuất giả, đồng thời vi phạm tính an toàn của HTTP `GET`.

### Decision 3: Kiểm tra trạng thái hợp lệ tập trung tại Backend Helper

- **Decision**: Tạo helper thuần `backend/src/common/order-invoice.js` định nghĩa tập trạng thái hợp lệ `INVOICE_ELIGIBLE_STATUSES = ["confirmed", "processing", "shipping", "completed"]`. Cả Backend (`GET /invoice`, `POST /invoice/exports`) và Frontend (hiển thị nút / chặn ở UI) đều dùng chung quy tắc này.
- **Rationale**:
  1. Đơn `pending` (chưa xác nhận) và `cancelled` (đã hủy), cũng như đơn `creationState === "pending"` (đang ghi dở tại quầy) bị chặn nhất quán tại tầng server (`409 INVOICE_NOT_ELIGIBLE` hoặc `404 ORDER_NOT_FOUND`), ngay cả khi nhân viên nhập URL trực tiếp.
  2. Đơn tạo tại quầy (`channel: "offline"`) mặc định có `orderStatus: "completed"`, nên hợp lệ xuất hóa đơn ngay lập tức sau khi tạo đơn xong.

### Decision 4: Cách hiển thị dữ liệu tài chính & trường hợp thiếu thông tin cài đặt

- **Decision**:
  - Lấy thông tin cửa hàng từ `Setting.findOne({ _id: "global" }).lean()`; nếu `storeName` rỗng, fallback về `"Petjoy"`. Các trường `address`, `hotline`, `contactEmail` nếu rỗng sẽ trả về `""` để UI ẩn dòng tương ứng sạch sẽ.
  - Tính toán số tiền đã trả / còn phải thu từ `order.paidAmount` và `order.paymentStatus`:
    - Nếu `order.paymentStatus === "paid"`, số tiền đã thanh toán tối thiểu bằng `Math.max(order.total, order.paidAmount || order.total)` và `remainingAmount = 0`.
    - Nếu chưa thanh toán đủ, `remainingAmount = Math.max(0, order.total - (order.paidAmount || 0))`.
    - Nếu `order.needsReview === true`, hiển thị ghi chú đối soát rõ ràng ở phần thanh toán (trên cả giao diện xem và bản in nếu số tiền thực nhận có chênh lệch, hoặc tách banner cảnh báo nội bộ `print:hidden` kết hợp dòng ghi chú trạng thái thanh toán trung thực trên hóa đơn).
- **Rationale**: Đảm bảo đúng 100% thực tế tài chính đã chốt trên đơn hàng (SC-001) và không bị lỗi hiển thị khi trường cài đặt cửa hàng hoặc email khách vãng lai chưa nhập.

