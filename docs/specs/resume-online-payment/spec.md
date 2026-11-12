# Feature Specification: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến (Resume Online Payment)

**Feature Branch**: `feature/resume-online-payment`

**Created**: 2026-11-12

**Status**: Ready

**Input**: User description: "hiện tại tính năng thanh toán = chuyển khoản khi người dùng bấm ra ngoài lúc đang hiển thị mã qr thì không có cách nào quay lại , tôi muốn người dùng có thể vào đơn hàng của mình và nếu đơn hàng đó là đơn hàng chọn Thanh toán qua ONLINE thì có nút bấm thanh toán và tiếp thục thanh toán đơn hàng đó"

## Clarifications

### Session 2026-11-12

- Q: Nút "Thanh toán ngay / Tiếp tục thanh toán" cần hiển thị ở những màn hình nào? → A: Chỉ hiển thị trong **màn hình Chi tiết đơn hàng** của tài khoản khách hàng đã đăng nhập (giữ danh sách đơn hàng gọn gàng và không hiển thị tại trang Tra cứu đơn hàng công khai của khách vãng lai).
- Q: Khi người dùng nhấn nút tiếp tục thanh toán, giao diện mã VietQR nên mở theo hình thức nào? → A: Điều hướng sang **màn hình thanh toán VietQR riêng theo đơn hàng** (có đường dẫn độc lập để tải lại trang không mất trạng thái, tận dụng đầy đủ bộ đếm ngược, tự động kiểm tra trạng thái, nút gia hạn mã và tùy chọn chuyển sang COD).
- Q: Khi khách quay lại đơn hàng ONLINE nhưng phiên mã QR 15 phút trước đó đã hết hạn thì xử lý thế nào? → A: **Giữ nguyên mốc hết hạn hiện tại của phiên QR**: nếu vẫn còn trong 15 phút thì tiếp tục đếm ngược phần thời gian còn lại; nếu đã quá 15 phút thì hiển thị trạng thái hết hạn kèm hai lựa chọn **"Tạo lại mã thanh toán"** (gia hạn thêm 15 phút) hoặc **"Chuyển sang thanh toán khi nhận hàng (COD)"**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quay lại thanh toán đơn hàng chuyển khoản từ trang chi tiết đơn hàng (Priority: P1)

Khi khách hàng đã đăng nhập đặt đơn với phương thức **Thanh toán trực tuyến / Chuyển khoản ngân hàng (ONLINE)** nhưng vô tình đóng trang, quay lại trang trước, thoát khỏi màn hình mã VietQR hoặc gặp gián đoạn trước khi hoàn tất chuyển tiền, đơn hàng vẫn tồn tại ở trạng thái chưa thanh toán. Khi khách hàng truy cập vào **màn hình Chi tiết đơn hàng** trong mục "Đơn hàng của tôi", hệ thống nhận diện đây là đơn thanh toán `ONLINE` chưa thanh toán và chưa bị hủy, từ đó hiển thị rõ ràng nút **"Thanh toán ngay"** (hoặc **"Tiếp tục thanh toán"**).

Khi khách hàng nhấn nút này, hệ thống điều hướng sang **màn hình thanh toán VietQR của chính đơn hàng đó** (với đường dẫn ổn định để người dùng có thể làm mới trang mà không mất phiên thanh toán) và hiển thị đầy đủ thông tin chuyển khoản kèm mã VietQR chính xác để khách hàng hoàn tất thanh toán mà không phải đặt lại đơn mới.

**Why this priority**: Đây là điểm nghẽn trực tiếp gây mất đơn hàng và trải nghiệm gián đoạn khi người mua lỡ thoát khỏi màn hình mã QR sau bước đặt hàng.

**Independent Test**: Tạo một đơn hàng chọn phương thức thanh toán `ONLINE`, thoát khỏi màn hình QR ngay sau khi đặt, sau đó vào lại đơn hàng đó, nhấn nút thanh toán và quét mã hoàn tất giao dịch để xác minh trạng thái đơn chuyển sang "Đã thanh toán".

**Acceptance Scenarios**:

1. **Given** người mua có một đơn hàng chọn phương thức `ONLINE` với tình trạng chưa thanh toán và chưa bị hủy, **When** người mua mở thông tin đơn hàng của mình, **Then** hệ thống hiển thị rõ tình trạng chờ thanh toán cùng nút **"Thanh toán ngay"** (hoặc **"Tiếp tục thanh toán"**) nổi bật và dễ nhận biết.
2. **Given** nút tiếp tục thanh toán đang hiển thị trên đơn hàng hợp lệ, **When** người mua nhấn nút này, **Then** hệ thống hiển thị lại thông tin tài khoản thụ hưởng, số tiền cần chuyển đúng của đơn hàng, nội dung chuyển khoản chuẩn `PETJOY <mã đơn>` và mã VietQR tương ứng cùng cơ chế tự động cập nhật trạng thái khi tiền về.
3. **Given** người mua vừa thanh toán thành công qua luồng quay lại này, **When** giao dịch được xác nhận hoàn tất, **Then** giao diện cập nhật ngay sang trạng thái "Đã thanh toán", dừng quét mã QR và cho phép quay về chi tiết đơn hàng với trạng thái thanh toán mới.

---

### User Story 2 - Đồng bộ điều kiện hiển thị nút thanh toán theo trạng thái đơn hàng và số tiền (Priority: P1)

Không phải mọi đơn hàng đều cho phép tiếp tục thanh toán. Hệ thống chỉ hiển thị nút thanh toán khi đơn hàng thực sự thỏa mãn toàn bộ điều kiện hợp lệ:
- Phương thức thanh toán hiện tại là `ONLINE`.
- Trạng thái thanh toán chưa hoàn tất (bao gồm chưa thanh toán, đang chờ thanh toán hoặc mới thanh toán một phần còn thiếu tiền).
- Đơn hàng chưa bị hủy.

Đối với đơn hàng đã thanh toán đủ, đơn hàng chọn phương thức COD (hoặc đã chuyển từ ONLINE sang COD), hoặc đơn hàng đã hủy, nút tiếp tục thanh toán **không được hiển thị** để tránh người mua chuyển tiền nhầm nhiều lần. Với đơn hàng đã chuyển khoản thiếu một phần tiền, hệ thống phải hiển thị rõ số tiền đã nhận, số tiền còn thiếu và khi bấm tiếp tục thanh toán chỉ tạo mã QR cho **phần tiền còn thiếu**.

**Why this priority**: Ngăn ngừa triệt để tình trạng khách hàng chuyển khoản nhầm cho đơn đã hủy, đơn đã thanh toán xong hoặc đơn đã chuyển sang trả tiền mặt COD.

**Independent Test**: Mở lần lượt các đơn hàng: (a) ONLINE chưa thanh toán, (b) ONLINE thanh toán thiếu một phần, (c) ONLINE đã thanh toán đủ, (d) COD, (e) ONLINE đã hủy; kiểm tra nút thanh toán chỉ xuất hiện ở (a) và (b), đồng thời số tiền trên QR của (b) bằng đúng phần tiền còn thiếu.

**Acceptance Scenarios**:

1. **Given** một đơn hàng `ONLINE` đã được xác nhận thanh toán đủ hoặc đã bị hủy hoặc là đơn COD, **When** người mua xem danh sách hoặc chi tiết đơn hàng, **Then** hệ thống không hiển thị nút tiếp tục thanh toán.
2. **Given** một đơn hàng `ONLINE` tổng 500.000 đ đã ghi nhận thanh toán trước 200.000 đ (còn thiếu 300.000 đ), **When** người mua mở đơn hàng và bấm tiếp tục thanh toán, **Then** màn hình thanh toán hiển thị số tiền đã trả (200.000 đ), số tiền còn thiếu (300.000 đ) và mã VietQR có số tiền mặc định là 300.000 đ.

---

### User Story 3 - Xử lý phiên thanh toán quá hạn hoặc bị thay đổi trong lúc khách rời màn hình (Priority: P2)

Vì khách hàng có thể quay lại chi tiết đơn hàng sau vài phút hoặc hàng giờ kể từ lúc đặt đơn, phiên mã QR trước đó có thể đã vượt quá thời gian giữ phiên (mặc định 15 phút) hoặc đơn hàng có thể vừa được hủy/đổi sang COD/đã nhận được chuyển khoản trước đó từ tab khác. Khi khách hàng bấm tiếp tục thanh toán, hệ thống **giữ nguyên mốc hết hạn hiện tại của phiên QR**: nếu còn thời gian hiệu lực thì đếm ngược tiếp phần thời gian còn lại; nếu đã quá 15 phút thì hiển thị trạng thái hết hạn kèm hai lựa chọn **"Tạo lại mã thanh toán"** (gia hạn thêm 15 phút) hoặc **"Chuyển sang thanh toán khi nhận hàng (COD)"**.

