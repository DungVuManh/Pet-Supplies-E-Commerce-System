# Feature Specification: Quản Lý và Lưu Mã Giảm Giá Khách Hàng (Customer Voucher Wallet)

**Feature Branch**: `feature/save-customer-vouchers`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "tôi muốn implement tính năng cho phép người dùng bấm lưu mã giảm giá và có thể vào xem lại ở UI"

## Clarifications

### Session 2026-11-09

- Q: Khi khách hàng chưa đăng nhập (Guest) bấm nút "Lưu mã", hệ thống nên phản hồi như thế nào? → A: Lưu tạm thời vào bộ nhớ trình duyệt cục bộ (Local Storage); khi người dùng tiến hành đăng nhập hoặc đăng ký tài khoản, hệ thống tự động đồng bộ danh sách mã đã lưu này vào tài khoản đám mây của họ.
- Q: Người dùng có thể vào xem lại các mã giảm giá đã lưu ở những khu vực nào trên giao diện (UI)? → A: Cung cấp trang chuyên biệt "Ví Voucher / Mã của tôi" trong khu vực quản lý tài khoản cá nhân (`/account/vouchers`), đồng thời bổ sung bộ lọc/tab "Mã đã lưu" trực tiếp trên trang khuyến mãi công khai (`/voucher`).
- Q: Mã giảm giá trong ví cá nhân nên được phân loại trạng thái như thế nào khi đã sử dụng hoặc hết hạn? → A: Phân chia thành 3 nhóm trạng thái trực quan: "Sẵn sàng sử dụng" (còn hạn và đủ điều kiện), "Đã sử dụng" (đã dùng cho đơn hàng thành công), và "Hết hiệu lực" (hết hạn ngày hoặc mã đã bị vô hiệu hóa/hết lượt dùng toàn sàn).
- Q: Khi người dùng mở modal chọn mã giảm giá từ Ví voucher tại bước Thanh toán, hệ thống nên có cơ chế tự động gợi ý mã giảm giá tối ưu nhất (giảm được nhiều tiền nhất) hay chỉ hiển thị danh sách theo thời hạn? → A: Tự động tính toán số tiền giảm thực tế của từng mã trong ví với giỏ hàng hiện tại, gắn huy hiệu "Tốt nhất" cho mã giảm sâu nhất và ưu tiên hiển thị ở vị trí đầu tiên trong danh sách.
- Q: Hệ thống nên lưu giữ các mã giảm giá trong tab "Đã sử dụng" và "Hết hiệu lực" trong ví cá nhân của khách hàng trong bao lâu? → A: Tự động ẩn và dọn dẹp các mã đã sử dụng hoặc hết hạn quá 30 ngày khỏi ví của khách hàng để giữ giao diện ví luôn gọn gàng.
- Q: Hệ thống có nên đặt giới hạn số lượng voucher tối đa mà một khách hàng có thể lưu vào ví cùng một lúc hay không? → A: Giới hạn tối đa 50 mã còn hiệu lực trong ví của mỗi khách hàng; khi đạt giới hạn, hệ thống thông báo người dùng sử dụng hoặc bỏ bớt mã cũ trước khi lưu thêm.
- Q: Khi người dùng nhấn nút "Dùng ngay" trên một thẻ voucher trong Ví cá nhân, hệ thống nên điều hướng người dùng đến đâu? → A: Điều hướng thông minh: Chuyển hướng đến trang Tất cả sản phẩm (`/products`) hoặc danh mục sản phẩm tương ứng mà voucher áp dụng để khách hàng chọn đồ mua sắm ngay lập tức.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khách hàng lưu và bỏ lưu mã giảm giá từ giao diện khám phá (Priority: P1)

Khách hàng khi duyệt danh sách khuyến mãi trên trang Mã giảm giá (`/voucher`), trang chủ hoặc banner khuyến mãi có thể bấm nút "Lưu" trên từng thẻ voucher. Nút bấm ngay lập tức chuyển trạng thái sang "Đã lưu" kèm thông báo xác nhận thành công. Khách hàng cũng có thể bấm lại để bỏ lưu mã nếu không còn nhu cầu. Đối với khách hàng đã đăng nhập, danh sách mã đã lưu được đồng bộ ngay vào tài khoản cơ sở dữ liệu để có thể truy cập từ bất kỳ thiết bị nào. Đối với khách chưa đăng nhập, mã được lưu tạm vào thiết bị hiện tại và giữ nguyên trạng thái hiển thị "Đã lưu".

