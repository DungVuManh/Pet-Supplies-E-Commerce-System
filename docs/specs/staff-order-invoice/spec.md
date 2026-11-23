# Feature Specification: Staff Xuất Hóa Đơn Đơn Hàng (Staff Order Invoice)

**Feature Branch**: `feature/staff-order-invoice`

**Created**: 2026-11-11

**Status**: Ready

**Input**: User description: "giúp tôi làm tính năng cho phép staff xuất hóa đơn của một đơn hàng nhất định"

## Clarifications

### Session 2026-11-11

- Q: Nhân viên được phép xuất hóa đơn cho đơn hàng ở những trạng thái nào? → A: Chỉ cho phép từ trạng thái **Đã xác nhận** trở lên (`Đã xác nhận`, `Đang xử lý`, `Đang giao`, `Hoàn thành`, bao gồm cả đơn bán tại quầy vốn mặc định là `Hoàn thành`). Chặn đơn đang `Chờ xử lý` (chưa xác nhận), đơn `Đã hủy` và đơn tạo dở chưa hoàn tất.
- Q: Định dạng và thao tác xuất hóa đơn nên theo chuẩn nào? → A: Chỉ sử dụng **một mẫu hóa đơn khổ A4/A5 tiêu chuẩn** — mở trang xem trước chứng từ đồng nhất cho cả đơn trực tuyến và đơn tại quầy, kèm nút thực hiện In ra máy in hoặc Lưu thành tệp PDF.
- Q: Hóa đơn có cần hỗ trợ nhập thông tin xuất hóa đơn công ty / Mã số thuế (VAT) không? → A: Không — đây là **Hóa đơn bán hàng / Phiếu thanh toán nội bộ của cửa hàng**, hiển thị trực tiếp thông tin cửa hàng, đơn hàng, khách hàng, sản phẩm và thanh toán mà không cần biểu mẫu nhập tên công ty hoặc Mã số thuế.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhân viên xem trước và xuất hóa đơn từ chi tiết một đơn hàng (Priority: P1)

Khi nhân viên cửa hàng (Staff) mở màn hình chi tiết của một đơn hàng hợp lệ (bao gồm đơn hàng trực tuyến lẫn đơn hàng bán trực tiếp tại quầy), nhân viên thấy nút thao tác **"Xuất hóa đơn"**. Khi bấm vào nút này, hệ thống mở giao diện xem trước hóa đơn được trình bày rõ ràng, chuyên nghiệp theo chuẩn chứng từ bán lẻ của cửa hàng, từ đó nhân viên có thể thực hiện **In hóa đơn** ra máy in hoặc **Lưu / Xuất tệp hóa đơn** để gửi cho khách hàng hoặc kẹp cùng kiện hàng giao đi.

**Why this priority**: Đây là nhu cầu cốt lõi giúp nhân viên hoàn thiện chứng từ cho từng đơn hàng cụ thể một cách nhanh chóng thay vì phải tổng hợp tay hoặc chụp màn hình trang quản lý nội bộ.

**Independent Test**: Đăng nhập tài khoản Nhân viên, mở chi tiết một đơn hàng hợp lệ, bấm nút "Xuất hóa đơn", kiểm tra hóa đơn hiển thị đầy đủ các khối thông tin theo bố cục chứng từ và thực hiện được thao tác in / tải xuống thành công.

**Acceptance Scenarios**:

1. **Given** nhân viên đang xem chi tiết một đơn hàng đủ điều kiện xuất hóa đơn, **When** nhân viên nhấn nút "Xuất hóa đơn", **Then** hệ thống hiển thị bản hóa đơn hoàn chỉnh cho đúng đơn hàng đó với các thao tác In và Lưu/Xuất tệp rõ ràng.
2. **Given** bản hóa đơn đang hiển thị trên màn hình, **When** nhân viên thực hiện lệnh In hoặc Lưu/Xuất tệp, **Then** các phần tử điều hướng nội bộ của trang quản lý (thanh menu bên, nút quay lại, nút bấm thao tác) được ẩn đi hoàn toàn để bản hóa đơn xuất ra sạch sẽ và chỉn chu.

---

### User Story 2 - Tính toàn vẹn dữ liệu hóa đơn và thông tin giao dịch (Priority: P1)

