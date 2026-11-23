# Feature Specification: Tự Động Hoàn Thành Đơn Hàng Sau 3 Ngày Đang Giao (Auto Complete Shipping Orders)

**Feature Branch**: `feature/auto-complete-orders`

**Created**: 2026-11-12

**Status**: Ready

**Input**: User description: "tôi muốn thiết kê chức năng tự động cập nhật đơn hàng sang trạng thái hoàn thành nếu khách hàng ko ấn đã nhận được hàng sau 3 ngày kể từ khi staff đổi sang trạng thái đang giao"

## Clarifications

### Session 2026-11-12

- Q: Khi đơn hàng COD được hệ thống tự động chuyển sang Hoàn thành sau 3 ngày, trạng thái thanh toán của đơn COD đó nên xử lý như thế nào? → A: Tự động cập nhật thành **"Đã thanh toán"**, đồng nhất với cơ chế khi khách tự bấm "Đã nhận được hàng".
- Q: Quy tắc tự động hoàn thành sau 3 ngày áp dụng cho những đơn hàng đang giao nào? → A: Áp dụng cho **tất cả đơn hàng trực tuyến ở trạng thái Đang giao quá 3 ngày (72 giờ)**, bao gồm cả đơn của khách hàng có tài khoản lẫn đơn khách vãng lai không đăng nhập.
- Q: Hệ thống có cần hiển thị mốc thời gian dự kiến tự động hoàn thành trên Chi tiết đơn hàng và gửi thông báo riêng cho khách hàng không? → B: **Không cần hiển thị nhắc trên giao diện hay gửi thông báo riêng** — hệ thống chỉ tự động cập nhật trạng thái đơn hàng (kèm trạng thái thanh toán với đơn COD) và ghi rõ mục **Lịch sử trạng thái do hệ thống thực hiện**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hệ thống tự động hoàn thành đơn hàng quá 3 ngày kể từ lúc chuyển sang Đang giao (Priority: P1)

Khi nhân viên cửa hàng chuyển một đơn hàng trực tuyến sang trạng thái **"Đang giao"**, hệ thống ghi nhận mốc thời gian bắt đầu giao hàng. Nếu trong vòng **3 ngày (72 giờ)** kể từ thời điểm đó mà khách hàng vẫn chưa thao tác bấm nút **"Đã nhận được hàng"**, hệ thống tự động chuyển đơn hàng từ **"Đang giao"** sang **"Hoàn thành"**, đồng thời đối với đơn thanh toán khi nhận hàng (COD) tự động cập nhật trạng thái thanh toán thành **"Đã thanh toán"** (đồng nhất với khi khách tự xác nhận đã nhận hàng).

Mỗi lần tự động hoàn thành, hệ thống ghi nhận một dòng dấu vết vào lịch sử trạng thái của đơn hàng cho biết thao tác được hệ thống tự động thực hiện cùng thời điểm chính xác.

**Why this priority**: Ngăn ngừa tình trạng đơn hàng trực tuyến bị kẹt vĩnh viễn ở trạng thái "Đang giao" khi khách quên xác nhận nhận hàng, giúp dữ liệu đơn hàng và báo cáo doanh thu phản ánh đúng thực tế vận hành.

**Independent Test**: Tạo một đơn hàng trực tuyến ở trạng thái "Đang giao" với thời điểm bắt đầu giao hàng đã vượt quá 3 ngày (72 giờ), kích hoạt hoặc chờ chu kỳ kiểm tra của hệ thống và xác minh đơn hàng tự động chuyển sang "Hoàn thành" kèm lịch sử ghi nhận từ hệ thống, trong khi đơn chưa đủ 3 ngày vẫn giữ nguyên "Đang giao".

**Acceptance Scenarios**:

1. **Given** một đơn hàng hợp lệ đang ở trạng thái "Đang giao" với thời điểm chuyển sang "Đang giao" cách hiện tại từ 72 giờ trở lên và khách hàng chưa bấm "Đã nhận được hàng", **When** hệ thống thực hiện kiểm tra tự động định kỳ hoặc kiểm tra khi đơn hàng được truy cập, **Then** đơn hàng tự động chuyển từ "Đang giao" sang "Hoàn thành" và ghi nhận một mục lịch sử mới do hệ thống thực hiện.
2. **Given** một đơn hàng đang ở trạng thái "Đang giao" nhưng mới chuyển sang trạng thái này dưới 72 giờ (ví dụ: 2 ngày 23 giờ), **When** hệ thống thực hiện kiểm tra, **Then** đơn hàng vẫn giữ nguyên trạng thái "Đang giao" và không bị chuyển sớm.
3. **Given** khách hàng chủ động bấm "Đã nhận được hàng" trước thời điểm đủ 72 giờ, **When** đến hoặc qua mốc 72 giờ, **Then** hệ thống bỏ qua đơn hàng đó, không ghi trùng lặp lịch sử trạng thái và giữ nguyên người thực hiện xác nhận là khách hàng.