Nếu trong lúc người dùng mở lại giao diện thanh toán mà đơn hàng thực chất đã chuyển sang trạng thái "Đã thanh toán", "Đã đổi sang COD" hoặc "Đã hủy", hệ thống phải lập tức đồng bộ trạng thái thực tế mới nhất và thông báo rõ ràng thay vì hiển thị mã QR cũ.

**Why this priority**: Đảm bảo trải nghiệm liền mạch, minh bạch khi người dùng quay lại trễ hoặc mở đơn hàng từ nhiều thiết bị cùng lúc.

**Independent Test**: Tạo đơn `ONLINE`, chờ hoặc giả lập phiên thanh toán quá 15 phút rồi mở lại từ trang chi tiết đơn hàng để xác minh giao diện hiển thị trạng thái hết hạn kèm nút tạo lại mã / đổi sang COD; đồng thời thử truy cập lại màn hình thanh toán khi đơn hàng vừa đổi sang Đã hủy, Đã thanh toán hoặc COD.

**Acceptance Scenarios**:

1. **Given** một đơn hàng `ONLINE` chưa thanh toán vẫn còn trong thời hạn 15 phút, **When** người mua rời màn hình QR rồi quay lại nhấn tiếp tục thanh toán từ trang chi tiết đơn hàng, **Then** hệ thống giữ tiếp đồng hồ đếm ngược ở phần thời gian còn lại và hiển thị mã VietQR sẵn sàng để quét ngay.
2. **Given** một đơn hàng `ONLINE` chưa thanh toán có phiên QR 15 phút đã hết hạn trước khi người mua quay lại, **When** người mua nhấn tiếp tục thanh toán từ trang chi tiết đơn hàng, **Then** hệ thống hiển thị rõ thông báo mã thanh toán đã hết hạn kèm nút **"Tạo lại mã thanh toán"** (gia hạn thêm 15 phút) và **"Chuyển sang thanh toán khi nhận hàng (COD)"** mà không khóa mất đơn hàng.
3. **Given** khách hàng lưu lại đường dẫn hoặc đang mở màn hình thanh toán của một đơn hàng đã chuyển sang trạng thái Đã hủy, Đã thanh toán đủ hoặc đã đổi sang COD, **When** khách hàng mở lại hoặc tải lại màn hình thanh toán, **Then** hệ thống không hiển thị mã QR cho chuyển tiền tiếp mà thông báo rõ trạng thái hiện tại của đơn hàng kèm lối quay về trang chi tiết đơn hàng.

---

### Edge Cases

