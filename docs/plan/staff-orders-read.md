# Plan: Backend và tích hợp Staff Orders chỉ đọc

Trạng thái: **bản thảo để duyệt, chưa bắt đầu code**. Ngày: 22/10/2026.
Spec: [Staff Orders read](../specs/staff-orders-read.md).
Checklist thực thi nằm cuối tài liệu.

## Quyết định và thứ tự phụ thuộc

Phạm vi đã được người dùng xác nhận: danh sách và chi tiết chỉ đọc. Mặc định đề
xuất dùng 7 trạng thái model, không có packing và không thiết lập workflow ghi.
Xây backend trước, sau đó API client/URL state, tích hợp list rồi detail. Giữ
chính sách đúng role Staff, rewrite và envelope hiện tại; không thêm dependency,
không migration, không ghi dữ liệu. Những task dưới đây dành cho lượt triển khai sau.

## Task triển khai

### T1 — Validation và bộ lọc Orders (nhỏ, không phụ thuộc)

- Tạo validator Zod cho list query và ObjectId; thống nhất defaults, giới hạn,
  ngày Việt Nam, enum và cách từ chối mảng/object/query lạ.
- Chốt tests cho query chuẩn/sai, ranh giới ngày UTC+07 và search literal tiếng
  Việt/điện thoại. Helper search/filter thuộc Orders, không tạo tầng common tổng quát.
- Dự kiến 2–3 file: validator, helper Orders nếu cần và tests tập trung.
- Nghiệm thu A2: test các ngày đầu/cuối, ngày không tồn tại, range đảo, đ/Đ,
  metacharacter, page/pageSize/sort/status sai và duplicate query params.

### T2 — API danh sách thật (vừa, phụ thuộc T1)

- Thêm named handler list và route GET /api/v1/staff/orders vào workspace router,
  sau đúng chuỗi middleware auth/role. Dùng projection/lean, sort khóa phụ và
  skip/limit; dùng chung filter cho rows/count, summary bỏ status theo spec.
- Thêm contract API tĩnh/OpenAPI cho endpoint này; không cài Swagger UI runtime.
- Dự kiến 4–5 file: controller, router, validator/helper nếu cần, HTTP tests, API docs.
- Nghiệm thu A1–A3/A8: số đếm và paging đúng với >8 đơn, filters kết hợp và không
  có kết quả; từ chối wrong role/revoked session; response no-store và DTO allowlist.
- Kiểm tra MongoDB thực trên database test riêng để xác nhận search/sort/count,
  không chỉ mock fluent query. Không tự thêm index; ghi explain để đánh giá.

**Checkpoint backend list:** API contract/tests đạt trước khi UI đọc endpoint.

### T3 — API chi tiết chỉ đọc (vừa, phụ thuộc T2)

- Mở rộng controller và workspace router với GET /api/v1/staff/orders/:id.
  Batch enrichment Product và tên actor User, snapshot là nguồn tiền/tên lịch sử.
- Bổ sung OpenAPI và tests 400/404, DTO, guest/offline, thiếu Product/variant/User,
  độc lập paymentStatus/orderStatus và lỗi dependency.
- Dự kiến 4 file, chủ yếu mở rộng các file T2; không sửa models/seed.
- Nghiệm thu A1/A4–A6/A8: không N+1; không lộ rawResult/token/User record; không
  đổi giá lịch sử khi catalog đổi; cả list/detail không có lệnh ghi.

### T4 — Contract và client Orders phía frontend (vừa, phụ thuộc T2/T3)

- Tạo module riêng dưới frontend/features/staff/orders cho DTO, parser, client
  đọc list/detail và helper URL. Không thay type mock hoặc API Product.
- Parser kiểm tra shape, enum, ngày, số tiền/số đếm/phân trang; API lỗi phải giữ
  code/status và không biến thành response rỗng. Hàm server forward session chỉ
  tới backend cấu hình; không trộn logic server-only vào bundle client.
- Dự kiến tối đa 5 file mỗi lượt; tách phần helper server sang T6 nếu vượt mức này.
- Nghiệm thu A2/A7: Node tests cho response hỏng, 401/403/409/429/503, query
  serialization, reset page và abort/timeout; không fallback mock.

### T5 — Tích hợp màn hình danh sách (vừa, phụ thuộc T4)

- Thay filterOrders bằng API cùng origin; giữ Client Component/Suspense hiện có.
  Xây URL state, debounce, bộ lọc ngày/sort, tabs/mapping 7 trạng thái và pager.
