# Feature Specification: Quy Trình Hoàn Trả Đơn Hàng & Duyệt Hoàn Tiền Nhiều Bước (Order Returns Workflow)

**Feature Branch**: `feature/order-returns`

**Created**: 2026-11-12

**Last Updated**: 2026-11-13 (Cập nhật Luồng hoàn đơn nhiều bước & UI Timeline chi tiết)

**Status**: Ready

**Input**: User description: "luồn hoàn đơn hàng tôi muốn làm rõ lại như sau : khi khách hàng bấm hoàn đơn và gửi thông tin hoàn đơn thì sau đó staff sẽ check xem có chấp nhận hay không , tiếp theo customer sẽ đến giai đoạn gửi trả đơn hàng , sau khi gửi trả đơn hàng và bấm xác nhận đã gửi staff sẽ đợi và khi nhận được hàng thì cập nhật thành đã nhận được hàng (hệ thống của tôi lược bỏ phần ship) sau đó sẽ quyết định refund hay không . khi đơn hàng đang trong luồng hoàn đơn thì cập nhật ui kia gispu tôi luôn có các trạng thái yêu cầu hoàn đơn -> chờ xác nhận -> nhân viên kiểm trả -> hoàn thành công"

---

## Clarifications

### Session 2026-11-12
- Q: Nút "Hoàn trả hàng" hiển thị ở trạng thái đơn hàng nào và ảnh minh chứng có bắt buộc theo từng lý do không? → A: Chỉ hiển thị nút **"Hoàn trả hàng"** khi đơn đang ở trạng thái **"Đang giao"** (hoặc đã nhận hàng); **bắt buộc tối thiểu 1 ảnh** đối với lý do *"Hàng có vấn đề hoặc thiếu hàng"*, còn với *"Chưa nhận được hàng"* thì ảnh là **tùy chọn** (0–5 ảnh).
- Q: Khi Staff Chấp nhận hoàn trả, đơn hàng chính, tồn kho và hoàn tiền được xử lý thế nào? → A: Tách bạch rõ từng giai đoạn: Chấp nhận yêu cầu hoàn đơn -> Khách gửi trả -> Nhân viên nhận hàng -> Quyết định hoàn tiền (Refund) và cộng lại tồn kho.
- Q: Sau khi Staff từ chối hoàn trả, khách hàng có được gửi lại yêu cầu không? → A: Staff từ chối sẽ kết thúc luồng hoàn trả của đơn. Chi tiết đơn hiển thị lý do từ chối và cho phép xác nhận đã nhận hàng nếu đơn vẫn đang giao. Quyền gửi lại áp dụng khi khách tự hủy yêu cầu.

### Session 2026-11-13 (Cập nhật Chu trình Hoàn Đơn 4 Giai đoạn & Thanh Tiến Trình Timeline)
- Q: Luồng hoàn đơn cụ thể gồm các giai đoạn và hành động nào giữa Khách hàng (Customer) và Nhân viên (Staff)?
  → A: Chu trình diễn ra theo 4 giai đoạn chính (bỏ qua tích hợp đơn vị vận chuyển trung gian):
  1. **Giai đoạn 1: Khách hàng gửi Yêu cầu hoàn đơn**: Khách chọn lý do, nhập tài khoản ngân hàng nhận tiền hoàn, mô tả và ảnh minh chứng Cloudinary -> Bấm gửi.
  2. **Giai đoạn 2: Nhân viên xác nhận yêu cầu & Khách gửi trả hàng**:
     - Staff xem xét yêu cầu: Nếu từ chối kèm lý do -> dừng luồng hoàn.
     - Nếu chấp nhận: Yêu cầu chuyển sang trạng thái chờ khách gửi hàng. Khách hàng đóng gói gửi hàng về cửa hàng và bấm nút **"Xác nhận đã gửi trả hàng"** trên hệ thống.
  3. **Giai đoạn 3: Nhân viên nhận hàng & Kiểm tra thực tế**:
     - Khi kiện hàng về đến cửa hàng, Staff bấm **"Đã nhận được hàng hoàn"**.
     - Staff tiến hành kiểm tra tình trạng hàng hóa thực tế.
  4. **Giai đoạn 4: Quyết định Hoàn tiền & Hoàn tất (Hoàn thành công)**:
     - Staff xác nhận hoàn tiền (Refund): Hệ thống tự động cộng lại tồn kho, cập nhật trạng thái hoàn tiền, chuyển đơn sang mốc cuối cùng **"Hoàn thành công"** (Đã hoàn trả thành công).
