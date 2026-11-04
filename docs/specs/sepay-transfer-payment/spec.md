# Feature Specification: Tích Hợp Thanh Toán Chuyển Khoản Ngân Hàng Qua SePay (VietQR)

**Feature Branch**: `feature/sepay-transfer-payment`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "xây dựng và tích hợp tính năng thanh toán khi khách hàng chọn thanh toán chuyển khoản với sepay (hiện tại chạy request qua ngrok để test) file spec md tạo ra đưa vào thư mục docs/spec/[tên tính năng]"

## Clarifications

### Session 2026-11-04

- Q: Hệ thống nên xử lý trạng thái đơn hàng như thế nào khi phiên thanh toán chuyển khoản hết thời gian đếm ngược (15 phút) mà chưa nhận được tiền? → A: Giữ đơn hàng ở trạng thái chờ (pending), cho phép khách hàng bấm "Tạo lại mã thanh toán" (gia hạn thêm 15 phút) hoặc chuyển đổi sang phương thức thanh toán COD.
- Q: Hệ thống nên xử lý như thế nào khi khách hàng chuyển khoản thiếu tiền so với tổng giá trị đơn hàng? → A: Ghi nhận số tiền đã nhận vào đơn hàng, hiển thị số tiền còn thiếu và tạo mã VietQR bù tiền để khách hàng tiếp tục chuyển khoản; khi tổng tiền nhận được đủ, đơn hàng tự động chuyển sang "Đã thanh toán".
- Q: Giao diện thanh toán của khách hàng nên sử dụng cơ chế nào để nhận biết và hiển thị trạng thái "Đã thanh toán" ngay khi tiền về tài khoản? → A: Cơ chế kết hợp: Polling tự động mỗi 3 giây kèm nút bấm "Tôi đã chuyển tiền / Kiểm tra trạng thái" để người mua có thể kích hoạt kiểm tra tức thì.
- Q: Cú pháp nội dung chuyển khoản (Transfer Memo) nên được chuẩn hóa theo định dạng nào để đảm bảo ứng dụng ngân hàng không bị cắt ngắn ký tự và SePay nhận diện mã đơn hàng chính xác nhất? → A: Tiền tố thương hiệu kèm mã đơn hàng: PETJOY <orderCode> (Ví dụ: PETJOY ORD173000123).
- Q: Khi phát sinh giao dịch ngoại lệ như khách hàng chuyển thừa tiền hoặc chuyển tiền sau khi đơn hàng đã chuyển đổi sang COD, hệ thống nên gắn cờ và thông báo cho nhân viên như thế nào? → A: Đánh dấu cờ cảnh báo "Cần đối soát" (needs_review) trên đơn hàng và danh sách giao dịch để nhân viên liên hệ khách hàng đối soát hoặc hoàn tiền thủ công.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khách hàng chọn thanh toán chuyển khoản và quét mã VietQR tự động (Priority: P1)

Khách hàng (người dùng đã đăng nhập hoặc khách mua nhanh không đăng nhập) tại màn hình Thanh toán (Checkout) lựa chọn phương thức "Chuyển khoản ngân hàng (VietQR qua SePay)". Sau khi xác nhận đặt hàng, hệ thống tạo đơn hàng và hiển thị ngay màn hình hướng dẫn thanh toán. Màn hình cung cấp mã VietQR động được cấu hình sẵn số tiền chính xác, số tài khoản ngân hàng của cửa hàng và nội dung chuyển khoản chuẩn hóa theo cú pháp `PETJOY <orderCode>` (Ví dụ: `PETJOY ORD173000123`). Khách hàng sử dụng ứng dụng ngân hàng di động bất kỳ để quét mã QR và xác nhận chuyển tiền mà không cần nhập thủ công các thông tin giao dịch.

**Why this priority**: Đây là luồng thanh toán chính, cung cấp phương thức thanh toán không tiền mặt tiện lợi, chuẩn hóa và giảm thiểu tối đa sai sót khi chuyển khoản cho người mua hàng.