**Why this priority**: Đây là điểm tương tác đầu tiên của tính năng, giúp khách hàng chủ động thu thập các ưu đãi hấp dẫn trước khi mua sắm, tăng tỷ lệ quay lại và chuyển đổi đơn hàng.

**Independent Test**: Mở trang danh sách voucher, bấm nút "Lưu" trên một mã bất kỳ; kiểm tra nút đổi thành "Đã lưu", hiển thị thông báo phản hồi thành công và tải lại trang trạng thái lưu vẫn được duy trì chính xác.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở trang danh sách mã giảm giá và thấy một mã hợp lệ chưa lưu, **When** người dùng nhấn nút "Lưu", **Then** hệ thống ghi nhận mã vào danh sách voucher của người dùng, giao diện đổi nút thành "Đã lưu" và hiển thị thông báo "Đã lưu mã giảm giá vào ví!".
2. **Given** người dùng đã lưu một mã giảm giá trước đó, **When** người dùng nhấn lại vào nút "Đã lưu", **Then** hệ thống loại bỏ mã khỏi danh sách lưu của người dùng, chuyển nút về trạng thái "Lưu" và hiển thị thông báo "Đã bỏ lưu mã giảm giá".
3. **Given** khách vãng lai (chưa đăng nhập) đã lưu một số mã giảm giá trên trình duyệt, **When** khách hàng thực hiện đăng nhập vào tài khoản, **Then** hệ thống tự động đồng bộ tất cả các mã đã lưu từ trình duyệt vào tài khoản cá nhân mà không làm mất mã nào.

---

### User Story 2 - Xem và quản lý danh sách mã đã lưu tại trang Ví Voucher cá nhân (Priority: P1)

Người dùng có thể truy cập khu vực "Ví Voucher" / "Mã giảm giá của tôi" từ menu tài khoản cá nhân (`/account/vouchers`) hoặc qua tab "Mã đã lưu" trên trang khuyến mãi (`/voucher`). Tại đây, người dùng xem được đầy đủ danh sách các voucher mình đã thu thập, bao gồm: mức giảm, giá trị đơn tối thiểu, ngày hết hạn, mã code kèm nút sao chép nhanh và nút "Dùng ngay" (điều hướng đến trang mua sắm). Danh sách được sắp xếp ưu tiên các mã còn hạn gần nhất lên đầu để nhắc nhở người dùng tận dụng ưu đãi kịp thời.

**Why this priority**: Cung cấp cho khách hàng một không gian tập trung để quản lý toàn bộ ưu đãi của mình, giúp họ dễ dàng kiểm tra hạn sử dụng và kích thích hành vi mua hàng.

**Independent Test**: Đăng nhập tài khoản, truy cập `/account/vouchers`, kiểm tra xem danh sách các mã đã lưu có hiển thị đầy đủ thông tin chi tiết, phân loại trạng thái chính xác và các nút thao tác sao chép / dùng ngay hoạt động tốt.

**Acceptance Scenarios**:

1. **Given** người dùng đã lưu các mã giảm giá vào tài khoản, **When** người dùng truy cập trang Quản lý tài khoản > Ví voucher, **Then** hệ thống hiển thị danh sách tất cả các mã đã lưu kèm thông tin chi tiết: Giá trị giảm, Mức giảm tối đa, Đơn hàng tối thiểu, Ngày hết hạn và Mã code.
2. **Given** người dùng chưa lưu bất kỳ mã nào trong tài khoản, **When** người dùng truy cập trang Ví voucher, **Then** hệ thống hiển thị trạng thái trống thân thiện ("Bạn chưa có mã giảm giá nào trong ví") kèm nút liên kết dẫn đến trang "Khám phá mã giảm giá ngay".
3. **Given** người dùng đang xem một voucher trong ví cá nhân, **When** người dùng nhấn nút "Sao chép mã" hoặc "Dùng ngay", **Then** hệ thống sao chép mã vào bộ nhớ đệm và hiển thị thông báo xác nhận, hoặc điều hướng người dùng đến danh mục sản phẩm tương ứng.

---

### User Story 3 - Chọn và áp dụng trực tiếp mã đã lưu tại bước Thanh toán và Giỏ hàng (Priority: P2)

Tại màn hình Giỏ hàng hoặc Thanh toán (Checkout), thay vì bắt buộc phải nhớ và gõ tay mã giảm giá, khách hàng được cung cấp tùy chọn "Chọn từ Ví voucher". Một danh sách popup hoặc ngăn kéo hiển thị toàn bộ mã đã lưu của khách hàng. Hệ thống tự động đánh dấu rõ mã nào khả dụng với giá trị đơn hàng hiện tại (kèm nút "Áp dụng") và mã nào chưa đủ điều kiện (kèm giải thích ví dụ: "Cần mua thêm 50.000 đ để áp dụng mã này").