- Q: Thanh tiến trình (Order Timeline) trên giao diện Chi tiết đơn hàng của khách hàng cập nhật như thế nào khi đơn bước vào luồng hoàn trả?
  → A: Thay vì chỉ hiển thị 2 bước rút gọn (`Đã đặt hàng` -> `Đã hoàn trả`), thanh tiến trình khi đơn hàng đang trong luồng hoàn trả sẽ chuyển đổi đồng bộ sang 4 mốc hiển thị trực quan:
  - **Mốc 1: Yêu cầu hoàn đơn** (Khách gửi form yêu cầu hoàn trả thành công).
  - **Mốc 2: Chờ xác nhận** (Staff chấp nhận yêu cầu và Khách xác nhận đã gửi trả hàng).
  - **Mốc 3: Nhân viên kiểm tra** (Staff xác nhận đã nhận được kiện hàng hoàn và đang kiểm tra chất lượng).
  - **Mốc 4: Hoàn thành công** (Quyết định hoàn tiền được duyệt, hoàn tất chu trình hoàn đơn).
- Q: Khi khách hàng bấm "Xác nhận đã gửi trả hàng", khách có cần nhập thêm mã vận đơn hoặc đơn vị vận chuyển không?
  → A: Chỉ cần xác nhận một chạm kèm popup xác nhận nhanh; không bắt buộc và không yêu cầu nhập mã vận đơn hay đơn vị vận chuyển để tối giản thao tác.
- Q: Khi nhân viên kiểm tra hàng đạt yêu cầu và duyệt hoàn tiền (Refund), số tiền hoàn trả cho khách được xác định và thực hiện như thế nào?
  → A: Nhân viên có thể điều chỉnh số tiền hoàn thực tế (mặc định bằng tổng số tiền khách đã thanh toán). Nhân viên tự thực hiện chuyển khoản thủ công bên ngoài qua ứng dụng ngân hàng tới số tài khoản của khách hàng, sau đó bấm xác nhận hoàn tất hoàn tiền trên hệ thống (do hệ thống không tích hợp cổng tự động chi tiền).
- Q: Sau khi nhân viên chấp nhận yêu cầu hoàn trả, khách hàng có thời hạn tối đa bao nhiêu ngày để gửi hàng và bấm "Xác nhận đã gửi trả hàng"?
  → A: Thời hạn tối đa 3 ngày (72 giờ); nếu quá 3 ngày kể từ khi Staff duyệt yêu cầu mà khách hàng chưa bấm xác nhận gửi hàng, yêu cầu hoàn trả sẽ tự động hết hạn/hủy để đảm bảo xử lý khiếu nại nhanh gọn.

---

## User Scenarios & Testing *(mandatory)*

### Khách hủy yêu cầu và xem lại lịch sử

- Chủ đơn trực tuyến được hủy yêu cầu đang chờ duyệt hoặc đã duyệt và chưa gửi hàng. Sau khi hủy, chi tiết đơn trở về tiến trình giao hàng. Khách có thể xác nhận nhận hàng nếu đơn vẫn đang giao.
- Khách có thể gửi yêu cầu mới sau khi tự hủy nếu đơn vẫn đang giao hoặc trong 7 ngày kể từ khi hoàn thành. Mỗi lần gửi có mã riêng và được xét duyệt riêng. Yêu cầu bị Staff từ chối vẫn kết thúc luồng.
- Khách mở từng lần gửi từ lịch sử trong Chi tiết đơn. Staff có bộ lọc **Khách đã hủy** và mở từng yêu cầu theo mã riêng. Chi tiết lưu lý do, mô tả, ảnh, thông tin nhận hoàn và các mốc xử lý. Yêu cầu đã hủy chỉ cho xem.

### User Story 1 - Khách hàng tạo yêu cầu hoàn đơn và theo dõi tiến trình 4 giai đoạn (Priority: P1)

Khi đơn hàng trực tuyến của khách hàng đang ở trạng thái **"Đang giao"** (hoặc đã nhận hàng), khách hàng có thể nhấn nút **"Hoàn trả hàng"** tại trang Chi tiết đơn hàng.

Sau khi nhập lý do, thông tin ngân hàng nhận hoàn tiền, mô tả chi tiết và đính kèm ảnh minh chứng, khách hàng bấm **"Gửi yêu cầu hoàn trả"**.
Ngay lập tức:
- Đơn hàng chuyển sang chế độ tiến trình hoàn đơn với thanh Timeline 4 mốc:
  - **Mốc 1 (Yêu cầu hoàn đơn)**: Trạng thái `completed` (Đã gửi lúc ...).
  - **Mốc 2 (Chờ xác nhận)**: Trạng thái `active` (Đang chờ nhân viên xét duyệt).
  - **Mốc 3 (Nhân viên kiểm tra)**: Trạng thái `pending`.
  - **Mốc 4 (Hoàn thành công)**: Trạng thái `pending`.