**Independent Test**: Có thể kiểm thử độc lập bằng cách chọn phương thức chuyển khoản khi thanh toán một giỏ hàng bất kỳ, sau đó xác minh màn hình hiển thị đầy đủ thông tin thanh toán, mã QR chuẩn xác và nút sao chép thông tin hoạt động bình thường.

**Acceptance Scenarios**:

1. **Given** người mua có giỏ hàng hợp lệ và đã điền đầy đủ thông tin giao hàng, **When** người mua chọn phương thức "Chuyển khoản ngân hàng (VietQR qua SePay)" và nhấn "Đặt hàng", **Then** hệ thống ghi nhận đơn hàng ở trạng thái chờ thanh toán và chuyển tiếp đến màn hình chi tiết thanh toán hiển thị mã VietQR động, tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền cần chuyển và nội dung chuyển khoản chuẩn `PETJOY <orderCode>`.
2. **Given** người mua đang ở màn hình thanh toán chuyển khoản, **When** người mua nhấn nút sao chép bên cạnh Số tài khoản, Số tiền hoặc Nội dung chuyển khoản, **Then** hệ thống sao chép chính xác thông tin đó vào bộ nhớ đệm và hiển thị thông báo phản hồi thao tác thành công.

---

### User Story 2 - Tự động ghi nhận thanh toán thành công qua SePay Webhook và cập nhật giao diện (Priority: P1)

Khi khách hàng thực hiện chuyển khoản thành công từ tài khoản ngân hàng của họ, cổng thanh toán SePay tự động phát hiện biến động số dư và gửi thông báo kết quả giao dịch (Webhook) tới hệ thống. Hệ thống tiếp nhận thông báo (thông qua đường dẫn tunnel ngrok trong môi trường thử nghiệm), kiểm tra tính hợp lệ của nguồn gửi, đối chiếu mã đơn hàng (trích xuất từ nội dung giao dịch theo mẫu `PETJOY <orderCode>`) và số tiền thực nhận. Khi thông tin khớp hoàn toàn, hệ thống tự động cập nhật trạng thái thanh toán của đơn hàng thành "Đã thanh toán".

Màn hình thanh toán của khách hàng liên tục đồng bộ trạng thái ngầm qua cơ chế thăm dò tự động (polling) mỗi 3 giây trong suốt thời gian đếm ngược, đồng thời cung cấp nút bấm "Tôi đã chuyển tiền / Kiểm tra trạng thái". Ngay khi thanh toán được ghi nhận, màn hình tự động chuyển sang thông báo "Thanh toán thành công" mà không yêu cầu khách hàng phải tải lại trang hay gửi ảnh chụp biên lai đối soát.

**Why this priority**: Tự động hóa hoàn toàn quy trình xác thực thanh toán thời gian thực, mang lại trải nghiệm mua sắm mượt mà cho khách hàng và giảm tải 100% công sức kiểm tra sao kê ngân hàng thủ công của nhân viên.

**Independent Test**: Có thể kiểm thử độc lập bằng cách kích hoạt một yêu cầu webhook mô phỏng từ cổng thanh toán qua ngrok khớp với mã đơn hàng đang chờ, sau đó kiểm tra trạng thái đơn hàng trong hệ thống và giao diện người mua tự động chuyển thành công.

**Acceptance Scenarios**:

1. **Given** một đơn hàng đang ở trạng thái chờ thanh toán với tổng tiền X và mã đơn hàng Z, **When** hệ thống nhận được thông báo giao dịch hợp lệ từ cổng thanh toán với số tiền bằng hoặc lớn hơn X và nội dung giao dịch chứa cú pháp `PETJOY Z` (không phân biệt chữ hoa/thường), **Then** hệ thống ghi nhận giao dịch thành công, cập nhật trạng thái thanh toán của đơn hàng thành "Đã thanh toán" và phản hồi xác nhận thành công cho cổng thanh toán.
2. **Given** người mua đang quan sát màn hình chờ thanh toán, **When** hệ thống xác nhận thanh toán thành công (thông qua lần polling định kỳ 3 giây hoặc khi người mua nhấn "Kiểm tra trạng thái"), **Then** giao diện người mua lập tức cập nhật thành thông báo "Đặt hàng và Thanh toán thành công", hiển thị mã tham chiếu thanh toán và hướng dẫn xem chi tiết đơn hàng.