**Why this priority**: Giảm ma sát trong quá trình thanh toán, loại bỏ rào cản gõ sai mã chữ hoa/thường, giúp quy trình thanh toán nhanh chóng và tăng tỷ lệ hoàn tất đơn hàng.

**Independent Test**: Thêm sản phẩm vào giỏ hàng, đi đến bước thanh toán, mở danh sách mã đã lưu, chọn một mã khả dụng và xác nhận số tiền giảm giá được trừ chính xác vào tổng thanh toán.

**Acceptance Scenarios**:

1. **Given** người mua có mã đã lưu trong ví và đang ở màn hình thanh toán, **When** người mua nhấn vào ô "Chọn mã giảm giá từ ví", **Then** hệ thống mở danh sách các mã đã lưu của người mua kèm trạng thái khả dụng tương ứng với tổng tiền hàng hiện tại.
2. **Given** giỏ hàng hiện tại thỏa mãn điều kiện áp dụng của một mã đã lưu, **When** người mua nhấn nút "Áp dụng" trên mã đó, **Then** mã được điền tự động vào ô voucher, hệ thống tính toán lại mức giảm giá tức thì và hiển thị số tiền thanh toán mới.
3. **Given** đơn hàng chưa đạt giá trị tối thiểu của mã đã lưu, **When** người mua quan sát mã đó trong danh sách, **Then** mã hiển thị ở trạng thái mờ (disabled) kèm dòng thông báo số tiền cần mua thêm để đủ điều kiện áp dụng.

---

### User Story 4 - Tự động cập nhật vòng đời và trạng thái voucher trong ví (Priority: P2)

Hệ thống tự động theo dõi tình trạng của từng mã trong ví người dùng theo thời gian thực:
- Khi một mã đã được áp dụng và đặt hàng thành công (đối với mã chỉ dùng 1 lần `oncePerCustomer`), mã sẽ tự động chuyển sang tab "Đã sử dụng".
- Khi mã vượt quá ngày hết hạn (`endAt`), mã tự động chuyển sang tab "Hết hiệu lực".
- Nếu đơn hàng có sử dụng mã bị hủy, mã tự động quay trở lại trạng thái "Sẵn sàng sử dụng" trong ví của khách hàng.

**Why this priority**: Tránh gây thất vọng và nhầm lẫn cho khách hàng khi cố gắng sử dụng các mã đã hết hạn hoặc đã dùng rồi, mang lại tính minh bạch và chuyên nghiệp.

**Independent Test**: Đặt một đơn hàng sử dụng mã giảm giá 1 lần, sau đó quay lại ví voucher kiểm tra mã đã được chuyển sang mục "Đã sử dụng"; tiếp tục hủy đơn hàng đó và xác minh mã tự động chuyển lại mục "Sẵn sàng sử dụng".

**Acceptance Scenarios**:

1. **Given** khách hàng đã sử dụng một mã voucher loại 1 lần cho một đơn hàng thành công, **When** khách hàng kiểm tra ví voucher cá nhân, **Then** mã đó xuất hiện trong tab "Đã sử dụng" với ngày giờ sử dụng và không còn cho phép bấm áp dụng lại.
2. **Given** một voucher trong ví đã quá ngày hết hạn của chiến dịch, **When** khách hàng mở ví voucher, **Then** voucher nằm trong tab "Hết hiệu lực" kèm nhãn "Đã hết hạn".
3. **Given** một đơn hàng sử dụng voucher bị hủy, **When** hệ thống xác nhận hủy đơn, **Then** voucher liên kết tự động được phục hồi về trạng thái "Sẵn sàng sử dụng" trong ví của khách hàng.

---

### Edge Cases