- Khi nhân viên chấp nhận yêu cầu, Mốc 2 hiển thị thông báo hướng dẫn gửi trả hàng kèm nút bấm **"Xác nhận đã gửi trả hàng"**.
- Khi khách hàng bấm **"Xác nhận đã gửi trả hàng"**, hệ thống ghi nhận khách đã gửi hàng và chờ cửa hàng nhận hàng.

**Why this priority**: Giúp khách hàng nắm bắt minh bạch tình trạng giải quyết khiếu nại theo từng bước, biết rõ khi nào cần gửi hàng và khi nào nhân viên đang kiểm tra.

**Independent Test**: Khách hàng tạo yêu cầu hoàn đơn, kiểm tra giao diện timeline cập nhật 4 mốc; sau khi staff duyệt, kiểm tra nút "Xác nhận đã gửi trả hàng" xuất hiện và bấm thành công.

**Acceptance Scenarios**:
1. **Given** đơn hàng đủ điều kiện hoàn trả, **When** khách hàng gửi yêu cầu thành công, **Then** thanh timeline trên trang chi tiết đơn chuyển sang 4 bước hoàn đơn: `Yêu cầu hoàn đơn` (xanh), `Chờ xác nhận` (đang xử lý), `Nhân viên kiểm tra` (chờ), `Hoàn thành công` (chờ).
2. **Given** nhân viên đã chấp nhận yêu cầu hoàn trả của khách, **When** khách hàng xem Chi tiết đơn hàng, **Then** hệ thống hiển thị nút **"Xác nhận đã gửi trả hàng"**.
3. **Given** khách hàng bấm **"Xác nhận đã gửi trả hàng"**, **When** hệ thống lưu thành công, **Then** giao diện cập nhật trạng thái "Đã gửi trả hàng - Chờ cửa hàng tiếp nhận", nút gửi hàng được ẩn đi để tránh bấm trùng lặp.

---

### User Story 2 - Nhân viên (Staff) quản lý quy trình nhận hàng, kiểm tra và quyết định hoàn tiền (Priority: P1)

Nhân viên quản lý quy trình hoàn đơn trên màn hình Staff qua các bước xử lý nghiệp vụ tuần tự:

1. **Bước 1 - Duyệt yêu cầu**: Kiểm tra lý do, ảnh và mô tả ban đầu:
   - Nếu từ chối: Nhập lý do từ chối -> đơn kết thúc luồng hoàn.
   - Nếu chấp nhận: Bấm **"Chấp nhận yêu cầu hoàn trả"** -> Yêu cầu chuyển sang trạng thái chờ khách gửi hàng (`return_approved`).
2. **Bước 2 - Xác nhận nhận hàng**: Khi kiện hàng gửi trả về đến cửa hàng, nhân viên mở yêu cầu và nhấn nút **"Đã nhận được hàng"** (bỏ qua khâu đối soát với đơn vị ship trung gian). Trạng thái chuyển sang `item_received` (Đang kiểm tra hàng hoàn).
3. **Bước 3 - Kiểm tra hàng & Quyết định Refund**: Sau khi kiểm tra hàng thực tế:
   - Nhân viên nhấn **"Xác nhận hoàn tiền & Hoàn tất"**: Hệ thống tự động **cộng lại tồn kho**, ghi nhận trạng thái hoàn tiền (`refunded`) theo tài khoản ngân hàng của khách, và chuyển trạng thái đơn hàng sang **"Hoàn thành công"** (`returned`/`completed`).
   - Nếu hàng bị lỗi do khách hoặc không đúng: Nhân viên có tùy chọn từ chối hoàn tiền kèm lý do giải thích.

**Why this priority**: Tách bạch rõ ràng giữa "Đồng ý cho hoàn hàng" và "Đã nhận được hàng thực tế + Hoàn tiền", ngăn ngừa thất thoát tài chính và tồn kho ảo khi hàng chưa về kho.

**Independent Test**: Nhân viên duyệt yêu cầu -> chờ khách xác nhận gửi -> nhân viên bấm "Đã nhận được hàng" -> nhân viên duyệt "Hoàn tiền" -> xác minh tồn kho được cộng lại và timeline chuyển sang "Hoàn thành công".

