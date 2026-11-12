# Feature Specification: Yêu Cầu Hoàn Trả Đơn Hàng & Duyệt Hoàn Đơn (Order Returns)

**Feature Branch**: `feature/order-returns`

**Created**: 2026-11-12

**Status**: Ready

**Input**: User description: "tôi muốn thực hiện chức năng cho phép khách hàng hoàn đơn hàng như sau : hiện tại khi staff đã chuyển sang trạng thái đơn hàng đang giao thì ở khách hàng mới đang có nút bấm " đã nhận được hàng" tôi muốn có thêm nút "hoàn trả hàng" khi bấm vào thì bắt đầu luồng hoàn trả hàng như sau : chọn lý do (hàng có vấn đề / chưa nhận được hàng , thiếu hàng) nhập mô tả và thêm hình ảnh (sử dụng cloudinary để lưu hình ảnh ) sau đó gửi yêu cầu , tiếp theo staff sẽ có màn hình quản lý các yêu cầu hoàn trả hàng , mở lên và kiểm tra xem có chấp nhận nhận lại đơn hàng hoặc là từ chối và đưa ra lý do."

## Clarifications

### Session 2026-11-12

- Q: Nút "Hoàn trả hàng" hiển thị ở trạng thái đơn hàng nào và ảnh minh chứng có bắt buộc theo từng lý do không? → A: Chỉ hiển thị nút **"Hoàn trả hàng"** khi đơn đang ở trạng thái **"Đang giao"**; **bắt buộc tối thiểu 1 ảnh** đối với lý do *"Hàng có vấn đề"* hoặc *"Thiếu hàng"*, còn với *"Chưa nhận được hàng"* thì ảnh là **tùy chọn** (tối đa 5 ảnh).
- Q: Khi Staff Chấp nhận hoàn trả, đơn hàng chính, tồn kho và hoàn tiền được xử lý thế nào? → A: Chuyển đơn hàng sang trạng thái riêng **"Đã hoàn trả"** (tách biệt khỏi đơn hủy thường và không tính vào doanh thu Hoàn thành), **tự động hoàn lại tồn kho** của sản phẩm trong đơn, và với đơn đã thanh toán `ONLINE` đánh dấu rõ **"Cần hoàn tiền"** để nhân viên đối soát hoàn tiền cho khách.
- Q: Sau khi Staff Từ chối hoàn trả kèm lý do, khách hàng có được gửi lại yêu cầu nữa không? → A: Mỗi đơn hàng chỉ gửi **1 yêu cầu hoàn trả duy nhất** — nếu Staff từ chối, hiển thị rõ lý do từ chối trên Chi tiết đơn hàng, nút **"Đã nhận được hàng"** hoạt động lại bình thường và không cho gửi lại yêu cầu hoàn trả khác.

### Session 2026-11-13 (Cập nhật Gộp lý do & Bổ sung Tài khoản ngân hàng hoàn tiền)

- Q: Gộp nhóm lý do hoàn trả như thế nào? → A: Gộp *"Hàng có vấn đề"* và *"Thiếu hàng"* thành 1 lựa chọn duy nhất: **"Hàng có vấn đề hoặc thiếu hàng"** (`damaged_or_missing`). Form chỉ còn 2 lựa chọn:
  1. **Hàng có vấn đề hoặc thiếu hàng**: Bắt buộc tối thiểu 1 ảnh minh chứng (tối đa 5 ảnh).
  2. **Chưa nhận được hàng**: Ảnh minh chứng là tùy chọn (0–5 ảnh).
  (Hệ thống backend duy trì tương thích ngược với các đơn đã lưu bằng các mã lý do cũ).