Mỗi hóa đơn được xuất ra phải phản ánh trung thực 100% dữ liệu đã ghi nhận của đơn hàng tại thời điểm tạo đơn, bao gồm: thông tin định danh cửa hàng, mã đơn hàng, ngày giờ lập đơn theo múi giờ Việt Nam, nhân viên xử lý/tạo đơn (nếu có), thông tin khách hàng & hình thức nhận hàng, danh sách chi tiết từng sản phẩm (tên sản phẩm, mã phân loại/SKU, đơn giá lúc mua, số lượng, thành tiền từng dòng), các khoản khấu trừ khuyến mãi, phí giao hàng, tổng giá trị đơn hàng, phương thức thanh toán và tình trạng thanh toán thực tế.

**Why this priority**: Hóa đơn là chứng từ giao dịch gửi tới khách hàng và phục vụ đối soát tài chính nội bộ; sai lệch đơn giá, số lượng, mã giảm giá hoặc số tiền đã thanh toán sẽ gây khiếu nại và thất thoát đối soát.

**Independent Test**: So sánh từng dòng sản phẩm, đơn giá, khuyến mãi, phí vận chuyển, số tiền đã trả và tổng tiền trên hóa đơn xuất ra với dữ liệu gốc của đơn hàng đó (đặc biệt trên đơn có áp mã giảm giá và đơn bán tại quầy); sau khi sửa giá sản phẩm gốc trong danh mục, mở lại hóa đơn cũ và xác minh đơn giá trên hóa đơn không bị thay đổi.

**Acceptance Scenarios**:

1. **Given** một đơn hàng có nhiều sản phẩm, áp dụng mã giảm giá và phí giao hàng, **When** nhân viên mở hóa đơn của đơn đó, **Then** từng dòng sản phẩm hiển thị đúng tên, mã SKU, đơn giá tại thời điểm mua, số lượng, thành tiền, kèm chi tiết tạm tính, số tiền giảm (hiển thị kèm mã ưu đãi), phí giao hàng và tổng tiền cuối cùng khớp chính xác.
2. **Given** một đơn hàng bán trực tiếp tại quầy và một đơn hàng giao tận nơi trực tuyến, **When** nhân viên xuất hóa đơn cho từng đơn, **Then** đơn tại quầy thể hiện hình thức "Nhận tại cửa hàng" (không hiển thị địa chỉ giao trống), còn đơn trực tuyến thể hiện đầy đủ địa chỉ người nhận và phương thức/trạng thái thanh toán tương ứng.
3. **Given** một đơn hàng đã có thanh toán một phần hoặc toàn phần, **When** nhân viên xuất hóa đơn, **Then** hóa đơn thể hiện rõ số tiền khách đã thanh toán và số tiền còn phải thu (nếu chưa thanh toán đủ).

---

### User Story 3 - Kiểm soát điều kiện xuất hóa đơn và thao tác nhanh từ luồng làm việc của nhân viên (Priority: P2)

Hệ thống kiểm soát chặt chẽ đối tượng được phép xuất hóa đơn và điều kiện hợp lệ của đơn hàng:
- Chỉ nhân viên được ủy quyền hợp lệ mới xem và xuất được hóa đơn đơn hàng; mọi yêu cầu từ khách hàng vãng lai hoặc tài khoản không đúng vai trò đều bị từ chối.
- Chỉ các đơn hàng từ trạng thái **Đã xác nhận trở lên** (`Đã xác nhận`, `Đang xử lý`, `Đang giao`, `Hoàn thành` — gồm cả đơn bán tại quầy vốn mặc định là `Hoàn thành`) mới được xuất hóa đơn; các đơn hàng đang `Chờ xử lý` (chưa xác nhận), `Đã hủy` hoặc đang tạo dở chưa hoàn tất đều bị từ chối xuất hóa đơn kèm thông báo lý do rõ ràng.
- Nhân viên có thể mở nhanh chức năng xuất hóa đơn ngay sau khi hoàn tất tạo đơn hộ khách tại quầy hoặc từ thao tác trên danh sách đơn hàng mà không phải tìm kiếm lại từ đầu.