- **Mã voucher đã lưu bị Quản trị viên vô hiệu hóa (disabled) hoặc xóa**: Voucher trong ví người dùng sẽ tự động chuyển sang trạng thái "Không còn khả dụng" và hiển thị thông báo rõ ràng nếu người dùng cố bấm áp dụng.
- **Mã giảm giá đã lưu bị hết lượt dùng toàn sàn (usageLimit)**: Nếu tổng số lượt dùng của toàn bộ hệ thống đã chạm giới hạn, voucher trong ví sẽ hiển thị nhãn "Đã hết lượt dùng" và không cho phép chọn áp dụng khi thanh toán.
- **Thao tác lưu trùng lặp liên tục (Idempotent Click)**: Người dùng bấm nút "Lưu" nhiều lần liên tiếp do độ trễ mạng; hệ thống chỉ ghi nhận một bản ghi duy nhất, không tạo ra các bản ghi trùng lặp trong ví.
- **Khách hàng lưu mã trên nhiều trình duyệt khác nhau trước khi đăng nhập**: Khi đăng nhập, hệ thống gộp danh sách mã (union/deduplicate) từ trình duyệt vào tài khoản cá nhân mà không làm mất mã đã lưu trước đó ở cả hai nơi.
- **Voucher sắp hết hạn (trong vòng 24 giờ)**: Hệ thống hiển thị huy hiệu cảnh báo nổi bật "Sắp hết hạn" trên thẻ voucher trong ví để thôi thúc khách hàng sử dụng.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI cung cấp nút "Lưu mã" / "Đã lưu" trên tất cả các thẻ voucher hiển thị công khai trên giao diện người dùng (trang Khuyến mãi `/voucher`, trang chủ, danh sách sản phẩm).
- **FR-002**: Hệ thống PHẢI hỗ trợ lưu và hủy lưu mã giảm giá đối với cả người dùng đã đăng nhập (lưu vào cơ sở dữ liệu tài khoản) và khách vãng lai chưa đăng nhập (lưu cục bộ trên trình duyệt).
- **FR-003**: Khi khách hàng chưa đăng nhập thực hiện đăng nhập hoặc đăng ký tài khoản thành công, hệ thống PHẢI tự động đồng bộ hóa danh sách mã đã lưu từ trình duyệt vào cơ sở dữ liệu tài khoản của người dùng.
- **FR-004**: Hệ thống PHẢI cung cấp trang giao diện "Ví Voucher / Mã của tôi" chuyên biệt nằm trong khu vực quản lý tài khoản (`/account/vouchers`), hiển thị toàn bộ các mã mà người dùng đã lưu.
- **FR-005**: Trang Ví Voucher PHẢI phân loại danh sách mã thành 3 nhóm trạng thái: "Có hiệu lực", "Đã sử dụng", và "Hết hiệu lực".
- **FR-006**: Trang danh sách khuyến mãi công khai (`/voucher`) PHẢI cung cấp bộ lọc hoặc tab "Mã đã lưu" để người dùng xem nhanh các mã mình đã thu thập ngay tại trang này.
- **FR-007**: Hệ thống PHẢI hiển thị đầy đủ thông tin trên từng thẻ voucher trong ví: Mã code, Tên ưu đãi, Mức giảm (%, VND), Mức giảm tối đa (nếu có), Giá trị đơn hàng tối thiểu, Ngày bắt đầu và Ngày kết thúc hiệu lực.
- **FR-008**: Mỗi thẻ voucher trong ví PHẢI có nút "Sao chép mã" (kèm thông báo sao chép thành công vào bộ nhớ tạm) và nút "Dùng ngay" (điều hướng thông minh đến trang `/products` hoặc danh mục sản phẩm áp dụng tương ứng của mã).
- **FR-009**: Hệ thống PHẢI cung cấp tiện ích "Chọn từ ví voucher" tại màn hình Giỏ hàng (`/cart`) và Thanh toán (`/checkout`), cho phép người dùng mở danh sách mã đã lưu và chọn trực tiếp mã khả dụng chỉ bằng một lần nhấn.
- **FR-010**: Tại màn hình chọn voucher khi thanh toán, hệ thống PHẢI tự động đối chiếu giá trị đơn hàng hiện tại với điều kiện của từng mã đã lưu để phân biệt mã đủ điều kiện (có nút "Áp dụng") và mã chưa đủ điều kiện (hiển thị mờ kèm số tiền cần mua thêm), đồng thời PHẢI tự động gắn huy hiệu "Tốt nhất" và ưu tiên hiển thị lên đầu danh sách đối với mã mang lại số tiền giảm cao nhất.
- **FR-011**: Hệ thống PHẢI tự động chuyển trạng thái của voucher trong ví sang "Đã sử dụng" ngay khi đơn hàng sử dụng mã đó được tạo thành công (đối với mã chỉ áp dụng 1 lần mỗi khách).
- **FR-012**: Hệ thống PHẢI tự động hoàn trả voucher về trạng thái "Có hiệu lực" trong ví của người dùng khi đơn hàng tương ứng bị hủy.
- **FR-013**: Hệ thống PHẢI tự động đánh dấu voucher là "Hết hiệu lực" khi thời gian hiện tại vượt quá thời điểm kết thúc (`endAt`) của mã.
- **FR-014**: Hệ thống PHẢI đảm bảo tính duy nhất (Unique) khi lưu mã: một tài khoản người dùng không thể lưu trùng lặp một mã giảm giá nhiều lần.
- **FR-015**: Giao diện PHẢI phản hồi trạng thái nút "Lưu" tức thì (Optimistic UI update) để mang lại trải nghiệm mượt mà cho khách hàng ngay cả khi mạng chậm.
- **FR-016**: Hệ thống PHẢI tự động ẩn hoặc loại bỏ các mã giảm giá trong ví đã ở trạng thái "Đã sử dụng" hoặc "Hết hiệu lực" quá 30 ngày để tối ưu hóa hiệu năng truy vấn và giữ giao diện ví luôn gọn gàng.
- **FR-017**: Hệ thống PHẢI giới hạn số lượng mã giảm giá còn hiệu lực trong ví của một người dùng ở mức tối đa 50 mã; nếu người dùng cố gắng lưu vượt quá giới hạn này, hệ thống PHẢI trả về thông báo lỗi thân thiện yêu cầu sử dụng hoặc bỏ bớt mã cũ trước khi lưu thêm.