---

### User Story 3 - Xử lý hết hạn phiên thanh toán và linh hoạt gia hạn hoặc đổi sang COD (Priority: P2)

Mỗi phiên thanh toán chuyển khoản có hiệu lực trong khoảng thời gian xác định (mặc định 15 phút). Màn hình thanh toán hiển thị đồng hồ đếm ngược trực quan. Nếu hết thời gian mà hệ thống chưa nhận được thông báo chuyển tiền thành công, phiên thanh toán sẽ hết hiệu lực nhưng đơn hàng vẫn được giữ nguyên ở trạng thái chờ (`pending`). Giao diện thông báo rõ ràng cho khách hàng rằng mã thanh toán đã hết hạn và cung cấp hai giải pháp tiện ích:
1. Nhấn nút "Tạo lại mã thanh toán" để nhận mã VietQR mới và gia hạn thêm 15 phút thanh toán.
2. Nhấn nút "Chuyển sang thanh toán khi nhận hàng (COD)" để lập tức hoàn tất đơn hàng mà không cần thanh toán trước, bảo lưu đầy đủ sản phẩm và các mã giảm giá đã áp dụng.

**Why this priority**: Giúp hạn chế tối đa tình trạng rớt đơn hàng khi khách hàng gặp trục trặc tạm thời với ứng dụng ngân hàng, mang lại sự linh hoạt và trải nghiệm thân thiện cho khách hàng mà vẫn kiểm soát được tính hợp lệ của mã QR.

**Independent Test**: Có thể kiểm thử bằng cách mở màn hình thanh toán, chờ hết thời gian đếm ngược và kiểm tra nút "Tạo lại mã thanh toán" và "Chuyển sang COD" hoạt động chính xác.

**Acceptance Scenarios**:

1. **Given** người mua đang ở màn hình thanh toán chuyển khoản, **When** đồng hồ đếm ngược 15 phút về 0 mà chưa có giao dịch nào được ghi nhận, **Then** màn hình chuyển sang trạng thái "Mã thanh toán đã hết hạn", đơn hàng vẫn giữ trạng thái chờ (`pending`) và hiển thị hai tùy chọn: "Tạo lại mã thanh toán (gia hạn 15 phút)" hoặc "Chuyển sang thanh toán khi nhận hàng (COD)".
2. **Given** phiên thanh toán của đơn hàng đã hết hạn 15 phút, **When** người mua nhấn nút "Tạo lại mã thanh toán", **Then** hệ thống khởi tạo phiên QR mới có hiệu lực 15 phút tiếp theo và đồng hồ đếm ngược bắt đầu lại.
3. **Given** phiên thanh toán của đơn hàng đã hết hạn 15 phút, **When** người mua nhấn nút "Chuyển sang thanh toán khi nhận hàng (COD)", **Then** hệ thống cập nhật phương thức thanh toán của đơn hàng thành COD, giữ nguyên tổng tiền và mã giảm giá đã áp dụng, đồng thời điều hướng sang trang kết quả đặt hàng thành công theo phương thức COD.

---

### User Story 4 - Quản lý, kiểm soát và xác nhận đơn hàng chuyển khoản từ phía Nhân viên và Quản trị viên (Priority: P2)

Nhân viên bán hàng và Quản trị viên tại trang quản lý đơn hàng có thể theo dõi đầy đủ chi tiết thanh toán của đơn hàng: phương thức thanh toán, trạng thái thanh toán (Chờ thanh toán, Đã thanh toán, Thất bại), mã tham chiếu giao dịch ngân hàng do SePay gửi về, thời điểm thanh toán và cờ cảnh báo "Cần đối soát" (`needs_review`) nếu phát sinh chênh lệch tiền. Hệ thống tuân thủ nghiêm ngặt quy tắc nghiệp vụ: nhân viên chỉ được phép thực hiện hành động "Xác nhận đơn hàng" (Confirm Order) đối với các đơn hàng chuyển khoản một khi trạng thái thanh toán đã là "Đã thanh toán".

**Why this priority**: Đảm bảo an toàn tài chính nội bộ, ngăn ngừa rủi ro xuất kho hoặc đóng gói giao hàng cho những đơn hàng chưa thực sự nhận được tiền.