**Why this priority**: Đảm bảo đúng nghiệp vụ kế toán – vận hành, tránh phát hành hóa đơn cho đơn chưa được xác nhận, đơn đã hủy hoặc chưa hoàn tất, đồng thời rút ngắn số bước thao tác cho nhân viên thu ngân/đóng gói.

**Independent Test**: Thử xuất hóa đơn cho một đơn hàng đang `Chờ xử lý` và một đơn hàng `Đã hủy` để xác minh hệ thống chặn thao tác với thông báo rõ ràng; thử truy cập đường dẫn xuất hóa đơn bằng tài khoản không phải nhân viên để xác minh bị chặn truy cập; thử tạo xong một đơn tại quầy và bấm xuất hóa đơn ngay tại màn hình kết quả.

**Acceptance Scenarios**:

1. **Given** một đơn hàng đang ở trạng thái `Chờ xử lý` hoặc `Đã hủy`, **When** nhân viên xem chi tiết đơn hàng hoặc truy cập chức năng xuất hóa đơn của đơn đó, **Then** hệ thống không cho phép xuất hóa đơn (nút xuất bị vô hiệu hóa hoặc bị chặn) và hiển thị thông báo giải thích lý do rõ ràng.
2. **Given** nhân viên vừa tạo thành công một đơn bán hàng trực tiếp tại quầy (trạng thái `Hoàn thành`) và được chuyển sang trang chi tiết đơn, **When** nhân viên nhấn "Xuất hóa đơn", **Then** hóa đơn khổ chuẩn A4/A5 được mở ngay với đầy đủ thông tin đơn vừa lập để in hoặc lưu PDF giao cho khách.
3. **Given** người dùng chưa đăng nhập hoặc đăng nhập bằng tài khoản không có quyền xử lý đơn hàng, **When** người dùng cố gắng truy cập trang hoặc dữ liệu xuất hóa đơn của một đơn hàng bất kỳ, **Then** hệ thống từ chối cung cấp dữ liệu và điều hướng về trang đăng nhập hoặc thông báo không có quyền.

---

### Edge Cases

