# Quickstart & Validation Guide: Quy Trình Hoàn Trả Đơn Hàng Nhiều Bước & UI Timeline

## Chuyển dữ liệu trước khi bật luồng hủy

Luồng hoàn trả dùng transaction trên Atlas hoặc MongoDB replica set. Sao lưu dữ liệu và dừng backend cũ để tránh ghi đồng thời trong lúc chuyển dữ liệu. Trỏ `MONGODB_URI` vào đúng môi trường và chạy từ thư mục gốc:

```powershell
npm --prefix backend run migrate:order-returns
```

Chạy lại để kiểm tra kết quả `0` bản ghi mới. Đối chiếu các yêu cầu đã chuyển trên Staff và kiểm tra số bản ghi `orders` có `returnRequest.status` nhưng thiếu `latestReturn.requestId` bằng `0`. Mã đơn được dùng làm mã yêu cầu cho dữ liệu đã chuyển, nên đường dẫn Staff cũ vẫn hợp lệ. Sau khi kiểm tra, khởi động backend mới. Việc xóa trường nhúng cũ cần thực hiện ở đợt riêng sau khi xác nhận không cần quay về bản cũ. Sau khi backend mới nhận ghi, khôi phục bản cũ cần đối soát hoặc khôi phục dữ liệu từ bản sao lưu.

**Feature Directory**: `docs/specs/order-returns` | **Contract**: [order-returns-api.yaml](./contracts/order-returns-api.yaml) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Điều kiện tiên quyết

- Node.js 24.x, npm 11+, MongoDB đang chạy, cấu hình biến Cloudinary trong `backend/.env`.
- Khởi chạy cả Backend & Frontend:

```powershell
npm run dev
```

---

## 2. Bộ kiểm thử tự động

```powershell
# Backend tests
npm.cmd --prefix backend test tests/order-returns.test.js

# Frontend tests & Build
npm.cmd --prefix frontend test
cmd /c "npm --prefix frontend run build"
```

---

## 3. Kịch bản kiểm chứng End-to-End thủ công (4 Giai đoạn hoàn trả)

### Giai đoạn 1 — Khách hàng gửi yêu cầu hoàn đơn
1. Đăng nhập tài khoản **Customer**, mở chi tiết đơn hàng đang **Đang giao**.
2. Nhấn nút **"Hoàn trả hàng"**, chọn lý do, nhập thông tin ngân hàng nhận hoàn tiền, mô tả và tải ảnh minh chứng.
3. Bấm gửi yêu cầu.
4. **Kiểm tra UI**: Thanh Order Timeline chuyển sang chế độ hoàn trả 4 mốc:
   - `Yêu cầu hoàn đơn` (xanh - hoàn thành)
   - `Chờ xác nhận` (đang xử lý)
   - `Nhân viên kiểm tra` (chờ)
   - `Hoàn thành công` (chờ)

### Giai đoạn 2 — Staff duyệt yêu cầu & Khách xác nhận đã gửi trả hàng
1. Đăng nhập tài khoản **Staff**, mở `/staff/returns/<id>`.
2. Kiểm tra ảnh, lý do, STK ngân hàng của khách và bấm **"Chấp nhận yêu cầu hoàn trả"**.
3. Chuyển sang tài khoản **Customer**: Trang chi tiết đơn hàng hiển thị hướng dẫn gửi hàng và nút **"Xác nhận đã gửi trả hàng"**.
4. Khách hàng bấm **"Xác nhận đã gửi trả hàng"**. Giao diện cập nhật: "Đã gửi trả hàng - Chờ cửa hàng tiếp nhận".

### Giai đoạn 3 — Cửa hàng nhận hàng & Nhân viên kiểm tra
1. Khi bưu kiện gửi trả về đến shop, Staff mở `/staff/returns/<id>`.
2. Staff bấm nút **"Đã nhận được hàng"**.
3. **Kiểm tra UI**:
   - Trạng thái yêu cầu chuyển sang `received` (Đang kiểm tra hàng hoàn).
   - Thanh Timeline của khách hàng sáng mốc thứ 3: **"Nhân viên kiểm tra"**.

### Giai đoạn 4 — Quyết định hoàn tiền (Refund) & Hoàn thành công
1. Staff mở kiện hàng kiểm tra thực tế.
2. Nếu hàng hợp lệ: Staff bấm **"Xác nhận hoàn tiền & Hoàn tất"**:
   - Tồn kho sản phẩm được tự động cộng lại.
   - Ghi nhận trạng thái hoàn tiền `refunded`.
   - Đơn chuyển sang `returned`.
3. **Kiểm tra UI**:
   - Mốc thứ 4 trên Timeline: **"Hoàn thành công"** chuyển màu xanh hoàn tất.
   - Danh sách "Đơn hàng của tôi" hiển thị badge "Đã hoàn trả" màu tím chuẩn xác.