### Key Entities *(include if feature involves data)*

- **Ví Voucher Khách Hàng (Customer Saved Voucher)**: Thực thể liên kết giữa tài khoản người dùng và mã giảm giá đã lưu. Các thuộc tính bao gồm: định danh người dùng (`userId`), mã định danh voucher (`voucherId` / `promotionId`), mã code (`code`), thời điểm lưu (`savedAt`), trạng thái hiển thị (`status`: active, used, expired).
- **Mã Giảm Giá (Promotion / Voucher)**: Thực thể biểu diễn thông tin gốc của voucher trong hệ thống, bao gồm: mã code, loại giảm giá (percent/fixed), giá trị giảm, mức giảm tối đa, giá trị đơn tối thiểu, thời gian bắt đầu, thời gian kết thúc, số lượt dùng tối đa, giới hạn mỗi khách, trạng thái hoạt động (`isActive`).
- **Lịch Sử Sử Dụng Voucher (Promotion Redemption)**: Thực thể ghi nhận việc voucher đã được sử dụng cho một đơn hàng cụ thể, làm căn cứ chuyển trạng thái voucher trong ví sang "Đã sử dụng" hoặc hoàn trả lại khi hủy đơn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Thao tác bấm "Lưu" hoặc "Bỏ lưu" mã giảm giá phản hồi trên giao diện người dùng trong thời gian dưới 200 mili-giây.
- **SC-002**: 100% người dùng đã đăng nhập có thể xem lại chính xác danh sách các mã mình đã lưu trên mọi thiết bị và trình duyệt sau khi đăng nhập.
- **SC-003**: 100% mã giảm giá lưu tạm ở chế độ khách vãng lai được tự động chuyển giao và lưu vào tài khoản cá nhân ngay sau khi đăng nhập thành công.
- **SC-004**: Giảm ít nhất 50% thời gian khách hàng thực hiện áp dụng mã giảm giá tại bước thanh toán (nhờ việc chọn trực tiếp từ danh sách ví voucher thay vì phải tìm lại và gõ tay mã code).
- **SC-005**: Tỷ lệ người dùng thu thập mã giảm giá và quay lại hoàn tất đơn hàng tăng ít nhất 15% trong vòng 30 ngày sau khi tính năng ra mắt.

## Assumptions

- Người dùng có thể lưu tối đa 50 mã giảm giá còn hiệu lực vào ví cá nhân của mình.
- Một mã giảm giá sau khi được lưu vào ví vẫn phải tuân thủ đầy đủ các điều kiện gốc (thời hạn, số tiền đơn tối thiểu, số lượng tồn kho của chiến dịch) tại thời điểm đặt hàng thực tế.
- Việc lưu mã vào ví không tương đương với việc "giữ chỗ" lượt dùng toàn sàn (`usageLimit`); lượt dùng chỉ được bảo lưu chính thức khi khách hàng tiến hành bước Đặt hàng (Checkout).
- Đối với khách vãng lai không bao giờ đăng nhập, danh sách mã đã lưu trên trình duyệt được duy trì thông qua bộ nhớ cục bộ (Local Storage) cho đến khi người dùng chủ động xóa dữ liệu duyệt web.