- Q: Thông tin tài khoản ngân hàng để hoàn trả tiền gồm những trường nào và hiển thị ở đâu? → A: Trong biểu mẫu hoàn trả của khách hàng, bổ sung mục **Thông tin tài khoản nhận tiền hoàn**:
  - **Tên ngân hàng**: Tên ngân hàng nhận tiền (vd: Vietcombank, MB Bank, Techcombank, VPBank, ACB...).
  - **Số tài khoản**: Số tài khoản ngân hàng hợp lệ (chuỗi số từ 6–30 ký tự).
  - **Tên chủ tài khoản**: Tên in hoa của chủ tài khoản (2–100 ký tự).
  Thông tin này được lưu vào `returnRequest.bankAccount` và hiển thị nổi bật trên màn hình Staff tại chi tiết yêu cầu hoàn trả (`ReturnDecisionPanel`) để nhân viên/kế toán chuyển khoản hoàn tiền chính xác cho khách hàng.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khách hàng gửi yêu cầu hoàn trả hàng kèm lý do, tài khoản ngân hàng nhận hoàn tiền, mô tả và hình ảnh minh chứng (Priority: P1)

Khi đơn hàng trực tuyến của khách hàng đã đăng nhập đang ở trạng thái **"Đang giao"** (và chưa từng gửi yêu cầu hoàn trả trước đó), tại trang Chi tiết đơn hàng bên cạnh nút **"Đã nhận được hàng"**, hệ thống hiển thị thêm nút **"Hoàn trả hàng"**.

Khi khách hàng nhấn **"Hoàn trả hàng"**, hệ thống mở luồng tạo yêu cầu hoàn trả gồm các bước/trường thông tin rõ ràng:
1. Chọn lý do hoàn trả từ 2 nhóm tinh gọn:
   - **Hàng có vấn đề hoặc thiếu hàng** (gộp lỗi sản phẩm, bể vỡ, sai mẫu, hoặc thiếu phụ kiện, thiếu hàng).
   - **Chưa nhận được hàng** (đơn hàng giao trễ hạn nhưng khách chưa nhận được).
2. Nhập thông tin tài khoản ngân hàng nhận tiền hoàn (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản) để nhân viên có căn cứ chuyển khoản hoàn tiền lại cho khách hàng.
3. Nhập mô tả chi tiết tình trạng gặp phải (tối thiểu 10 ký tự).
4. Đính kèm hình ảnh minh chứng thực tế (tối đa 5 ảnh lưu trữ tập trung trên Cloudinary): **bắt buộc tối thiểu 1 ảnh** nếu chọn *"Hàng có vấn đề hoặc thiếu hàng"*, và **tùy chọn** nếu chọn *"Chưa nhận được hàng"*.
5. Xác nhận gửi yêu cầu.

Sau khi gửi thành công, yêu cầu chuyển sang trạng thái **"Chờ xử lý"**; giao diện Chi tiết đơn hàng của khách hàng cập nhật hiển thị trạng thái yêu cầu hoàn trả để theo dõi (kèm thông tin tài khoản đã gửi), đồng thời tạm khóa nút "Đã nhận được hàng" và nút "Hoàn trả hàng" trong lúc nhân viên đang xem xét.

**Why this priority**: Cung cấp cho khách hàng kênh phản hồi có bằng chứng hình ảnh và thông tin tài khoản ngân hàng nhận hoàn tiền ngay trên đơn hàng khi gặp sự cố giao nhận, giúp quá trình đối soát và hoàn tiền không bị gián đoạn.

**Independent Test**: Đăng nhập tài khoản khách hàng sở hữu một đơn đang ở trạng thái "Đang giao", nhấn "Hoàn trả hàng", chọn lý do "Hàng có vấn đề hoặc thiếu hàng", nhập thông tin ngân hàng hợp lệ, nhập mô tả, đính kèm hình ảnh hợp lệ và gửi yêu cầu; xác minh yêu cầu được lưu với thông tin ngân hàng và hình ảnh hiển thị lại đúng trên chi tiết đơn hàng và ở trạng thái "Chờ xử lý".

**Acceptance Scenarios**:

1. **Given** khách hàng đang xem Chi tiết đơn hàng đủ điều kiện hoàn trả (chưa có yêu cầu hoàn trả đang chờ xử lý), **When** khách hàng nhấn nút **"Hoàn trả hàng"**, **Then** hệ thống hiển thị biểu mẫu yêu cầu hoàn trả với 2 lựa chọn lý do (*Hàng có vấn đề hoặc thiếu hàng*, *Chưa nhận được hàng*), khu vực nhập thông tin tài khoản ngân hàng nhận hoàn tiền, ô nhập mô tả và khu vực tải hình ảnh minh chứng.
2. **Given** khách hàng đã chọn lý do, nhập thông tin tài khoản ngân hàng, nhập mô tả hợp lệ và tải lên hình ảnh hợp lệ (hoặc bỏ trống nếu thuộc trường hợp không bắt buộc), **When** khách hàng nhấn **"Gửi yêu cầu hoàn trả"**, **Then** hệ thống lưu giữ hình ảnh an toàn trên Cloudinary, lưu thông tin tài khoản ngân hàng, ghi nhận yêu cầu ở trạng thái **"Chờ xử lý"** và hiển thị tóm tắt yêu cầu đã gửi ngay trên trang Chi tiết đơn hàng.
3. **Given** một đơn hàng đang có yêu cầu hoàn trả ở trạng thái **"Chờ xử lý"**, **When** hệ thống kiểm tra tự động hoàn thành sau 3 ngày giao hàng, **Then** đơn hàng này **không bị tự động chuyển sang Hoàn thành** trong lúc yêu cầu hoàn trả chưa được nhân viên xử lý.

---

### User Story 2 - Nhân viên (Staff) quản lý, xem chi tiết, thông tin tài khoản hoàn tiền và phê duyệt hoặc từ chối yêu cầu hoàn trả (Priority: P1)

Trong khu vực làm việc của nhân viên (Staff), hệ thống bổ sung màn hình **Quản lý yêu cầu hoàn trả hàng** (hiển thị danh sách yêu cầu hoàn trả với trạng thái, mã đơn hàng, tên khách hàng, lý do hoàn trả, thời điểm gửi và bộ lọc nhanh theo trạng thái *Chờ xử lý / Đã chấp nhận / Đã từ chối*).

Khi nhân viên mở chi tiết một yêu cầu hoàn trả, màn hình hiển thị đầy đủ thông tin đơn hàng liên kết, lý do khách chọn, toàn bộ nội dung mô tả, **thư viện hình ảnh minh chứng** (cho phép phóng to xem rõ từng ảnh), và **Thông tin tài khoản ngân hàng nhận tiền hoàn** của khách hàng (Tên ngân hàng, Số tài khoản, Chủ tài khoản). Nhân viên kiểm tra thực tế và thực hiện một trong hai quyết định đối với yêu cầu đang *"Chờ xử lý"*:
- **Chấp nhận hoàn trả**: Yêu cầu chuyển sang trạng thái **"Đã chấp nhận"**, đơn hàng chính chuyển sang trạng thái **"Đã hoàn trả"** (tách biệt với đơn hủy thông thường và không tính vào doanh thu Hoàn thành), hệ thống **tự động cộng lại tồn kho** của các sản phẩm trong đơn; với đơn hàng đã thanh toán trực tuyến (`ONLINE`) hoặc có thông tin ngân hàng hợp lệ, hệ thống đánh dấu rõ trạng thái **"Cần hoàn tiền"** và hiển thị đầy đủ số tài khoản ngân hàng để nhân viên/kế toán thực hiện chuyển khoản đối soát trả tiền cho khách hàng.
- **Từ chối hoàn trả**: Bắt buộc nhập **lý do từ chối** rõ ràng rồi xác nhận; yêu cầu chuyển sang **"Đã từ chối"** và hiển thị lý do từ chối trên Chi tiết đơn hàng của khách hàng. Mỗi đơn hàng chỉ gửi 1 yêu cầu duy nhất nên khách không gửi lại yêu cầu khác, đồng thời nút **"Đã nhận được hàng"** hoạt động lại bình thường và đơn hàng quay lại chu trình giao/hoàn thành thông thường.