- **Đơn hàng ở trạng thái Chờ xử lý hoặc Đã hủy**: Hệ thống không phát hành hóa đơn; trên chi tiết đơn hàng hiển thị thông báo rõ ràng lý do chưa đủ điều kiện (ví dụ: *"Chỉ hỗ trợ xuất hóa đơn cho đơn từ trạng thái Đã xác nhận trở lên"*), và nếu nhân viên truy cập trực tiếp đường dẫn hóa đơn của đơn đó sẽ nhận thông báo từ chối hợp lệ.
- **Thông tin cửa hàng trong phần cài đặt chung chưa được điền đầy đủ**: Nếu tên cửa hàng, địa chỉ hoặc số hotline trong phần cài đặt hệ thống đang bị để trống một phần, hóa đơn vẫn xuất được bình thường bằng giá trị mặc định an toàn của thương hiệu (ví dụ: "Petjoy" cho tên cửa hàng) và ẩn gọn các dòng thông tin liên hệ trống thay vì hiển thị ký tự lỗi hoặc khoảng trắng xấu.
- **Đơn hàng khách lẻ tại quầy hoặc khách vãng lai thiếu email**: Hóa đơn chỉ hiển thị tên và số điện thoại khách hàng, tự động bỏ qua dòng email nếu không có.
- **Đơn hàng có chênh lệch thanh toán (cờ cần đối soát)**: Hóa đơn hiển thị trung thực số tiền đã nhận thực tế và tổng giá trị đơn hàng, kèm ghi chú rõ ràng nếu đơn đang trong trạng thái cần đối soát để nhân viên không giao nhầm chứng từ xác nhận đủ tiền.
- **Đơn hàng có nhiều sản phẩm hoặc tên sản phẩm dài**: Bảng kê hàng hóa trên hóa đơn tự động xuống dòng sạch sẽ cho tên sản phẩm dài và phân trang hợp lý trên khổ A4/A5 khi in/xuất nhiều mặt hàng mà không làm cắt ngang chữ hoặc xô lệch cột tiền.
- **Xuất lại hóa đơn nhiều lần**: Nhân viên có thể mở xem lại và in/xuất lại hóa đơn cho cùng một đơn hàng hợp lệ nhiều lần (ví dụ khi rách giấy in hoặc khách xin lại bản sao) mà không làm thay đổi tồn kho, số liệu doanh thu hay trạng thái đơn hàng, đồng thời hệ thống ghi nhận dấu vết thao tác phục vụ kiểm tra nội bộ.
- **Không tìm thấy đơn hàng hoặc đơn đang tạo dở ở quầy**: Nếu mã định danh đơn hàng không tồn tại hoặc đơn tại quầy đang ở trạng thái treo chưa hoàn tất, hệ thống hiển thị thông báo không tìm thấy đơn hàng và không xuất hóa đơn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI cho phép nhân viên bán hàng đã đăng nhập kích hoạt thao tác **"Xuất hóa đơn"** cho một đơn hàng cụ thể từ trang chi tiết đơn hàng, và hỗ trợ truy cập nhanh từ danh sách đơn hàng.
- **FR-002**: Hệ thống PHẢI kiểm tra quyền hạn trước khi cung cấp dữ liệu hoặc hiển thị hóa đơn; chỉ tài khoản có vai trò Nhân viên được phép xử lý đơn hàng mới có quyền xem và xuất hóa đơn.
- **FR-003**: Hệ thống PHẢI chỉ cho phép xuất hóa đơn đối với các đơn hàng đang ở trạng thái từ **Đã xác nhận trở lên** (`Đã xác nhận`, `Đang xử lý`, `Đang giao`, `Hoàn thành` — bao gồm các đơn bán tại quầy được tạo ở trạng thái hoàn tất).
- **FR-004**: Hệ thống PHẢI chặn thao tác xuất hóa đơn đối với đơn hàng không tồn tại, đơn hàng bán tại quầy chưa hoàn tất ghi nhận, đơn đang ở trạng thái `Chờ xử lý` (chưa xác nhận) hoặc đơn `Đã hủy`, đồng thời hiển thị thông báo lý do rõ ràng cho nhân viên.
- **FR-005**: Bản hóa đơn PHẢI hiển thị đầy đủ thông tin nhận diện cửa hàng lấy từ cấu hình cửa hàng đang hoạt động (tên cửa hàng, địa chỉ, số hotline, email liên hệ) kèm giá trị dự phòng an toàn nếu trường cấu hình còn trống.
- **FR-006**: Bản hóa đơn PHẢI hiển thị đầy đủ thông tin chung của chứng từ: tiêu đề hóa đơn, mã đơn hàng duy nhất, ngày giờ đặt/lập đơn theo múi giờ Việt Nam (`GMT+7`), kênh bán hàng (Trực tuyến / Tại quầy), trạng thái đơn hàng và tên nhân viên thực hiện/xuất hóa đơn.
- **FR-007**: Bản hóa đơn PHẢI hiển thị thông tin khách hàng gồm tên người mua/người nhận, số điện thoại, email (nếu có) và địa chỉ giao hàng đầy đủ đối với đơn trực tuyến hoặc nhãn "Nhận tại cửa hàng" đối với đơn bán tại quầy.
- **FR-008**: Bản hóa đơn PHẢI hiển thị bảng danh sách toàn bộ sản phẩm trong đơn theo đúng dữ liệu đã chốt tại thời điểm đặt hàng: số thứ tự, tên sản phẩm, mã phân loại (SKU), số lượng, đơn giá và thành tiền từng dòng.
- **FR-009**: Bản hóa đơn PHẢI hiển thị phần tổng hợp tài chính chính xác: Tạm tính, Giảm giá kèm mã khuyến mãi đã áp dụng (nếu có), Phí giao hàng, Tổng tiền thanh toán, Phương thức thanh toán, Trạng thái thanh toán, Số tiền đã thanh toán và Số tiền còn phải thu (nếu có).
- **FR-010**: Giao diện xuất hóa đơn PHẢI cung cấp bản xem trước theo **một mẫu chuẩn khổ A4/A5 tiêu chuẩn** thống nhất cho mọi đơn hàng (cả trực tuyến và tại quầy), đi kèm thao tác **In hóa đơn / Lưu tệp PDF** trực tiếp từ bản xem trước.
- **FR-011**: Khi thực hiện in hoặc lưu thành tệp từ giao diện xem trước, hệ thống PHẢI tự động loại bỏ toàn bộ thanh điều hướng, nút thao tác quản trị và cảnh báo nội bộ của trang làm việc, đảm bảo bản xuất chỉ chứa nội dung hóa đơn và có bố cục sạch sẽ trên khổ giấy A4/A5.
- **FR-012**: Bản hóa đơn PHẢI là chứng từ bán hàng / phiếu thanh toán nội bộ của cửa hàng; hệ thống KHÔNG hiển thị hay yêu cầu nhập các trường khai báo hóa đơn thuế GTGT doanh nghiệp (Tên công ty, Mã số thuế, Địa chỉ xuất hóa đơn công ty).
- **FR-013**: Hệ thống PHẢI ghi nhận dấu vết lịch sử mỗi lần nhân viên thực hiện xuất hóa đơn cho một đơn hàng (bao gồm thời điểm xuất, mã đơn hàng và người thực hiện) mà không làm thay đổi trạng thái hay số liệu tài chính/tồn kho của đơn hàng đó.