**Acceptance Scenarios**:
1. **Given** yêu cầu hoàn trả ở bước chờ duyệt, **When** nhân viên bấm "Chấp nhận", **Then** trạng thái đổi thành "Chờ khách gửi hàng", timeline chuyển trạng thái tương ứng.
2. **Given** khách hàng đã xác nhận gửi trả hàng, **When** nhân viên bấm **"Đã nhận được hàng"**, **Then** hệ thống cập nhật trạng thái sang "Nhân viên kiểm tra", timeline khách hàng nhảy sáng mốc 3 "Nhân viên kiểm tra".
3. **Given** nhân viên đã kiểm tra hàng hóa nguyên vẹn, **When** nhân viên bấm **"Xác nhận hoàn tiền"**, **Then** tồn kho các mặt hàng trong đơn được cộng lại, trạng thái hoàn tiền ghi nhận thành công, mốc 4 **"Hoàn thành công"** trên timeline chuyển màu xanh hoàn tất.

---

### User Story 3 - Đồng bộ trạng thái đơn hàng & Khối timeline hoàn trả (Priority: P2)

Hệ thống đảm bảo tính nhất quán giữa trạng thái đơn hàng chính (`orderStatus`), trạng thái yêu cầu hoàn trả (`returnRequest.status`), và thanh tiến trình giao diện (`timeline`):
- Trong toàn bộ thời gian xử lý hoàn trả, đơn hàng không bị tiến trình tự động hoàn thành 3 ngày can thiệp.
- Thanh Timeline hiển thị trực quan thông tin thời gian (timestamp) và ghi chú tương ứng ở từng bước:
  - Mốc 1: `Yêu cầu hoàn đơn` - Thời gian khách gửi yêu cầu.
  - Mốc 2: `Chờ xác nhận` - Thời gian staff chấp nhận & khách xác nhận gửi hàng.
  - Mốc 3: `Nhân viên kiểm tra` - Thời gian staff xác nhận nhận được hàng.
  - Mốc 4: `Hoàn thành công` - Thời gian duyệt hoàn tiền và hoàn tất.

**Acceptance Scenarios**:
1. **Given** đơn hàng đang ở bất kỳ giai đoạn nào của luồng hoàn trả, **When** truy cập màn hình Chi tiết đơn hàng hoặc Tra cứu đơn hàng, **Then** thanh timeline luôn hiển thị đầy đủ 4 mốc: `Yêu cầu hoàn đơn` -> `Chờ xác nhận` -> `Nhân viên kiểm tra` -> `Hoàn thành công`.
2. **Given** yêu cầu bị từ chối ở bước duyệt ban đầu hoặc bước kiểm tra hàng, **When** xem chi tiết đơn, **Then** thanh timeline hiển thị rõ mốc từ chối kèm lý do từ chối cụ thể của nhân viên.

---

## Edge Cases

- **Khách hàng chưa gửi hàng nhưng bấm "Xác nhận đã gửi trả hàng"**: Staff chỉ bấm "Đã nhận được hàng" khi kiện hàng thực tế đã được giao tới tay nhân viên tại quầy/kho; không phụ thuộc vào mã vận đơn bên ngoài.
- **Khách hàng không gửi trả hàng sau khi được duyệt**: Khách hàng có 3 ngày (72 giờ) kể từ khi Staff duyệt để gửi hàng và bấm "Xác nhận đã gửi trả hàng". Nếu quá 3 ngày mà khách không bấm xác nhận gửi, yêu cầu hoàn trả tự động hết hạn/hủy để đảm bảo xử lý khiếu nại nhanh gọn.
- **Hàng nhận về không đạt yêu cầu hoàn trả**: Nhân viên ghi nhận lý do hàng không đạt trong phần kiểm tra và từ chối hoàn tiền; hệ thống lưu lại biên bản từ chối.
- **Đơn hàng COD chưa thanh toán vs Đơn hàng ONLINE đã thanh toán**:
  - Với đơn `ONLINE`: Quyết định Refund kích hoạt ghi nhận đối soát hoàn tiền qua STK ngân hàng khách đã cung cấp.
  - Với đơn `COD` (nếu khách từ chối nhận hàng và hoàn ngay): Khách chưa thanh toán nên không phát sinh hoàn tiền, chỉ cộng lại tồn kho và hoàn tất.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI hỗ trợ chu trình hoàn trả 4 giai đoạn:
  1. `requested`: Khách gửi yêu cầu hoàn đơn.
  2. `return_approved` / `customer_shipped`: Nhân viên chấp nhận yêu cầu & Khách xác nhận đã gửi trả hàng.
  3. `item_received`: Nhân viên xác nhận đã nhận được hàng tại cửa hàng.
  4. `refunded` / `completed`: Nhân viên kiểm tra hàng đạt yêu cầu, xác nhận hoàn tiền và hoàn tất.