**Independent Test**: Có thể kiểm thử độc lập bằng cách sử dụng tài khoản Nhân viên để cố gắng bấm "Xác nhận" trên một đơn hàng chuyển khoản đang chờ thanh toán (phải bị từ chối), sau đó xác nhận trên một đơn hàng đã thanh toán thành công (được chấp thuận).

**Acceptance Scenarios**:

1. **Given** một đơn hàng chuyển khoản SePay có trạng thái thanh toán là "Chờ thanh toán", **When** nhân viên thao tác nhấn "Xác nhận đơn hàng", **Then** hệ thống từ chối hành động và hiển thị cảnh báo đơn hàng chưa hoàn tất thanh toán trực tuyến (tuân thủ BR-18).
2. **Given** một đơn hàng chuyển khoản SePay đã nhận webhook thanh toán thành công, **When** nhân viên hoặc quản trị viên mở chi tiết đơn hàng, **Then** hệ thống hiển thị chính xác phương thức "Chuyển khoản trực tuyến (SePay)", trạng thái thanh toán "Đã thanh toán", số tiền đã trả và mã tham chiếu giao dịch đối soát.
3. **Given** một đơn hàng có giao dịch chuyển thừa tiền hoặc chuyển tiền sau khi đổi sang COD, **When** nhân viên mở trang danh sách hoặc chi tiết đơn hàng, **Then** hệ thống gắn huy hiệu cảnh báo nổi bật "Cần đối soát", hiển thị số tiền chênh lệch để nhân viên tiến hành xử lý hoàn tiền hoặc xác nhận.

---

### Edge Cases