**Why this priority**: Hoàn thiện vòng khép kín giữa người mua và bộ phận vận hành, giúp nhân viên kiểm chứng bằng chứng hình ảnh và có ngay thông tin tài khoản chuyển tiền để ra quyết định và hoàn tiền nhanh chóng.

**Independent Test**: Đăng nhập tài khoản nhân viên, mở màn hình Quản lý yêu cầu hoàn trả, mở một yêu cầu đang "Chờ xử lý", kiểm tra xem được ảnh minh chứng từ Cloudinary và khối thông tin tài khoản ngân hàng hoàn tiền của khách hàng; thực hiện Chấp nhận hoặc Từ chối kèm lý do và xác minh luồng chuyển tiếp hoạt động chuẩn xác.

**Acceptance Scenarios**:

1. **Given** nhân viên đang ở khu vực quản lý của Staff, **When** nhân viên truy cập mục **Yêu cầu hoàn trả**, **Then** danh sách yêu cầu hiển thị đầy đủ với bộ lọc trạng thái (*Tất cả*, *Chờ xử lý*, *Đã chấp nhận*, *Đã từ chối*) và liên kết mở chi tiết từng yêu cầu.
2. **Given** nhân viên mở một yêu cầu hoàn trả đang ở trạng thái *"Chờ xử lý"*, **When** nhân viên xem chi tiết, **Then** hệ thống hiển thị rõ ràng thông tin tài khoản ngân hàng của khách (Tên ngân hàng, Số tài khoản, Chủ tài khoản) cùng với lý do, mô tả và ảnh minh chứng.
3. **Given** nhân viên mở một yêu cầu hoàn trả đang ở trạng thái *"Chờ xử lý"*, **When** nhân viên chọn **"Chấp nhận hoàn trả"** và xác nhận, **Then** yêu cầu chuyển sang trạng thái **"Đã chấp nhận"**, ghi nhận người xử lý và thời gian xử lý, đồng thời cập nhật trạng thái đơn hàng/tồn kho/hoàn tiền đúng theo quy tắc nghiệp vụ đã chốt.
4. **Given** nhân viên mở một yêu cầu hoàn trả đang ở trạng thái *"Chờ xử lý"*, **When** nhân viên chọn **"Từ chối hoàn trả"** mà để trống lý do, **Then** hệ thống yêu cầu phải nhập lý do từ chối trước khi gửi; khi nhập đủ lý do hợp lệ và xác nhận, yêu cầu chuyển sang **"Đã từ chối"** và hiển thị lý do từ chối cho khách hàng trên Chi tiết đơn hàng.

---

### User Story 3 - Kiểm soát an toàn tệp ảnh, phân quyền và tính nhất quán dữ liệu hoàn trả (Priority: P2)

Hệ thống bảo đảm quy trình tải ảnh và xử lý yêu cầu hoàn trả an toàn, nhất quán:
- Tệp hình ảnh minh chứng được kiểm tra định dạng hợp lệ (chỉ nhận ảnh phổ biến như JPG, PNG, WEBP), giới hạn kích thước và số lượng ảnh tối đa mỗi yêu cầu, tránh tải tệp độc hại hoặc quá nặng.
- Chỉ chính khách hàng sở hữu đơn hàng mới được xem biểu mẫu và gửi yêu cầu hoàn trả cho đơn của mình; chỉ nhân viên (Staff) được ủy quyền mới truy cập và duyệt/từ chối trên màn hình quản lý hoàn trả.
- Nếu yêu cầu đã được duyệt hoặc từ chối trước đó (hoặc khách hàng đã bấm "Đã nhận được hàng" ngay trước khi Staff thao tác), mọi thao tác ghi đè lặp lại phải bị chặn an toàn.

**Why this priority**: Ngăn ngừa lạm dụng upload, lộ thông tin đơn hàng giữa các khách hàng hoặc sai lệch trạng thái khi thao tác đồng thời.

