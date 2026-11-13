# Research: Quy Trình Hoàn Trả Đơn Hàng Nhiều Bước & UI Timeline (Order Returns Workflow)

**Feature Directory**: `docs/specs/order-returns` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

---

## 1. Khảo sát hiện trạng mã nguồn & Nhu cầu nâng cấp

### 1.1. Luồng hoàn trả cũ và vấn đề tồn tại
- Trước đây, khi Staff bấm "Chấp nhận hoàn trả", hệ thống lập tức chuyển đơn sang `returned`, hoàn kho và đánh dấu hoàn tiền.
- **Hạn chế thực tế**:
  1. Hàng chưa về đến shop mà kho đã được cộng lại, tiềm ẩn nguy cơ sai lệch tồn kho nếu khách đổi ý không gửi hàng.
  2. Khách hàng không có mốc tương tác để thông báo rằng mình đã đóng gói gửi bưu kiện đi.
  3. Nhân viên tại shop không có bước xác nhận "Đã nhận được hàng" khi kiện hàng chuyển phát tới cửa hàng.
  4. Thanh tiến trình đơn hàng (Timeline) trên UI chỉ hiển thị sơ sài 2 mốc (`Đã đặt hàng` -> `Đã hoàn trả`), không phản ánh quá trình xử lý hoàn đơn.

### 1.2. Giải pháp chuẩn hóa
- Tách chu trình hoàn đơn thành 4 giai đoạn tuần tự:
  1. `requested` / `pending`: Khách gửi yêu cầu kèm STK ngân hàng và ảnh minh chứng.
  2. `approved`: Staff chấp nhận cho phép gửi hàng -> Khách gửi hàng và bấm **"Xác nhận đã gửi trả hàng"** (`customer_shipped`).
  3. `received`: Hàng về tới nơi, Staff bấm **"Đã nhận được hàng"** và tiến hành mở gói kiểm tra thực tế.
  4. `completed`: Kiểm tra đạt chuẩn, Staff bấm **"Xác nhận hoàn tiền & Hoàn tất"** -> hoàn kho, hoàn tất chu trình.

---

## 2. Các quyết định kỹ thuật mới (Phase 0 Decisions)

### Decision 5: Quy trình hoàn tiền và hoàn kho chỉ thực thi tại bước kiểm tra hàng cuối cùng
- **Decision**: Tồn kho sản phẩm `Product.variants.$.stock` chỉ được hoàn lại khi Staff bấm "Xác nhận hoàn tiền & Hoàn tất" sau khi đã kiểm tra kiện hàng nhận về.
- **Rationale**: Ngăn ngừa trường hợp khách gửi hàng sai, hàng bị tráo đổi, hoặc khách không bao giờ gửi hàng nhưng kho đã tự động cộng số lượng.

### Decision 6: Order Timeline 4 mốc chuyên biệt cho luồng hoàn trả
- **Decision**: Khi đơn hàng bước vào luồng hoàn trả, `getOrderDetail` và `lookupOrder` tự động sinh 4 bước timeline:
  1. **Yêu cầu hoàn đơn**: Hoàn thành khi khách gửi form.
  2. **Chờ xác nhận**: Đang diễn ra khi Staff duyệt và khách gửi hàng; hoàn thành khi khách bấm xác nhận đã gửi.
  3. **Nhân viên kiểm tra**: Đang diễn ra khi Staff bấm "Đã nhận được hàng"; hoàn thành khi kiểm tra xong.
  4. **Hoàn thành công**: Hoàn thành khi Staff duyệt hoàn tiền và hoàn tất đơn.
- **Rationale**: Khách hàng và nhân viên đều theo dõi được tiến độ chính xác theo đúng yêu cầu UI trực quan.