- **Khách hàng chuyển thiếu tiền so với tổng đơn hàng**: Khách hàng chuyển số tiền nhỏ hơn số tiền yêu cầu của đơn hàng (ví dụ: đơn hàng 350.000 đ nhưng chỉ chuyển 300.000 đ). Hệ thống ghi nhận lịch sử giao dịch và số tiền đã nhận, giữ trạng thái đơn hàng là "Chờ thanh toán", đồng thời giao diện màn hình thanh toán lập tức cập nhật thông báo số tiền đã nhận, số tiền còn thiếu (50.000 đ) và sinh mã VietQR mới cho phần tiền còn thiếu để khách hàng chuyển bù ngay. Khi tổng số tiền các lần chuyển cộng dồn đạt đủ hoặc vượt tổng tiền đơn hàng, hệ thống tự động chuyển trạng thái đơn hàng sang "Đã thanh toán".
- **Khách hàng chuyển thừa tiền hoặc chuyển nhiều lần cho cùng một mã đơn**: Giao dịch đầu tiên đạt đủ tiền sẽ chuyển đơn hàng sang trạng thái "Đã thanh toán". Các giao dịch tiếp theo được ghi nhận vào nhật ký thanh toán của đơn hàng dưới dạng thanh toán thừa/thừa số dư, đồng thời tự động đánh dấu cờ cảnh báo "Cần đối soát" (`needs_review`) để nhân viên liên hệ khách hàng thực hiện hoàn lại tiền thừa.
- **Chuyển tiền sau khi đơn hàng đã chuyển đổi sang COD**: Nếu khách hàng chuyển khoản sau khi đã nhấn chuyển phương thức sang COD, hệ thống vẫn ghi nhận giao dịch thành công từ SePay, gắn cờ cảnh báo "Cần đối soát" (`needs_review`) để nhân viên liên hệ xác nhận: cập nhật trạng thái đơn thành "Đã thanh toán" (giao hàng không thu tiền) hoặc hoàn lại tiền nếu khách vẫn muốn trả COD.
- **Nhận lại thông báo thanh toán trùng lặp (Idempotency - BR-16)**: Cổng thanh toán hoặc môi trường mạng thử nghiệm gửi lại cùng một thông báo giao dịch nhiều lần. Hệ thống kiểm tra mã giao dịch duy nhất (transaction reference), ghi nhận xử lý ở lần đầu tiên và bỏ qua việc cập nhật lại ở các lần tiếp theo mà vẫn phản hồi xác nhận thành công cho cổng thanh toán để tránh lặp giao dịch.
- **Thông báo thanh toán đến sau khi phiên QR hết hạn**: Nếu khách hàng chuyển tiền vào thời điểm sau khi đồng hồ 15 phút kết thúc nhưng đơn hàng vẫn ở trạng thái chờ (`pending`) và chưa bị hủy, hệ thống vẫn tự động khớp thanh toán hợp lệ và chuyển đơn hàng sang "Đã thanh toán".
- **Khách hàng điền sai hoặc thiếu nội dung chuyển khoản**: Khách hàng xóa hoặc sửa mã đơn hàng trong nội dung chuyển khoản khi thao tác trên ứng dụng ngân hàng. Hệ thống vẫn lưu giao dịch vào danh sách biến động số dư chưa khớp, hỗ trợ quản trị viên/nhân viên tra cứu theo số tiền và thời gian để gán thủ công vào đúng đơn hàng.
- **Mất kết nối mạng hoặc gián đoạn tunnel ngrok trong môi trường thử nghiệm**: Nếu kết nối giữa SePay và máy chủ thử nghiệm bị ngắt quãng, hệ thống hỗ trợ cơ chế truy vấn trạng thái chủ động thông qua nút "Kiểm tra thanh toán" trên màn hình hoặc kích hoạt cơ chế gửi lại từ cổng thanh toán.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI cung cấp tùy chọn phương thức thanh toán "Chuyển khoản ngân hàng (VietQR qua SePay)" tại bước thanh toán của khách hàng (cả khách đăng nhập và khách vãng lai).
- **FR-002**: Khi khách hàng đặt hàng bằng phương thức chuyển khoản, hệ thống PHẢI tạo đơn hàng với trạng thái đơn hàng ban đầu là "Chờ xử lý" (pending) và trạng thái thanh toán ban đầu là "Chờ thanh toán" (unpaid/pending).
- **FR-003**: Hệ thống PHẢI chuẩn hóa cú pháp nội dung chuyển khoản theo cấu trúc chuẩn: `PETJOY <orderCode>` (chữ hoa, không dấu, ngăn cách bằng khoảng trắng, ví dụ: `PETJOY ORD173000123`) để tối ưu khả năng nhận diện tự động từ SePay và thuận tiện cho việc kiểm tra đối soát thủ công.
- **FR-004**: Hệ thống PHẢI hiển thị giao diện thanh toán bao gồm: Mã VietQR động theo chuẩn thanh toán ngân hàng, Tên ngân hàng, Số tài khoản thụ hưởng, Tên chủ tài khoản, Số tiền chính xác cần chuyển, Nội dung chuyển khoản bắt buộc theo chuẩn `PETJOY <orderCode>`, và các nút thao tác sao chép nhanh dữ liệu.
- **FR-005**: Giao diện thanh toán PHẢI hiển thị đồng hồ đếm ngược thời gian giữ đơn (mặc định 15 phút) và trạng thái hiển thị đang chờ nhận tiền từ ngân hàng.
- **FR-006**: Giao diện người mua PHẢI tự động cập nhật và chuyển sang thông báo thanh toán thành công thông qua cơ chế kết hợp: tự động thăm dò (polling) trạng thái đơn hàng định kỳ mỗi 3 giây trong suốt thời gian hiệu lực của phiên, đồng thời cung cấp nút bấm "Tôi đã chuyển tiền / Kiểm tra trạng thái" để người mua có thể kích hoạt kiểm tra ngay lập tức mà không cần nộp chứng từ.
- **FR-007**: Hệ thống PHẢI cung cấp điểm tiếp nhận thông báo thanh toán (Webhook endpoint) có khả năng tiếp nhận yêu cầu từ SePay qua tunnel công khai (ngrok) trong môi trường kiểm thử và qua tên miền chính thức trong môi trường vận hành.
- **FR-008**: Điểm tiếp nhận thông báo thanh toán PHẢI thực hiện xác thực tính hợp lệ của yêu cầu (chữ ký số, mã khóa bảo mật hoặc mã thông báo xác thực) trước khi tiếp nhận xử lý dữ liệu.
- **FR-009**: Hệ thống PHẢI đối soát tự động mã đơn hàng (theo mẫu `PETJOY <orderCode>`) và số tiền giao dịch: chỉ đánh dấu đơn hàng là "Đã thanh toán" (paid) khi số tiền chuyển khoản thực tế bằng hoặc lớn hơn tổng tiền của đơn hàng (tuân thủ BR-15).
- **FR-010**: Hệ thống PHẢI đảm bảo tính bất biến khi nhận thông báo lặp lại (Idempotency - tuân thủ BR-16), đảm bảo không ghi nhận lặp giao dịch và không làm sai lệch số liệu doanh thu khi cùng một giao dịch được gửi nhiều lần.
- **FR-011**: Hệ thống PHẢI lưu trữ trạng thái thanh toán và bản ghi giao dịch thanh toán độc lập với trạng thái đơn hàng (tuân thủ CR-06), bao gồm mã đơn liên kết, số tiền, trạng thái giao dịch, mã tham chiếu từ ngân hàng/SePay và thời điểm giao dịch.
- **FR-012**: Hệ thống PHẢI ngăn chặn nhân viên xác nhận đơn hàng (Confirm Order) đối với các đơn hàng chuyển khoản trực tuyến nếu trạng thái thanh toán chưa được xác nhận là "Đã thanh toán" (tuân thủ BR-18).
- **FR-013**: Trang quản trị và nhân viên PHẢI hiển thị rõ ràng phương thức thanh toán chuyển khoản, trạng thái thanh toán hiện tại và mã tham chiếu giao dịch ngân hàng của từng đơn hàng.
- **FR-014**: Hệ thống KHÔNG ĐƯỢC để lộ các thông tin bảo mật nhạy cảm (khóa bí mật webhook, thông tin xác thực tài khoản) ra phía giao diện người dùng hoặc trong các phản hồi lỗi công khai (tuân thủ CR-08).
- **FR-015**: Khi phiên thanh toán chuyển khoản hết thời gian đếm ngược (15 phút), hệ thống PHẢI giữ đơn hàng ở trạng thái chờ (`pending`) và cho phép khách hàng thực hiện một trong hai hành động: gia hạn phiên thanh toán bằng cách tạo lại mã VietQR mới (thời hạn 15 phút tiếp theo), hoặc chuyển đổi phương thức thanh toán sang "Thanh toán khi nhận hàng (COD)" mà không làm mất sản phẩm hay mã giảm giá đã áp dụng.
- **FR-016**: Hệ thống PHẢI hỗ trợ cơ chế thanh toán cộng dồn nhiều lần cho một đơn hàng trong trường hợp khách hàng chuyển thiếu tiền: ghi nhận từng giao dịch thanh toán thành công vào lịch sử đơn hàng, cập nhật số tiền còn thiếu trên giao diện, tạo mã VietQR mới tương ứng với số tiền còn thiếu để người mua quét tiếp, và chỉ chuyển trạng thái đơn hàng sang "Đã thanh toán" khi tổng số tiền thực nhận đạt đủ giá trị đơn hàng.
- **FR-017**: Hệ thống PHẢI cung cấp điểm truy vấn trạng thái thanh toán đơn hàng an toàn theo mã đơn hàng, cho phép giao diện khách hàng gọi thăm dò định kỳ (mỗi 3 giây) hoặc theo sự kiện kích hoạt của người dùng với độ trễ thấp và không làm rò rỉ dữ liệu nhạy cảm.
- **FR-018**: Hệ thống PHẢI tự động gắn cờ cảnh báo "Cần đối soát" (`needs_review`) trên đơn hàng và hiển thị nổi bật cho nhân viên trong các trường hợp phát sinh ngoại lệ: khách hàng chuyển thừa tiền so với giá trị đơn hàng, hoặc phát sinh giao dịch chuyển khoản thành công sau khi đơn hàng đã được đổi sang phương thức thanh toán COD.