---

### User Story 2 - Phạm vi đơn hàng áp dụng và tính nhất quán sau khi tự động hoàn thành (Priority: P1)

Tính năng tự động hoàn thành áp dụng thống nhất và đồng bộ trạng thái nghiệp vụ sau khi hoàn thành:
- Áp dụng cho **tất cả đơn hàng trực tuyến ở trạng thái "Đang giao" quá 3 ngày (72 giờ)**, bao gồm cả đơn của khách hàng có tài khoản lẫn đơn của khách vãng lai không đăng nhập.
- Sau khi đơn hàng tự động chuyển sang "Hoàn thành", hệ thống không cho phép thao tác chuyển trạng thái hay hủy đơn nữa; đối với đơn COD trạng thái thanh toán trở thành "Đã thanh toán"; các chỉ số báo cáo bán hàng/tài chính của quản trị viên và quyền đánh giá sản phẩm (nếu khách có tài khoản) tự động ghi nhận đơn hàng đã hoàn tất tương tự như khi khách tự bấm nhận hàng.

**Why this priority**: Đảm bảo mọi đơn giao hàng thành công (kể cả đơn khách vãng lai vốn không tự bấm xác nhận) không bị treo mãi ở "Đang giao" và đồng bộ doanh số báo cáo.

**Independent Test**: Kiểm tra hành vi của hệ thống đối với các loại đơn "Đang giao" quá 3 ngày khác nhau (đơn khách có tài khoản, đơn khách vãng lai, đơn thanh toán trực tuyến và đơn COD) để xác minh tất cả đều chuyển sang "Hoàn thành", đơn COD thành "Đã thanh toán", và báo cáo/đánh giá ghi nhận nhất quán.

**Acceptance Scenarios**:

1. **Given** một đơn hàng thuộc phạm vi áp dụng ở trạng thái "Đang giao" quá 3 ngày, **When** đơn hàng được hệ thống tự động hoàn thành, **Then** mọi màn hình tra cứu của khách hàng, nhân viên và báo cáo quản trị đều hiển thị trạng thái "Hoàn thành" nhất quán.
2. **Given** một đơn hàng đã tự động chuyển sang "Hoàn thành", **When** khách hàng mở lại chi tiết đơn hàng đúng lúc đó và cố bấm nút "Đã nhận được hàng" (trên giao diện chưa kịp tải lại), **Then** hệ thống xử lý an toàn mà không ghi lặp lịch sử hay báo lỗi hệ thống nghiêm trọng, đồng thời cập nhật giao diện về trạng thái "Hoàn thành".

---

### User Story 3 - Ghi nhận lịch sử hệ thống rõ ràng và phục hồi khi gián đoạn (Priority: P2)

Hệ thống tự động xử lý chuyển trạng thái và **ghi nhận rõ mục Lịch sử trạng thái do hệ thống tự động thực hiện** (không cần hiển thị đồng hồ/mốc nhắc dự kiến trên giao diện Chi tiết đơn hàng và không gửi thông báo riêng cho khách hàng).

Ngoài ra, hệ thống phải đảm bảo tính bền bỉ: nếu máy chủ bảo trì hoặc tạm ngưng đúng vào giờ thứ 72 của một đơn hàng, ngay khi hệ thống hoạt động trở lại, đơn hàng quá hạn đó vẫn phải được phát hiện và tự động hoàn thành mà không bị bỏ sót vĩnh viễn.

**Why this priority**: Giữ nguyên giao diện người dùng gọn nhẹ, minh bạch dấu vết kiểm toán trong lịch sử đơn hàng và bảo đảm không sót đơn nếu hệ thống khởi động lại.

**Independent Test**: Tạm dừng rồi khởi động lại hệ thống khi có đơn hàng đã quá mốc 72 giờ đang giao, xác minh đơn hàng vẫn được tự động hoàn thành và mục lịch sử trạng thái hiển thị rõ do hệ thống tự động thực hiện mà không phát sinh thông báo dư thừa.

