# Specs: Staff Orders — danh sách và chi tiết chỉ đọc

Ngày: 22/10/2026. Trạng thái: **bản thảo để duyệt, chưa triển khai**.

Phần cập nhật trạng thái đã được mở rộng theo yêu cầu người dùng sau tài liệu
chỉ đọc này; hợp đồng hiện tại nằm ở [staff-order-status.md](staff-order-status.md).

## 1. Mục tiêu, hiện trạng và phạm vi

Thay dữ liệu mock trên `/staff/orders` và `/staff/orders/[id]` bằng dữ liệu MongoDB,
phục vụ UC31/UC32. Người dùng đã chốt bao gồm danh sách và chi tiết chỉ đọc;
chưa tạo đơn, xác nhận đơn, đổi trạng thái, cập nhật giao hàng hoặc thanh toán.

Hiện trạng đã đọc từ repository:

- Danh sách gọi `filterOrders()` từ mock; số đếm 334/12/24/292/6, ngày đặt và phân
  trang đều cố định. Chưa có API Orders.
- UI mock có `packing`; model có 7 trạng thái và không có `packing`.
- Chi tiết tìm bằng mã mock, tính tiền bằng giá Product hiện tại, và chứa người
  phụ trách, lịch sử, thông tin thanh toán giả. Chưa đọc snapshot Order.
- Staff layout đã kiểm tra phiên và đúng role. Express đã đặt no-store cho
  `/api/v1/staff`; rewrite `/api/v1/staff/:path*` cũng đã có.
- Order có snapshot sản phẩm/địa chỉ, tiền, trạng thái, kênh và lịch sử. Không có
  ghi chú khách, phân công người phụ trách, shipping service hoặc cancellation request.

**Mặc định đề xuất chưa được xác nhận riêng:** dùng đúng 7 trạng thái backend,
không gom nhóm và không đổi schema. Các mặc định còn lại được ghi rõ dưới đây.
Chỉ làm tài liệu trong yêu cầu hiện tại; mọi bước viết code trong plan là công việc tương lai.

Ngoài phạm vi: API ghi; nghiệp vụ tồn kho/giữ chỗ; callback Payment; xử lý yêu cầu
hủy; export; dashboard/reports thật; thay đổi role; sửa Product APIs; thêm dependency.
Staff xem cả đơn online/offline và guest/customer, không giới hạn theo người tạo:
model chưa có assignment và đây không phải màn hình hiệu suất cá nhân.

## 2. Hành vi màn hình

### Danh sách

- Giữ Staff shell, bố cục bảng và các cột hiện có. Mã đơn hiển thị `orderCode`;
  đường dẫn Chi tiết dùng `id` MongoDB. Không dùng mã mock làm ObjectId.
- Search, trạng thái, khoảng ngày, sort và trang nằm trên URL, khởi tạo được khi
  mở link trực tiếp và đồng bộ khi Back/Forward. Không lọc chỉ trong trang đang tải.
- Search debounce 300 ms; Enter gửi ngay. Thay search/status/date/sort đưa về
  trang 1. Search dùng replace URL; các lựa chọn filter và chuyển trang dùng push.
- Mặc định không giới hạn ngày, trạng thái tất cả, mới nhất trước, 8 đơn/trang.
  Thay ô ngày chỉ đọc thành hai input ngày có label Từ ngày/Đến ngày; cho phép một đầu mút.
- Tabs: Tất cả và 7 trạng thái; select trạng thái dùng cùng mapping. Giữ vùng tab
  cuộn ngang trên mobile. Sort có 4 lựa chọn theo hợp đồng API.
- Bỏ mọi số tháng/hôm nay và số đếm cố định. Subtitle là tổng đơn phù hợp;
  số trên tab do backend tính theo search/ngày, **bỏ qua status và pagination**.
  `pagination.total` áp dụng cả status đang chọn. Sort không thay đổi số đếm.