- **Người dùng tự hủy đơn hàng hoặc nhân viên hủy đơn ngay trước khi người dùng bấm thanh toán**: Hệ thống kiểm tra trạng thái mới nhất khi mở màn hình thanh toán; nếu đơn đã ở trạng thái `Đã hủy`, chặn không cho tạo/hiển thị mã QR thanh toán và hiển thị thông báo đơn hàng đã hủy.
- **Người dùng mở cùng lúc hai cửa sổ (tab)**: Khách thanh toán xong ở tab A trong lúc tab B vẫn đang ở chi tiết đơn hàng và bấm nút "Thanh toán ngay". Hệ thống nhận biết đơn đã được thanh toán đủ, tự động hiển thị trạng thái "Đơn hàng này đã được thanh toán hoàn tất" thay vì mở lại mã QR.
- **Đơn hàng đã chuyển sang phương thức COD ở màn hình trước đó**: Trên trang đơn hàng, phương thức đã là COD nên nút thanh toán chuyển khoản không còn xuất hiện; nếu truy cập qua đường dẫn cũ, hệ thống báo đơn đã chuyển sang COD.
- **Khách bấm ra ngoài trước khi tải xong hoặc làm mới trang (F5) trong khi đang thanh toán lại**: Trang thanh toán vẫn giữ đúng ngữ cảnh đơn hàng đó và tải lại được thông tin mã QR hiện hành, không bị mất trạng thái như khi chỉ dựa vào dữ liệu tạm thời một lần.
- **Khách đăng nhập cố truy cập luồng thanh toán của đơn hàng thuộc tài khoản khác**: Đối với đơn hàng gắn tài khoản khách hàng trong "Đơn hàng của tôi", chỉ chủ sở hữu đơn hàng mới thấy nút và thao tác tiếp tục thanh toán trên trang cá nhân; thông tin nhạy cảm của người mua khác không bị lộ.
- **Thông tin tài khoản ngân hàng nhận tiền chưa sẵn sàng hoặc gián đoạn kết nối tạm thời**: Hiển thị thông báo lỗi thân thiện kèm nút thử lại, giữ nguyên đơn hàng mà không làm sai lệch số tiền hoặc trạng thái đơn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tại màn hình Chi tiết đơn hàng của tài khoản khách hàng đã đăng nhập, đối với mọi đơn hàng thỏa đồng thời các điều kiện: phương thức thanh toán là `ONLINE`, trạng thái thanh toán chưa hoàn tất (chưa thanh toán / thanh toán thiếu), và trạng thái đơn hàng chưa bị hủy, hệ thống PHẢI hiển thị nút hành động rõ ràng **"Thanh toán ngay"** (hoặc **"Tiếp tục thanh toán"**).
- **FR-002**: Hệ thống KHÔNG đặt nút tiếp tục thanh toán trực tiếp trên bảng Danh sách "Đơn hàng của tôi" và không hiển thị trên Trang Tra cứu đơn hàng công khai của khách vãng lai; khách hàng đã đăng nhập truy cập vào màn hình Chi tiết đơn hàng để thực hiện thanh toán tiếp.
- **FR-003**: Hệ thống KHÔNG ĐƯỢC hiển thị nút tiếp tục thanh toán cho đơn hàng đã thanh toán đủ, đơn hàng có phương thức thanh toán là `COD`, hoặc đơn hàng ở trạng thái `Đã hủy`.
- **FR-004**: Khi người mua nhấn nút tiếp tục thanh toán từ Chi tiết đơn hàng, hệ thống PHẢI điều hướng sang màn hình thanh toán VietQR riêng theo đơn hàng (có đường dẫn ổn định) và tự động tải lại đúng dữ liệu thanh toán mới nhất của đơn hàng đó (số tiền cần chuyển còn lại, thông tin ngân hàng thụ hưởng, nội dung chuyển khoản `PETJOY <mã đơn hàng>`, mã QR).
- **FR-005**: Đối với đơn hàng đã thanh toán một phần, màn hình chi tiết đơn hàng và màn hình tiếp tục thanh toán PHẢI hiển thị rõ số tiền đã thanh toán và số tiền còn thiếu, đồng thời mã VietQR sinh ra chỉ mang đúng giá trị số tiền còn thiếu.
- **FR-006**: Hệ thống PHẢI cho phép khách hàng tải lại trang hoặc quay lại từ lịch sử trình duyệt khi đang ở màn hình tiếp tục thanh toán mà không bị mất thông tin đơn hàng hay lỗi thiếu dữ liệu phiên mua hàng trước đó, kèm liên kết rõ ràng quay về lại Chi tiết đơn hàng.
- **FR-007**: Giao diện tiếp tục thanh toán PHẢI giữ đầy đủ các tính năng cốt lõi của luồng chuyển khoản SePay: sao chép nhanh thông tin chuyển khoản, đồng hồ đếm ngược, tự động kiểm tra trạng thái thanh toán định kỳ, nút kiểm tra trạng thái thủ công, tùy chọn gia hạn phiên thanh toán và tùy chọn chuyển sang thanh toán COD (nếu vẫn đang ở trạng thái chờ thanh toán).
- **FR-008**: Hệ thống PHẢI kiểm tra lại tính hợp lệ của đơn hàng khi truy xuất thông tin thanh toán: nếu đơn hàng đã chuyển sang `Đã hủy`, `Đã thanh toán đủ`, hoặc không phải phương thức `ONLINE`, hệ thống PHẢI ngừng cung cấp mã QR chuyển khoản và thông báo trạng thái thực tế cho người mua.
- **FR-009**: Khi người mua mở lại màn hình thanh toán, hệ thống PHẢI giữ nguyên mốc hết hạn hiện tại của phiên QR 15 phút: nếu còn hạn thì tiếp tục đếm ngược phần thời gian còn lại; nếu đã quá hạn thì hiển thị thông báo hết hạn kèm tùy chọn **"Tạo lại mã thanh toán"** (+15 phút) hoặc **"Chuyển sang thanh toán khi nhận hàng (COD)"**.
- **FR-010**: Trên màn hình Chi tiết đơn hàng của khách hàng, hệ thống PHẢI hiển thị đầy đủ và chính xác tên phương thức thanh toán (`Chuyển khoản trực tuyến / VietQR` hoặc `COD`) cùng trạng thái thanh toán dễ hiểu (`Chờ thanh toán`, `Thanh toán một phần`, `Đã thanh toán`).
- **FR-011**: Mọi thao tác xem chi tiết đơn hàng, mở lại thanh toán hoặc chuyển đổi sang COD từ màn hình Chi tiết đơn hàng PHẢI đảm bảo kiểm tra đúng quyền sở hữu đơn hàng của tài khoản khách hàng đang đăng nhập, không làm rò rỉ thông tin giao hàng hay thông tin tài khoản của khách hàng khác.