**Independent Test**: Thử tải tệp không phải ảnh hoặc vượt quá dung lượng cho phép; thử dùng tài khoản khách hàng khác gửi yêu cầu hoàn trả hoặc truy cập màn hình duyệt của Staff để xác minh hệ thống chặn đúng thẩm quyền.

**Acceptance Scenarios**:

1. **Given** khách hàng chọn tệp không phải định dạng ảnh hoặc vượt giới hạn dung lượng/số lượng, **When** tải ảnh lên ở bước hoàn trả, **Then** hệ thống từ chối tệp không hợp lệ với thông báo dễ hiểu bằng tiếng Việt.
2. **Given** một người dùng chưa đăng nhập, khách hàng không phải chủ đơn, hoặc tài khoản không có vai trò nhân viên truy cập màn hình quản lý hoàn trả, **When** cố gắng xem hoặc xử lý yêu cầu, **Then** hệ thống từ chối truy cập đúng quy định bảo mật.
3. **Given** hai nhân viên mở cùng một yêu cầu đang *"Chờ xử lý"* và nhân viên A đã xử lý xong trước, **When** nhân viên B bấm Chấp nhận hoặc Từ chối ngay sau đó, **Then** hệ thống chặn thao tác trùng lặp và thông báo yêu cầu đã được xử lý trước đó.

---

### Edge Cases

- **Đơn hàng ở trạng thái Chờ xử lý / Đã xác nhận / Đang chuẩn bị / Đã hủy hoặc đơn tại quầy**: Không hiển thị nút "Hoàn trả hàng"; nếu truy cập trực tiếp quy trình hoàn trả, hệ thống từ chối do đơn chưa ở giai đoạn giao hàng hợp lệ.
- **Đơn hàng khách vãng lai (không có tài khoản)**: Không có trang Chi tiết đơn hàng của tài khoản cá nhân; nếu muốn hoàn trả cần đăng nhập hoặc liên hệ hỗ trợ (không mở cổng gửi yêu cầu hoàn trả nặc danh thiếu xác thực).
- **Mất kết nối hoặc dịch vụ lưu trữ ảnh Cloudinary tạm thời gián đoạn**: Hiển thị thông báo lỗi thân thiện cho khách hàng thử lại việc tải ảnh, tuyệt đối không tạo yêu cầu hoàn trả hỏng hoặc lưu đường dẫn ảnh rỗng.
- **Khách hàng bấm "Đã nhận được hàng" ngay khi yêu cầu hoàn trả đang chờ duyệt hoặc ngược lại**: Khi đã có yêu cầu hoàn trả đang chờ xử lý, nút "Đã nhận được hàng" tạm ẩn/vô hiệu hóa; khi Staff chấp nhận hoàn trả, đơn kết thúc hoàn trả và khách không thể bấm "Đã nhận được hàng" nữa.
- **Chức năng tự động hoàn thành sau 3 ngày**: Hệ thống tự động hoàn thành đơn hàng sau 3 ngày đang giao PHẢI bỏ qua các đơn hàng đang có yêu cầu hoàn trả *"Chờ xử lý"* (và các đơn đã *"Chấp nhận hoàn trả"*). Nếu yêu cầu hoàn trả bị Staff từ chối, đồng hồ hoặc quy trình tiếp theo xử lý nhất quán theo quy tắc đã chốt.
- **Nhân viên nhập lý do từ chối quá ngắn hoặc chỉ có khoảng trắng**: Hệ thống không cho phép xác nhận từ chối, yêu cầu nhập lý do rõ ràng (tối thiểu vài ký tự có nghĩa).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tại màn hình Chi tiết đơn hàng của khách hàng đã đăng nhập, đối với đơn hàng trực tuyến đang ở trạng thái **"Đang giao"** và chưa từng gửi yêu cầu hoàn trả trước đó, hệ thống PHẢI hiển thị nút **"Hoàn trả hàng"** bên cạnh nút **"Đã nhận được hàng"**.
- **FR-002**: Biểu mẫu yêu cầu hoàn trả PHẢI cho phép khách hàng chọn lý do bắt buộc từ 2 nhóm lý do tinh gọn: **Hàng có vấn đề hoặc thiếu hàng** (gộp lỗi sản phẩm, bể vỡ, bao bì rách, sai hàng hoặc thiếu phụ kiện/quà tặng) và **Chưa nhận được hàng**.
  - **Bắt buộc tối thiểu 1 ảnh** (tối đa 5 ảnh) khi chọn *"Hàng có vấn đề hoặc thiếu hàng"*.
  - **Tùy chọn ảnh** (0–5 ảnh) khi chọn *"Chưa nhận được hàng"*.
