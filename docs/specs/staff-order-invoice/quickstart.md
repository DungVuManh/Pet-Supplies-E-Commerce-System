# Quickstart & Validation Guide: Staff Xuất Hóa Đơn Đơn Hàng

**Feature**: `staff-order-invoice` | **Spec**: [spec.md](./spec.md) | **Contract**: [staff-order-invoice-api.yaml](./contracts/staff-order-invoice-api.yaml)

Tài liệu này mô tả các bước chuẩn bị, lệnh chạy kiểm thử tự động và kịch bản kiểm chứng End-to-End cho tính năng xuất hóa đơn đơn hàng của nhân viên (Staff).

---

## 1. Điều kiện tiên quyết (Prerequisites)

1. Đã cài đặt dependencies ở cả `backend/` và `frontend/` (Node.js 24+, npm 11+).
2. Đã khởi tạo dữ liệu mẫu hoặc có sẵn ít nhất:
   - Một tài khoản vai trò `staff`, một tài khoản `customer` và một tài khoản `admin`.
   - Các đơn hàng mẫu ở các trạng thái: `pending`, `confirmed` / `completed` (online + offline tại quầy) và `cancelled`.
3. Cấu hình môi trường `backend/.env` và `frontend/.env.local` hợp lệ.

Chạy ứng dụng ở chế độ phát triển từ thư mục gốc:
```powershell
npm run dev
```

---

## 2. Kiểm thử tự động (Automated Verification)

### A. Kiểm thử Backend (Vitest + Supertest)
Kiểm tra quyền truy cập (`401` / `403`), hợp lệ trạng thái (`409 INVOICE_NOT_ELIGIBLE`), snapshot số liệu, fallback cửa hàng, và ma trận phân quyền `PERMISSIONS`:
```powershell
npm.cmd --prefix backend test tests/staff-order-invoice.test.js tests/admin-permissions.test.js tests/staff-orders.test.js
```

### B. Kiểm thử Frontend & Build (Node Test, ESLint, Next.js Build)
```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

---

## 3. Kịch bản kiểm chứng End-to-End (E2E Scenarios)

### Kịch bản 1: Phân quyền truy cập (FR-002, SC-003)
1. Ở trạng thái chưa đăng nhập, truy cập trực tiếp `http://localhost:3000/staff/orders/<id>/invoice` → tự động điều hướng về `/login`.
2. Đăng nhập bằng tài khoản `customer` hoặc `admin`, truy cập lại URL trên hoặc gọi trực tiếp endpoint theo [contract](./contracts/staff-order-invoice-api.yaml) → giao diện chuyển hướng `/forbidden` và API trả về `403 FORBIDDEN`.

### Kịch bản 2: Chặn đơn chưa đủ điều kiện trạng thái (FR-003, FR-004, SC-003)
1. Đăng nhập tài khoản `staff`, mở trang chi tiết một đơn hàng đang `pending` (Chờ xử lý) hoặc `cancelled` (Đã hủy) tại `/staff/orders/<id>`.
2. **Kỳ vọng**: Nút **"Xuất hóa đơn"** ở trạng thái bị khóa/vô hiệu hóa kèm ghi chú *"Chỉ hỗ trợ xuất hóa đơn cho đơn hàng từ trạng thái Đã xác nhận trở lên."*
3. Truy cập trực tiếp `/staff/orders/<id>/invoice` → hiển thị màn hình thông báo từ chối rõ ràng và nút quay lại chi tiết đơn; API `GET /invoice` trả về HTTP `409` với `error.code = "INVOICE_NOT_ELIGIBLE"`.

### Kịch bản 3: Xuất hóa đơn cho đơn hợp lệ & Kiểm tra snapshot tài chính (US1, US2, SC-001)
1. Mở một đơn hàng đã xác nhận hoặc đơn bán tại quầy (`completed`) có mã giảm giá (`promotionCode`) và nhiều sản phẩm.
2. Từ chi tiết đơn `/staff/orders/<id>` hoặc danh sách đơn `/staff/orders`, nhấn **"Xuất hóa đơn"** → chuyển sang `/staff/orders/<id>/invoice`.
3. **Kỳ vọng trên bản xem trước A4/A5**:
   - Phần đầu hiển thị thông tin cửa hàng từ cài đặt chung (tên cửa hàng hoặc mặc định `"Petjoy"` nếu để trống; không hiện dòng liên hệ trống).
   - Hiển thị đúng `orderCode`, ngày giờ tạo theo `GMT+7`, kênh bán, tên khách hàng, SĐT, email (nếu có) và địa chỉ giao hàng (hoặc `"Nhận tại cửa hàng · Không giao hàng"` với đơn tại quầy).
   - Bảng sản phẩm khớp chính xác đơn giá lúc đặt, số lượng, thành tiền từng dòng, Tạm tính, Giảm giá, Phí giao hàng, Tổng tiền, Đã thanh toán và Còn phải thu; không hiển thị trường MST/VAT công ty (FR-012).

### Kịch bản 4: In / Lưu PDF & Ghi nhận Audit Log (FR-010, FR-011, FR-013, SC-004)
1. Tại trang `/staff/orders/<id>/invoice`, nhấn nút **"In hóa đơn / Lưu PDF"**.
2. **Kỳ vọng**:
   - Hệ thống gửi `POST /api/v1/staff/orders/<id>/invoice/exports` với CSRF hợp lệ và lưu 1 bản ghi vào `auditLogs` (`action: "order.invoice.export"`, xem được trong nhật ký quản trị) mà không đổi trạng thái hay tồn kho đơn hàng.
   - Hộp thoại in/lưu PDF của trình duyệt mở ra: bản xem trước in khổ A4/A5 **không chứa** thanh sidebar, topbar của `StaffShell` hay nút bấm điều khiển.
   - Kiểm tra với đơn nhiều dòng sản phẩm/tên dài: tên xuống dòng gọn gàng, bảng không tràn lề ngang, không cắt đôi dòng sản phẩm khi sang trang.