### Key Entities *(include if feature involves data)*

- **Đơn hàng (Order)**: Thực thể biểu diễn đơn mua sắm của khách hàng. Thuộc tính liên quan đến tính năng bao gồm: mã đơn hàng duy nhất (orderCode), tổng số tiền cần thanh toán (total), số tiền đã thanh toán tích lũy (paidAmount), cờ cảnh báo cần đối soát (needsReview: boolean), phương thức thanh toán đã chọn (paymentMethod = ONLINE), trạng thái đơn hàng (orderStatus), trạng thái thanh toán (paymentStatus: unpaid/pending -> paid), lịch sử thay đổi trạng thái (statusHistory).
- **Giao dịch thanh toán (Payment Transaction)**: Thực thể biểu diễn lần giao dịch tài chính cho đơn hàng (hỗ trợ quan hệ 1 đơn hàng - nhiều giao dịch khi thanh toán cộng dồn). Thuộc tính bao gồm: mã đơn hàng liên kết (orderId), phương thức thanh toán (ONLINE/SePay), số tiền thực tế nhận được trong lần chuyển (amount), trạng thái giao dịch (status: pending, paid, failed), mã tham chiếu giao dịch duy nhất từ cổng thanh toán (transactionRef), dữ liệu kết quả chi tiết phục vụ đối soát (rawResult).
- **Cấu hình thanh toán (Payment Settings)**: Thực thể lưu trữ thông tin tài khoản thụ hưởng của cửa hàng. Thuộc tính bao gồm: trạng thái kích hoạt thanh toán chuyển khoản (bankTransfer: bật/tắt), ngân hàng thụ hưởng, số tài khoản nhận tiền, tên chủ tài khoản, cú pháp nội dung chuyển khoản chuẩn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% đơn hàng lựa chọn phương thức chuyển khoản hiển thị mã VietQR động chính xác cùng thông tin chuyển khoản trong thời gian dưới 2 giây sau khi đặt hàng.
- **SC-002**: Khi người mua chuyển khoản thành công và cổng thanh toán gửi thông báo, hệ thống cập nhật trạng thái đơn hàng thành "Đã thanh toán" và giao diện người dùng phản hồi thành công trong vòng dưới 4 giây (thông qua polling 3 giây hoặc tức thì khi người mua nhấn kiểm tra).
- **SC-003**: 0% trường hợp đơn hàng bị nhân đôi doanh thu hoặc ghi nhận sai lệch trạng thái khi nhận nhiều thông báo thanh toán lặp lại cho cùng một giao dịch.
- **SC-004**: 100% các thao tác xác nhận đơn hàng (Confirm Order) của nhân viên đối với đơn hàng chuyển khoản trực tuyến chưa hoàn tất thanh toán đều bị hệ thống chặn lại với thông báo lý do rõ ràng.
- **SC-005**: Ít nhất 95% khách hàng thực hiện chuyển khoản thành công có thể hoàn tất thanh toán tự động mà không cần liên hệ tổng đài hoặc hỗ trợ thủ công.