**Acceptance Scenarios**:

1. **Given** một đơn hàng có thời điểm chuyển sang "Đang giao" đã quá 3 ngày trong khoảng thời gian hệ thống tạm ngưng hoạt động, **When** hệ thống khởi động lại và vận hành bình thường, **Then** đơn hàng quá hạn đó vẫn được tự động cập nhật sang "Hoàn thành".
2. **Given** khách hàng hoặc nhân viên xem lịch sử trạng thái của đơn hàng vừa được tự động hoàn thành, **When** xem chi tiết đơn hàng, **Then** nhìn thấy rõ mốc thời gian hệ thống tự động chuyển từ "Đang giao" sang "Hoàn thành".

---

### Edge Cases

- **Đơn hàng đang giao nhưng chưa từng ghi nhận mốc giờ chuyển sang "Đang giao" trong lịch sử (dữ liệu cũ)**: Hệ thống có phương án dự phòng an toàn bằng mốc cập nhật gần nhất (hoặc mốc tạo đơn) thay vì bỏ sót mãi mãi hoặc làm sập tiến trình kiểm tra.
- **Khách hàng bấm "Đã nhận được hàng" đúng cùng tích tắc với chu kỳ tự động hoàn thành của hệ thống**: Cơ chế cập nhật theo điều kiện trạng thái đảm bảo chỉ một thao tác được ghi nhận thành công (từ "Đang giao" sang "Hoàn thành"), không bao giờ tạo 2 dòng lịch sử trùng lặp cho cùng một đơn hàng.
- **Đơn hàng ở trạng thái khác ("Chờ xử lý", "Đã xác nhận", "Đang chuẩn bị", "Hoàn thành", "Đã hủy")**: Dù đã quá 3 ngày kể từ khi tạo hoặc cập nhật, hệ thống tuyệt đối không tự động hoàn thành những đơn không ở trạng thái "Đang giao".
- **Đơn hàng bán trực tiếp tại quầy (POS)**: Mặc định đã ở trạng thái "Hoàn thành" ngay lúc tạo nên không chịu tác động của luồng tự động hoàn thành giao hàng.
- **Nhân viên chuyển trạng thái đơn hàng khi máy chủ bị lệch múi giờ hoặc đồng hồ**: Toàn bộ phép tính 3 ngày (72 giờ) dựa trên thời gian chuẩn thống nhất của máy chủ, không phụ thuộc múi giờ trình duyệt của người dùng.
- **Số lượng đơn hàng quá hạn 3 ngày tăng đột biến cùng lúc (sau kỳ nghỉ lễ hoặc bảo trì)**: Quá trình xử lý kiểm tra và cập nhật phải vận hành an toàn, xử lý hết toàn bộ đơn đủ điều kiện mà không làm treo hoặc chậm trải nghiệm mua sắm thông thường của khách hàng.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI ghi nhận và xác định chính xác mốc thời điểm một đơn hàng trực tuyến bắt đầu chuyển sang trạng thái **"Đang giao"** (dựa trên thời điểm chuyển trạng thái vào "Đang giao" trong lịch sử đơn hàng; nếu dữ liệu cũ thiếu mốc này thì sử dụng mốc cập nhật gần nhất làm phương án dự phòng).
- **FR-002**: Đối với mọi đơn hàng thuộc phạm vi áp dụng đang ở trạng thái **"Đang giao"** và đã trải qua tối thiểu **3 ngày (72 giờ liên tục)** kể từ mốc thời điểm bắt đầu giao hàng mà chưa có xác nhận nhận hàng từ khách hàng, hệ thống PHẢI tự động cập nhật trạng thái đơn hàng sang **"Hoàn thành"**.
- **FR-003**: Hệ thống KHÔNG ĐƯỢC tự động chuyển trạng thái các đơn hàng chưa đủ 72 giờ kể từ khi bắt đầu giao hàng, hoặc các đơn hàng đang ở trạng thái khác ("Chờ xử lý", "Đã xác nhận", "Đang chuẩn bị", "Hoàn thành", "Đã hủy").
- **FR-004**: Khi tự động hoàn thành đơn hàng, hệ thống PHẢI cập nhật nguyên tử đồng thời trạng thái mới và thêm đúng một bản ghi lịch sử chuyển trạng thái (`từ Đang giao -> Hoàn thành` kèm dấu thời gian thực tế, phân biệt rõ là thao tác tự động của hệ thống), đảm bảo không ghi trùng lặp ngay cả khi xảy ra thao tác đồng thời.
- **FR-005**: Khi tự động hoàn thành một đơn hàng có phương thức thanh toán **COD**, hệ thống PHẢI đồng thời cập nhật trạng thái thanh toán của đơn đó thành **"Đã thanh toán"** (đồng nhất với thao tác khách hàng xác nhận nhận hàng).
- **FR-006**: Quy tắc tự động hoàn thành sau 3 ngày PHẢI áp dụng cho **tất cả đơn hàng trực tuyến** đang ở trạng thái "Đang giao", bao gồm cả đơn của khách hàng có tài khoản lẫn đơn của khách vãng lai không đăng nhập.
- **FR-007**: Hệ thống PHẢI ghi nhận dấu vết chuyển trạng thái trong lịch sử đơn hàng để nhân viên/quản trị viên nhận biết đây là thao tác tự động của hệ thống; KHÔNG hiển thị thêm đồng hồ/mốc nhắc tự động hoàn thành trên giao diện và KHÔNG tạo bản ghi thông báo riêng cho khách hàng.
- **FR-008**: Hệ thống PHẢI đảm bảo khả năng tự động bù trừ sau thời gian gián đoạn: bất kỳ đơn hàng quá hạn 72 giờ nào vẫn nằm ở trạng thái "Đang giao" khi hệ thống khởi động lại hoặc trong các chu kỳ kiểm tra kế tiếp đều phải được phát hiện và hoàn thành đầy đủ.
- **FR-009**: Thao tác tự động hoàn thành KHÔNG ĐƯỢC làm thay đổi danh sách sản phẩm, đơn giá, số lượng, tồn kho đã trừ, mã giảm giá hay thông tin giao hàng của đơn hàng.