- **FR-002**: Khi đơn hàng bước vào luồng hoàn trả, giao diện Chi tiết đơn hàng và Tra cứu đơn hàng PHẢI chuyển đổi thanh tiến trình (Order Timeline) sang 4 mốc tuần tự:
  1. **Yêu cầu hoàn đơn**
  2. **Chờ xác nhận**
  3. **Nhân viên kiểm tra**
  4. **Hoàn thành công**
- **FR-003**: Khi yêu cầu hoàn trả được nhân viên chấp nhận (`return_approved`), giao diện Chi tiết đơn hàng của khách PHẢI hiển thị nút hành động **"Xác nhận đã gửi trả hàng"** kèm hướng dẫn gửi hàng.
- **FR-004**: Khi khách hàng nhấn **"Xác nhận đã gửi trả hàng"**, hệ thống PHẢI cập nhật trạng thái gửi hàng của khách (`customerShippedAt`) và thông báo cho nhân viên.
- **FR-005**: Trên màn hình quản lý của Staff, đối với đơn mà khách đã gửi trả hàng, hệ thống PHẢI cung cấp nút **"Đã nhận được hàng"** để nhân viên ghi nhận khi hàng về tới nơi.
- **FR-006**: Sau khi đã bấm "Đã nhận được hàng", hệ thống PHẢI mở giao diện quyết định kiểm tra và hoàn tiền:
  - Cho phép nhân viên điều chỉnh số tiền hoàn thực tế `refundAmount` (mặc định bằng tổng tiền đã thanh toán). Nhân viên thực hiện chuyển khoản bên ngoài cho khách theo STK ngân hàng hiển thị trên màn hình.
  - Nút **"Xác nhận hoàn tiền & Hoàn tất"**: Sau khi chuyển khoản bên ngoài thành công, nhân viên bấm xác nhận -> hệ thống tự động cộng lại tồn kho các sản phẩm trong đơn, ghi nhận số tiền hoàn, chuyển trạng thái hoàn tiền sang `refunded`, cập nhật mốc timeline thứ 4 sang `completed`.
  - Nút **"Từ chối hoàn tiền"**: Bắt buộc nhập lý do từ chối (tối thiểu 5 ký tự) nếu hàng không hợp lệ.
- **FR-007**: Hệ thống PHẢI ngăn chặn tiến trình tự động hoàn thành đơn hàng 3 ngày can thiệp vào bất kỳ đơn hàng nào đang trong chu trình hoàn trả 4 giai đoạn này.

### Key Entities

- **ReturnRequest**:
  - `status`: Enum mở rộng gồm `pending` (Chờ duyệt), `approved` (Đã duyệt yêu cầu), `customer_shipped` (Khách đã gửi hàng), `received` (Shop đã nhận hàng), `completed` (Hoàn thành công), `rejected` (Từ chối).
  - `requestedAt`: Thời điểm gửi yêu cầu.
  - `approvedAt`: Thời điểm Staff duyệt yêu cầu.
  - `customerShippedAt`: Thời điểm khách xác nhận đã gửi hàng.
  - `receivedAt`: Thời điểm Staff bấm đã nhận được hàng.
  - `completedAt`: Thời điểm Staff hoàn tất hoàn tiền.
  - `rejectionReason`: Lý do từ chối (nếu có).
  - `bankAccount`: Thông tin ngân hàng nhận tiền hoàn (`bankName`, `accountNumber`, `accountHolder`).
  - `refundStatus`: `none` | `pending_refund` | `refunded`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% đơn hàng trong luồng hoàn trả hiển thị chính xác thanh Timeline 4 mốc: `Yêu cầu hoàn đơn` -> `Chờ xác nhận` -> `Nhân viên kiểm tra` -> `Hoàn thành công` tương ứng với tiến độ thực tế.
- **SC-002**: 100% khách hàng có yêu cầu được duyệt nhìn thấy nút "Xác nhận đã gửi trả hàng" và thao tác thành công.
- **SC-003**: Tồn kho sản phẩm chỉ được cộng lại khi Staff bấm xác nhận hoàn tất ở bước kiểm tra hàng, tuyệt đối không cộng trước khi hàng về đến shop.
- **SC-004**: 0% đơn hàng trong quá trình hoàn trả bị tự động hoàn thành nhầm sau 3 ngày giao hàng.