- **FR-003**: Hệ thống PHẢI xác thực định dạng (JPG, PNG, WEBP), dung lượng và số lượng tối đa (5 ảnh) của hình ảnh tải lên, lưu trữ an toàn lên dịch vụ Cloudinary và lưu giữ liên kết ảnh vào yêu cầu hoàn trả.
- **FR-004**: Biểu mẫu yêu cầu hoàn trả PHẢI yêu cầu khách hàng nhập thông tin tài khoản ngân hàng để nhận tiền hoàn:
  - **Tên ngân hàng** (`bankName`): Bắt buộc, chuỗi từ 2–100 ký tự.
  - **Số tài khoản** (`accountNumber`): Bắt buộc, chuỗi từ 6–30 ký tự số.
  - **Tên chủ tài khoản** (`accountHolder`): Bắt buộc, chuỗi từ 2–100 ký tự.
- **FR-005**: Ngay khi khách hàng gửi yêu cầu hoàn trả thành công, yêu cầu được lưu với trạng thái **"Chờ xử lý"**; màn hình Chi tiết đơn hàng của khách hàng hiển thị trạng thái yêu cầu hoàn trả (lý do, thông tin ngân hàng đã nhập, mô tả, ảnh đã gửi, trạng thái xử lý) và tạm vô hiệu hóa thao tác bấm "Đã nhận được hàng" cũng như gửi yêu cầu hoàn trả lặp lại.
- **FR-006**: Tiến trình tự động hoàn thành đơn hàng sau 3 ngày PHẢI loại trừ các đơn hàng đang có yêu cầu hoàn trả ở trạng thái **"Chờ xử lý"** hoặc đơn đã ở trạng thái **"Đã hoàn trả"**; nếu yêu cầu hoàn trả bị Staff từ chối, đồng hồ 3 ngày tiếp tục áp dụng theo mốc giao hàng (hoặc tối thiểu 24 giờ thời gian chờ hợp lý sau khi bị từ chối) nếu khách chưa bấm nhận hàng.
- **FR-007**: Khu vực Staff PHẢI bổ sung màn hình quản lý danh sách **Yêu cầu hoàn trả hàng** có thể lọc theo trạng thái (*Tất cả*, *Chờ xử lý*, *Đã chấp nhận*, *Đã từ chối*) và tìm kiếm theo mã đơn hàng / thông tin khách hàng.
- **FR-008**: Trên màn hình chi tiết một yêu cầu hoàn trả của Staff, nhân viên PHẢI xem được thông tin đơn hàng liên kết, danh sách sản phẩm trong đơn, lý do, mô tả, toàn bộ hình ảnh minh chứng khách hàng đã gửi và **thông tin tài khoản ngân hàng** nhận hoàn tiền của khách.
- **FR-009**: Đối với yêu cầu đang ở trạng thái **"Chờ xử lý"**, nhân viên PHẢI thực hiện được một trong hai hành động có xác nhận nguyên tử (chống duyệt trùng lặp):
  - **Chấp nhận hoàn trả**: Cập nhật yêu cầu sang **"Đã chấp nhận"** kèm người xử lý và thời gian xử lý; chuyển đơn hàng chính sang trạng thái **"Đã hoàn trả"** (không tính vào doanh thu Hoàn thành), **tự động cộng lại tồn kho** của từng sản phẩm trong đơn, và nếu đơn đã thanh toán `ONLINE` hoặc có thông tin tài khoản ngân hàng thì đánh dấu trạng thái **"Cần hoàn tiền"** (`pending_refund`) phục vụ đối soát chuyển khoản.
  - **Từ chối hoàn trả**: Bắt buộc nhập lý do từ chối (tối thiểu 5 ký tự, tối đa 500 ký tự), cập nhật yêu cầu sang **"Đã từ chối"** kèm lý do và người xử lý; hiển thị lý do từ chối cho khách hàng trên Chi tiết đơn hàng, khóa gửi lại yêu cầu mới và mở lại nút **"Đã nhận được hàng"**.