- Phân trang Trước/Tiếp hoạt động thật, disable đúng biên. Khi không có đơn, ẩn
  số trang thay vì hiển thị Trang 1/0. Nếu trang vượt trang cuối sau khi dữ liệu
  thay đổi, thay URL về trang cuối hợp lệ (hoặc trang 1 nếu total=0), rồi tải lại một lần.
- Cột khách dùng thông tin liên hệ của đơn, nhãn “Khách hàng / người nhận”.
  Cột phụ thể hiện điện thoại, tổng số lượng sản phẩm và phương thức thanh toán.
- Tạo đơn hộ khách bị vô hiệu hóa, kèm giải thích chức năng chưa triển khai;
  không còn thông báo giả rằng đã tạo đơn. `create` trên URL cũ không gọi API ghi.

### Chi tiết

- Hiển thị mã/ngày, kênh, trạng thái đơn và thanh toán, địa chỉ, các dòng sản phẩm,
  subtotal/discount/shippingFee/total và statusHistory từ đơn thật.
- Tên/SKU/giá/số lượng lấy snapshot Order. Product chỉ bổ sung ảnh, nhãn biến thể
  và tồn kho **hiện tại**; không tính lại tiền theo giá catalog và không khẳng định
  số giữ chỗ thuộc riêng đơn này.
- Sản phẩm/biến thể bị xóa hoặc tạm ẩn không làm mất dòng hàng; thiếu dữ liệu bổ
  sung thì dùng placeholder trung tính và “Không còn thông tin tồn kho”.
- Lịch sử hiển thị đúng from/to/thời điểm, tên người thao tác nếu còn User. Thiếu
  lịch sử thì hiện trạng thái trống; thiếu người thao tác thì ghi “Không có thông tin”.
- Bỏ người phụ trách, lịch sử phân công, ghi chú, dịch vụ giao hàng và cảnh báo hủy
  đang hardcode vì model không có các dữ liệu đó. Người tạo đơn offline không phải người phụ trách.
- ONLINE hiển thị “Thanh toán trực tuyến”, không tự gắn VNPay. COD chưa thanh toán
  mới hiện dòng “Cần thu khi giao” bằng total; không suy diễn đã thu từ orderStatus.
- Không render nút cập nhật trạng thái demo trên chi tiết thật. Không có request POST/PATCH/DELETE.
- Dashboard còn mock: liên kết Chi tiết của hàng mock phải chuyển thành “Xem danh
  sách thật” tới `/staff/orders?status=pending`, tránh mở ID mock vào API thật.
  Chưa thay số liệu/dashboard sang backend trong đợt này.

### Trạng thái chuẩn

| Giá trị API | Nhãn UI |
| --- | --- |
| pending | Chờ xử lý |
| confirmed | Đã xác nhận |
| processing | Đang đóng gói |
| shipping | Đang giao |
| delivered | Đã giao |
| completed | Hoàn thành |
| cancelled | Đã hủy |

Giữ orderStatus và paymentStatus riêng. Payment status dùng unpaid/pending/paid/failed
với nhãn Chưa thanh toán/Chờ thanh toán/Đã thanh toán/Thanh toán thất bại.
Không sửa type/mapping mock dùng bởi các màn hình khác; tạo mapping cho Orders thật.
Sidebar “Yêu cầu hủy” hiện vẫn là alias lọc `status=cancelled`, không coi đây là
API yêu cầu hủy mới hoặc bằng chứng có yêu cầu đang chờ duyệt.

## 3. Hợp đồng API

### GET `/api/v1/staff/orders`

Middleware: đọc cookie → requireAuth → requireRole("staff") → validate query → controller.
Guest nhận 401; Customer/Admin nhận 403. Staff có thể xem tất cả đơn của cửa hàng.
Trả Cache-Control: no-store, kể cả lỗi; không cache trên Next/CDN.