### Key Entities *(include if feature involves data)*

- **Đơn hàng (Order)**: Chứa kênh bán hàng (trực tuyến / tại quầy), trạng thái xử lý hiện tại, phương thức thanh toán, trạng thái thanh toán, cờ cần đối soát, mốc thời gian cập nhật, và danh sách lịch sử thay đổi trạng thái.
- **Mục lịch sử trạng thái đơn hàng (Status History Entry)**: Chứa trạng thái trước đó ("Đang giao"), trạng thái mới ("Hoàn thành"), tác nhân thực hiện (khách hàng xác nhận hoặc hệ thống tự động), và dấu thời gian chuyển đổi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% đơn hàng trực tuyến đủ điều kiện ở trạng thái "Đang giao" vượt quá 72 giờ được tự động chuyển sang "Hoàn thành" mà không cần can thiệp thủ công từ nhân viên hay quản trị viên.
- **SC-002**: 0% đơn hàng ở trạng thái "Đang giao" chưa đủ 72 giờ hoặc không thuộc phạm vi áp dụng bị chuyển nhầm sang "Hoàn thành".
- **SC-003**: 0% trường hợp phát sinh lịch sử chuyển trạng thái trùng lặp (2 dòng `Đang giao -> Hoàn thành`) kể cả khi khách hàng bấm xác nhận trùng thời điểm hệ thống quét tự động.
- **SC-004**: Sau khi hệ thống khởi động lại sau gián đoạn, toàn bộ đơn hàng quá hạn 3 ngày được xử lý đồng bộ về trạng thái "Hoàn thành" trong vòng tối đa vài phút vận hành đầu tiên.

## Assumptions

- Thời hạn **3 ngày** được tính chính xác bằng **72 giờ** liên tục (tính theo đồng hồ máy chủ) kể từ thời điểm nhân viên chuyển đơn sang "Đang giao", không trừ cuối tuần hay ngày lễ (trừ khi bạn muốn thay đổi trong phần làm rõ).
- Quy trình nhân viên cập nhật các bước trước đó (`Chờ xử lý -> Đã xác nhận -> Đang chuẩn bị -> Đang giao`) và nút **"Đã nhận được hàng"** của khách hàng trong 3 ngày đầu tiên vẫn giữ nguyên cơ chế hiện tại.
- Trừ hàng tồn kho đã được thực hiện từ lúc đặt hàng và không thay đổi tại bước chuyển từ "Đang giao" sang "Hoàn thành".