### Key Entities *(include if feature involves data)*

- **Đơn hàng (Order)**: Chứa phương thức thanh toán (`ONLINE` hoặc `COD`), trạng thái xử lý đơn hàng (Chờ xử lý, Đã hủy, v.v.), trạng thái thanh toán (Chưa thanh toán, Đang chờ thanh toán, Đã thanh toán, Thất bại), tổng giá trị đơn hàng, tổng số tiền đã nhận thực tế và mốc thời gian hết hạn của phiên thanh toán hiện tại.
- **Thông tin thanh toán trực tuyến (Online Payment Session)**: Dữ liệu phục vụ hiển thị VietQR cho một đơn hàng `ONLINE` đang chờ thu tiền, gồm số tiền còn cần thanh toán (Tổng giá trị đơn hàng trừ Số tiền đã nhận), nội dung chuyển khoản chuẩn `PETJOY <mã đơn hàng>`, thông tin ngân hàng thụ hưởng, trạng thái phiên còn hạn hay hết hạn và số giây/phút hiệu lực còn lại.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% đơn hàng `ONLINE` chưa thanh toán và chưa hủy hiển thị nút **"Thanh toán ngay / Tiếp tục thanh toán"** rõ ràng giúp người mua quay lại đúng màn hình mã QR chỉ với 1 lần nhấn từ đơn hàng của mình.
- **SC-002**: 100% đơn hàng đã thanh toán đủ, đơn COD hoặc đơn đã hủy không còn hiển thị nút thanh toán chuyển khoản và không thể mở mã QR chuyển tiền nhầm.
- **SC-003**: Thời gian từ lúc người mua nhấn "Thanh toán ngay" đến khi thấy mã VietQR và thông tin chuyển khoản chính xác đạt dưới 2 giây trong điều kiện mạng bình thường.
- **SC-004**: 100% trường hợp thanh toán thành công qua luồng quay lại này cập nhật trạng thái đơn hàng thành "Đã thanh toán" tự động như lần đặt hàng ban đầu, giúp giảm tỷ lệ đơn hàng bị bỏ dở do khách vô tình đóng màn hình QR.

## Assumptions

- Hạ tầng thanh toán VietQR qua SePay (tạo QR động, webhook đối soát tự động, kiểm tra trạng thái định kỳ, gia hạn phiên 15 phút, chuyển đổi sang COD và cộng dồn thanh toán thiếu) đã được xây dựng và vận hành ổn định theo đặc tả `sepay-transfer-payment`.
- Chỉ áp dụng cho đơn hàng đặt trực tuyến có phương thức `ONLINE` qua cổng chuyển khoản ngân hàng SePay/VietQR; đơn hàng mua tại quầy (POS) đã thu tiền trực tiếp tại quầy không nằm trong phạm vi quay lại thanh toán từ tài khoản khách hàng.
- Nếu khách hàng muốn hủy hoàn toàn đơn hàng chưa thanh toán thay vì thanh toán tiếp hoặc đổi COD, thao tác hủy đơn hiện có tại trang chi tiết đơn hàng vẫn được giữ nguyên.