| Query | Mặc định | Quy tắc |
| --- | --- | --- |
| query | chuỗi rỗng | Trim, tối đa 100 ký tự; không phải regex do client cung cấp |
| status | all | all hoặc một trong 7 giá trị ở trên |
| dateFrom, dateTo | không giới hạn | Ngày hợp lệ YYYY-MM-DD; từ ngày không lớn hơn đến ngày |
| sort | createdAt_desc | createdAt_desc, createdAt_asc, total_desc, total_asc |
| page | 1 | Số nguyên 1–10000 |
| pageSize | 8 | Số nguyên 1–50; UI đợt này luôn dùng 8 |

Query không hỗ trợ, tham số lặp/mảng/object, enum sai hoặc ngày không hợp lệ trả
400 VALIDATION_ERROR, không âm thầm bỏ điều kiện. Giá trị số phải là số nguyên
dương dạng thập phân, không nhận phân số, scientific notation hoặc khoảng trắng.

- Lọc `createdAt` theo ngày Việt Nam: dateFrom từ 00:00 UTC+07 bao gồm; dateTo
  đến 00:00 của ngày kế tiếp, không bao gồm. Date/time trả về ISO UTC, UI định dạng
  vi-VN với timeZone Asia/Ho_Chi_Minh. Không phụ thuộc múi giờ máy chạy server.
- Search từng token, không phân biệt hoa/thường và dấu tiếng Việt (bao gồm đ/Đ).
  Mỗi token phải khớp ít nhất một trường: orderCode, guestInfo.name/phone hoặc
  shippingAddress.recipientName/phone. Escape metacharacter; dùng nhóm ký tự tiếng
  Việt cho tên và bỏ qua dấu cách/chấm/gạch giữa các chữ số điện thoại. Không tự
  quy đổi 0 và +84, không thêm trường tìm kiếm hoặc migration trong đợt này.
- Sort cho phép 4 lựa chọn qua allowlist; dùng `_id` cùng chiều làm khóa phụ khi
  createdAt/total bằng nhau. Không nhận Mongo sort/filter trực tiếp từ client.
- Trả thành công theo envelope hiện có: `success=true`, `data` gồm `items`,
  `pagination` và `summary`. Không trả Mongoose document trực tiếp.

| Thành phần | Trường công khai |
| --- | --- |
| items[] | id, orderCode, createdAt, customer{name,phone}, itemCount, total, orderStatus, paymentMethod, paymentStatus, channel |
| pagination | page, pageSize, total, totalPages; totalPages=0 khi total=0 |
| summary | all và statusCounts với đủ 7 khóa, kể cả số 0 |

`id` là chuỗi ObjectId; `itemCount` là tổng qty, không phải số dòng. `customer.name/phone`
lấy guestInfo nếu có, còn lại lấy snapshot shippingAddress; đây là liên hệ giao
nhận của đơn, không giả định là fullName/phone hiện tại của tài khoản Customer.
Danh sách không join User hoặc Product. Không trả địa chỉ đầy đủ, email, history,
payment rawResult, token hoặc Firebase UID trong response danh sách.

### GET `/api/v1/staff/orders/:id`

Cùng middleware và chính sách cache/role. Chỉ nhận ObjectId hex 24 ký tự;
sai định dạng trả 400 VALIDATION_ERROR, không tìm thấy trả 404 ORDER_NOT_FOUND.

Envelope `success=true`, `data.order` gồm trường danh sách, subtotal, discount,
shippingFee, promotionCode (null nếu thiếu), shippingAddress, shipping (null nếu
thiếu), items và statusHistory. createdByStaff chứa tên người tạo nếu là đơn
offline và User còn tồn tại, ngược lại null; không gọi đây là người được phân công.

- items[]: productId, variantSku, name, unitPrice, qty, lineTotal do backend tính;
  currentProduct chứa image/variantLabel/stock/reservedStock/availableStock hoặc null.
  Những giá trị bổ sung này là dữ liệu hiện tại, được tách khỏi snapshot.