- **FR-010**: Mọi thao tác gửi yêu cầu hoàn trả của khách hàng và duyệt/từ chối của Staff PHẢI kiểm tra chặt chẽ quyền sở hữu / vai trò người dùng hợp lệ và áp dụng đầy đủ bảo vệ an toàn dữ liệu (CSRF, Origin, Transaction lock).

### Key Entities *(include if feature involves data)*

- **Yêu cầu hoàn trả (Return Request)**: Gắn với một đơn hàng và khách hàng sở hữu đơn; chứa:
  - Lý do chuẩn: `Hàng có vấn đề hoặc thiếu hàng` (`damaged_or_missing` / `damaged_or_defective`) hoặc `Chưa nhận được hàng` (`not_received`).
  - Thông tin tài khoản ngân hàng hoàn tiền (`bankAccount`: `bankName`, `accountNumber`, `accountHolder`).
  - Mô tả chi tiết của khách hàng.
  - Danh sách hình ảnh minh chứng (URL Cloudinary).
  - Trạng thái xử lý (`Chờ xử lý` / `Đã chấp nhận` / `Đã từ chối`), cờ hoàn tiền (`refundRequired`, `refundStatus`).
  - Thời điểm gửi, nhân viên xử lý, lý do từ chối (nếu từ chối) và thời điểm xử lý.
- **Đơn hàng (Order)**: Liên kết trạng thái yêu cầu hoàn trả hiện hành để đồng bộ quyền bấm "Đã nhận được hàng", hiển thị trạng thái hoàn đơn, tạm dừng tự động hoàn thành sau 3 ngày khi đang chờ duyệt, và cập nhật kết quả cuối cùng khi hoàn trả được chấp nhận.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% khách hàng có đơn hàng đủ điều kiện hoàn trả nhìn thấy rõ nút **"Hoàn trả hàng"** và hoàn tất gửi yêu cầu kèm ảnh lên Cloudinary trong dưới 1 phút thao tác.
- **SC-002**: 0% đơn hàng đang có yêu cầu hoàn trả ở trạng thái "Chờ xử lý" bị hệ thống tự động chuyển nhầm sang "Hoàn thành" khi quá 3 ngày giao hàng.
- **SC-003**: 100% yêu cầu hoàn trả hiển thị đầy đủ ảnh minh chứng, mô tả và lý do trên màn hình quản lý của Staff; 100% quyết định từ chối đều bắt buộc có lý do rõ ràng hiển thị lại cho khách hàng.
- **SC-004**: 0% trường hợp một yêu cầu hoàn trả bị duyệt hoặc từ chối hai lần dẫn đến sai lệch trạng thái đơn hàng hay số lượng tồn kho.

## Assumptions

- Tài khoản dịch vụ Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) đã được cấu hình sẵn trong môi trường hệ thống giống như tính năng tải ảnh đánh giá sản phẩm hiện có.
- Đối với trường hợp hoàn tiền cho đơn đã thanh toán chuyển khoản trực tuyến (ONLINE / SePay), việc chuyển khoản hoàn tiền thực tế qua ngân hàng được nhân viên/kế toán đối soát thực hiện ngoài hệ thống dựa trên trạng thái ghi nhận trên hệ thống (trừ khi bạn chọn khác ở phần làm rõ).