### Key Entities *(include if feature involves data)*

- **Đơn hàng (Order)**: Nguồn dữ liệu gốc và bất biến để lập hóa đơn, cung cấp mã đơn hàng, thời điểm đặt, kênh bán, thông tin khách hàng/địa chỉ nhận hàng, danh sách sản phẩm đã chốt lúc đặt, các khoản tiền (tạm tính, giảm giá kèm mã ưu đãi, phí vận chuyển, tổng thanh toán, số tiền đã thanh toán), phương thức & trạng thái thanh toán, trạng thái đơn hàng.
- **Thông tin cửa hàng (Store Information)**: Nguồn cung cấp tên cửa hàng, địa chỉ, hotline và email liên hệ hiển thị ở phần đầu hóa đơn.
- **Nhật ký xuất hóa đơn (Invoice Export Record)**: Bản ghi kiểm tra nội bộ ghi nhận sự kiện một nhân viên đã xuất/in hóa đơn cho một đơn hàng tại thời điểm xác định.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% số liệu sản phẩm, đơn giá, khuyến mãi, phí vận chuyển và tổng tiền trên hóa đơn khớp chính xác 100% với thông tin đơn hàng đã lưu (0% sai lệch làm tròn hoặc thay đổi theo giá sản phẩm hiện tại).
- **SC-002**: Nhân viên có thể mở và kích hoạt xuất/in/lưu PDF hóa đơn cho một đơn hàng hợp lệ trong vòng tối đa 2 thao tác bấm từ màn hình chi tiết đơn hàng và hoàn tất hiển thị bản xem trước trong dưới 2 giây.
- **SC-003**: 100% các đơn hàng chưa đủ điều kiện (`Chờ xử lý`, `Đã hủy`, hoặc tạo dở chưa hoàn tất) và 100% yêu cầu từ người dùng không có quyền Nhân viên bị chặn phát hành hóa đơn.
- **SC-004**: 100% các bản hóa đơn sau khi in hoặc xuất ra tệp PDF khổ A4/A5 không bị dính thành phần giao diện điều hướng quản trị và giữ nguyên đầy đủ các cột thông tin không bị mất chữ.

## Assumptions

- Đơn vị tiền tệ sử dụng trên toàn bộ hóa đơn là Việt Nam Đồng (`VND`), hiển thị thống nhất theo quy chuẩn định dạng số của cửa hàng; múi giờ hiển thị ngày giờ là `GMT+7 (Asia/Ho_Chi_Minh)`.
- Giá trị đơn giá sản phẩm trên hóa đơn luôn lấy từ dữ liệu đã chốt trên đơn hàng tại thời điểm mua hàng, không tính lại theo giá bán mới trong danh mục.
- Thao tác xuất hóa đơn chỉ đọc dữ liệu đơn hàng và ghi nhật ký kiểm tra, tuyệt đối không làm thay đổi trạng thái đơn, trạng thái thanh toán hay số lượng tồn kho.
- Mỗi đơn hàng hợp lệ có thể được nhân viên xuất/in lại hóa đơn nhiều lần khi cần thiết (ví dụ in lại bản sao cho khách hoặc phục vụ đóng gói lại).