- statusHistory[]: from (null nếu thiếu), to, at, actorName (null nếu không biết),
  giữ thứ tự thời gian tăng dần, ổn định với thứ tự lưu khi trùng thời điểm.
- Không trả Payment.rawResult, qrPayload, credentials, email/phone của Staff hoặc
  toàn bộ User/Product. Không đọc Payment collection để đoán lại trạng thái từ
  một payment attempt: đợt này Order.paymentStatus là nguồn hiển thị.

### Lỗi

Giữ `{ success: false, message, error: { code } }`. Ngoài các mã trên, giữ các mã
401/403/409/503 từ auth middleware; lỗi kết nối/query Order/Product/User liên quan
trả 503 ORDERS_UNAVAILABLE với thông báo cố định. Lỗi lập trình không dự kiến dùng
500 INTERNAL_SERVER_ERROR từ error handler. Không log query chứa tên/điện thoại,
URI, cookie, raw document hay stack ra response. Một dependency lỗi không được
đổi thành danh sách rỗng hoặc dữ liệu mock.

## 4. Thiết kế backend và tích hợp frontend

- Dùng Express 5 JavaScript ESM, named handlers, router mỏng và Zod ở biên theo
  quy ước backend; không tạo service factory/test adapter trong application code.
- Tách parse/validate query và ID khỏi controller. Controller sở hữu bộ lọc dùng
  chung cho rows/count, sort allowlist và projection DTO; không sửa Product controller.
- List thực hiện 3 truy vấn đọc: trang có projection/sort/skip/limit, tổng số khớp
  toàn bộ filter, nhóm số đếm trạng thái với search/ngày nhưng chưa lọc status.
  Không tải toàn collection về JavaScript để lọc/phân trang. Ba truy vấn không
  hứa snapshot transaction nếu có ghi đồng thời; lần tải lại phản ánh dữ liệu mới.
- Detail đọc Order theo ID, batch Product theo tập productId và batch User theo
  history.by/createdByStaffId cần thiết; không truy vấn N+1 trên từng dòng/lịch sử.
- Không thay schema/seed hoặc thêm index trong phạm vi mặc định. Kiểm tra explain
  trên dữ liệu thử khi triển khai; nếu cần migration/index mới thì ghi đề xuất
  riêng để duyệt, không tự sửa schema chỉ để tìm kiếm không dấu.
- Frontend có type DTO, parser response, mapping và API client riêng cho Orders;
  không ép DTO vào type Order mock và không lan thay đổi sang trang đang dùng mock.
- Danh sách tiếp tục là Client Component dưới Suspense đang có; gọi API cùng
  origin qua rewrite hiện tại, gửi session cookie, no-store, timeout 15 giây.
  Hủy request cũ khi filter đổi, chỉ áp dụng response của query hiện tại.
- Có loading/empty/error/retry rõ ràng. Không hiển thị rows cũ dưới filter mới;
  khi 401/403 phải xóa dữ liệu và chuyển /login hoặc /forbidden. 409 thiếu hồ sơ
  về /login để phục hồi; 429 và lỗi dịch vụ hiện thông báo, không retry tự động.
- 400 do URL/filter không hợp lệ hiển thị lỗi bộ lọc và hành động “Xóa bộ lọc”;
  không chỉ retry cùng request sai hoặc tự đổi sang bộ lọc tất cả. Chỉ các query
  được hỗ trợ mới được gửi từ URL màn hình sang API; cờ create cũ không được forward.
- Chi tiết giữ Server Component, đọc cookie và gọi backend trong ranh giới
  Suspense của workspace; không dùng cache dùng chung hoặc chỉ dựa vào layout
  đã xác thực. API vẫn kiểm tra quyền trên mỗi request. Forward riêng session
  cookie tới BACKEND_ORIGIN, không lấy origin từ request người dùng.