## Assumptions

- Cửa hàng sở hữu tài khoản SePay đã liên kết hợp lệ với tài khoản ngân hàng thụ hưởng của doanh nghiệp/chủ cửa hàng.
- Trong môi trường phát triển và kiểm thử cục bộ, công cụ ngrok được sử dụng để cung cấp URL công khai (HTTPS) tiếp nhận các tín hiệu Webhook từ SePay chuyển tiếp về dịch vụ backend cục bộ.
- Mã VietQR được khởi tạo theo đúng quy chuẩn Napas/VietQR hiện hành, tương thích với tất cả các ứng dụng Mobile Banking của các ngân hàng thương mại tại Việt Nam.
- Thời gian đếm ngược giới hạn cho một phiên thanh toán chuyển khoản là 15 phút kể từ thời điểm tạo đơn hàng; người mua có quyền tạo lại mã để gia hạn hoặc đổi sang COD nếu chưa thanh toán kịp.
- Đơn vị tiền tệ giao dịch là Việt Nam Đồng (VND), tính theo số nguyên dương an toàn và không có phần thập phân.
- Trường hợp khách hàng chuyển khoản sai cú pháp nội dung hoặc sai lệch số tiền, hệ thống giữ nguyên trạng thái chờ đối soát thủ công để đảm bảo an toàn tài chính tuyệt đối cho cửa hàng.