- Thay số cố định bằng summary/pagination; tách loading/empty/error/retry,
  bỏ response cũ khi filter đổi và xóa dữ liệu khi mất quyền.
- Vô hiệu hóa tạo đơn, liên kết Chi tiết bằng id thật; không chỉnh các trang mock khác.
- Dự kiến 3–5 file: OrdersList, mapping/query helpers, route entry nếu cần, browser tests.
- Nghiệm thu A2–A4/A7/A9: filter link trực tiếp, Back/Forward, search nhanh,
  hủy request, biên trang, responsive và keyboard trên browser.

**Checkpoint list end-to-end:** Staff có session thật mở danh sách MongoDB,
filters/counts đúng, không có identity mock hoặc dữ liệu fallback.

### T6 — Tích hợp chi tiết và liên kết chuyển tiếp (vừa, phụ thuộc T3–T5)

- Chi tiết Server Component gọi API thật trong Suspense, xử lý auth/notFound và
  error retry. Render item/tổng tiền/lịch sử/ship/payment đúng DTO.
- Bỏ import OrderStatusAction demo và mọi tên/ngày/note/giá hardcode trên chi tiết.
  Thiếu enrichment hiển thị trung tính; không giả ảnh/số tồn hoặc actor.
- Sửa riêng link hàng mock ở dashboard sang danh sách pending thật; không tích
  hợp lại dashboard hoặc sửa các số liệu mock ngoài phạm vi.
- Dự kiến 4–5 file: helper server Orders, detail page, dashboard link, tests/browser
  và error boundary riêng nếu cần (kiểm tra boundary hiện tại trước khi thêm).
- Nghiệm thu A4–A7/A9: list→detail→back, reload/direct link, đơn guest/offline,
  Product bị sửa/xóa, missing actor, 404 và mất quyền ở request kế tiếp.

## Kiểm tra kết thúc và bàn giao

- Chạy full backend/frontend tests, lint, TypeScript và frontend build theo spec;
  xác nhận diff không có API ghi, schema mutation, suppressions hay mock fallback.
- Browser tại 320/768/1024/1440px, zoom 200%, bàn phím; xem console/network. Dùng
  fixtures test khi cần nhưng phân biệt rõ kiểm chứng mock với session/dữ liệu thật.
- Cập nhật backend instructions, tài liệu endpoints và frontend README tương ứng
  khi triển khai; ghi bằng chứng từng checkpoint và giới hạn chưa kiểm chứng.
- Kiểm tra A1–A10. Không chạy lại check đã đạt khi chưa có thay đổi hoặc vấn đề mới.

Rủi ro cần giữ rõ: Orders API chưa tồn tại; UI mock và enum DB khác nhau; nhiều
màn hình khác vẫn mock; model thiếu assignment/note; regex không dấu có thể quét
nhiều bản ghi; offset pagination có thể dịch trang khi có đơn mới. V1 giữ các
mặc định đã nêu, không mở rộng schema/workflow/reporting để xử lý ngoài phạm vi.

## Checklist triển khai

Tất cả task **chưa thực hiện**. Yêu cầu hiện tại chỉ cho phép viết specs và plan.

- [ ] Duyệt bản thảo, đặc biệt mặc định 7 trạng thái, nguồn liên hệ snapshot và mặc định không giới hạn ngày.
- [ ] T1 — Validation/query contract; đạt A2 và focused validator tests.
- [ ] T2 — GET list, count/summary và OpenAPI; đạt A1–A3/A8, HTTP tests và query integration.
- [ ] Checkpoint backend list — endpoint và hợp đồng ổn định trước khi nối UI.
- [ ] T3 — GET detail, snapshot và batch enrichment; đạt A1/A4–A6/A8, detail HTTP tests.
- [ ] T4 — Frontend DTO/parser/API/URL helpers; đạt Node contract/error/URL tests.
- [ ] T5 — Danh sách thật, date/sort/tabs/pager và trạng thái tải/lỗi; đạt A2–A4/A7/A9 trên browser.
- [ ] Checkpoint list end-to-end — dữ liệu MongoDB và session Staff thật, không fallback mock.
- [ ] T6 — Chi tiết thật và sửa link mock dashboard; đạt A4–A7/A9 và điều hướng list/detail/back.
- [ ] Chạy full checks theo spec và ghi kết quả; không hạ chuẩn nếu có lỗi baseline.
- [ ] Đối chiếu A1–A10; cập nhật API docs/README/instructions và bàn giao giới hạn còn lại.