- Chi tiết 404 dùng notFound(); ID sai định dạng cũng hiển thị trang không tìm thấy.
  Lỗi dịch vụ dùng error boundary có retry theo Next.js đang cài. Quay lại danh
  sách giữ query nhờ router Back; có link chuẩn /staff/orders khi mở trực tiếp.
- Giữ token/component hiện có và ràng buộc frontend/design.md; không thiết kế
  lại shell hoặc thêm UI library. Labels, focus và điều khiển ngày dùng được bằng bàn phím.

## 5. Nghiệm thu, kiểm thử và giới hạn

| ID | Điều kiện hoàn thành |
| --- | --- |
| A1 | API list/detail chỉ Staff vào được; guest, customer, admin, phiên thu hồi và role bị hạ đều bị chặn ở backend |
| A2 | Tìm theo mã/tên có dấu-không dấu/điện thoại, lọc đủ 7 trạng thái, ngày và sort/phân trang trên MongoDB đúng hợp đồng |
| A3 | Số tab bỏ qua status đang chọn; tổng phân trang có status; không còn dữ liệu đếm/ngày/trang cố định |
| A4 | Link từ danh sách mở đúng đơn thật; link mock dashboard không đi vào ID giả; direct URL và reload hoạt động |
| A5 | Đổi giá/ẩn/xóa Product không thay tiền/tên snapshot; missing variant/user/history không làm hỏng trang |
| A6 | Tổng tiền, discount, paymentStatus, channel và lịch sử phản ánh Order, không còn thông tin hardcode hoặc mutation demo |
| A7 | Empty/error/timeout/retry/401/403/429, Back/Forward, đổi filter nhanh và trang vượt biên đều hoạt động, không fallback mock |
| A8 | API không sửa dữ liệu hoặc lộ trường nội bộ; list có limit thật; detail không N+1 |
| A9 | UI dùng được ở 320/768/1024/1440px, zoom 200%, bàn phím; bảng cuộn trong vùng, body không tràn ngang |
| A10 | Tests liên quan, full backend/frontend tests, lint, TypeScript, build và browser checks có bằng chứng kết quả |

Backend: Vitest/Supertest mock Firebase và collection tại database boundary, giữ
pipeline Mongoose query thật. Có integration fixtures trên database test riêng cho
search/date/sort/count; không dùng database thật của người dùng để thử ghi.
Frontend: Node tests cho parser/URL/mapping; browser kiểm thử list→detail và các
trạng thái lỗi. Không sửa/xóa test có sẵn để đạt kiểm tra. Lỗi baseline phải báo riêng.

Lệnh khi triển khai: `npm --prefix backend test`; `npm --prefix frontend test`;
`npm --prefix frontend run lint`; từ frontend chạy `npx --no-install tsc --noEmit`;
`npm --prefix frontend run build`. Chạy local bằng `npm run dev` sau khi cấu hình
Firebase/MongoDB. Backend không có build/lint script để tự giả định đã chạy.

Nguồn dự án: [SRS](../SRS.md) UC31/UC32, BR-03/09/24, CR-05/06/07/08/10;
[spec UI mock](staff-workspace-ui.md), [plan UI cũ](../plan/staff-workspace-ui.md).
Spec này chỉ thay hợp đồng dữ liệu của hai màn hình Orders khi được triển khai;
không tuyên bố các phần mock khác đã được tích hợp.

Nguồn kỹ thuật: [MongoDB skip/sort](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
cho khóa sort phụ duy nhất; [MongoDB case-insensitive indexes](https://www.mongodb.com/docs/v8.3/core/index-case-insensitive/)
xác nhận regex không hưởng tìm kiếm không dấu chỉ bằng collation;
[Mongoose queries](https://mongoosejs.com/docs/queries.html).
Next.js đối chiếu docs của bản 16.4.2 đang cài: useSearchParams, authentication
with Cache Components và error boundary; không nâng framework trong tính năng này.
