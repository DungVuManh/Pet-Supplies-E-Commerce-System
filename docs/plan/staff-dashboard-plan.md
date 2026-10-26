# Plan: Staff Tổng quan, Doanh số và Hiệu suất cá nhân

Ngày: **26/10/2026**. Nhánh thực hiện: **`trinhpk`**.
Trạng thái: **Đã được người dùng duyệt triển khai ngày 26/10/2026; đang thực hiện**.

Tham chiếu: [plan tạo đơn tại quầy](staff-order-create.md),
[spec tạo đơn tại quầy](../specs/staff-order-create.md),
[Staff workspace](../specs/staff-workspace-ui.md),
[luồng trạng thái đơn](../specs/staff-order-status.md),
[SRS](../SRS.md), [design contract](../../frontend/design.md).

## 1. Cấu trúc kế hoạch và phạm vi

File mẫu `docs/plan/staff-order-create.md` gồm liên kết spec, cập nhật nghiệp vụ,
checklist triển khai theo tầng schema/validator → backend → frontend API → UI →
kiểm chứng, sau đó bằng chứng kiểm thử và giới hạn. File spec cùng tên mô tả UI,
API contract, tính toàn vẹn, lỗi và nghiệm thu. Plan mẫu khá cô đọng; các kết quả
transaction cũ được giữ như lịch sử, cập nhật standalone mới là hành vi hiện hành.

Kế hoạch này giữ thứ tự phụ thuộc, checklist, bằng chứng và giới hạn như mẫu;
mở rộng mỗi bước thành đủ mục tiêu, công việc, file, API/DB, nghiệm thu, kiểm tra,
commit và trạng thái theo yêu cầu. Không sao chép kết quả test lịch sử thành kết quả mới.

Phạm vi là thay dữ liệu mẫu trên ba route hiện hữu bằng dữ liệu thật:

| Màn hình | Route | Kết quả cần có |
| --- | --- | --- |
| Tổng quan | `/staff/dashboard` | Tổng hợp vận hành, đơn chờ, cảnh báo tồn, chỉ số cá nhân có căn cứ |
| Doanh số | `/staff/sales` | Kỳ báo cáo thực, tổng hợp tiền/đơn, biểu đồ, sản phẩm bán chạy |
| Hiệu suất cá nhân | `/staff/performance` | Hoạt động/đơn của Staff đang đăng nhập, không lộ số liệu người khác |

Không thay checkout, payment, trừ kho, workflow Orders, quản trị Admin hoặc seed.
Không thêm KPI/SLA/ca làm giả, bảng xếp hạng nhân viên hay dữ liệu demo khi API lỗi.
Không tự thêm dependency, migration hoặc sửa dữ liệu ứng dụng để có số liệu đẹp.

## 2. Git và quy trình thực hiện

- Đã kiểm tra: working tree sạch, đang ở `trinhpk`; `dev`, `main`, `trinhpk` tồn tại.
- HEAD trước kế hoạch: `7b7c0f7`; local `dev...trinhpk` có chênh lệch `0 / 0`.
  Đây là so sánh local, không khẳng định remote dev mới nhất; không fetch/merge vì
  nhánh yêu cầu đã tồn tại và người dùng yêu cầu giữ nguyên nhánh đó.
- Chỉ stage đường dẫn liên quan; không `git add .`, reset, xóa nhánh, ghi đè hoặc push.
- Bước P0 tạo/kiểm tra/commit plan trong lượt này. **Dừng sau P0 để người dùng duyệt.**
- Sau khi được duyệt: đọc bước kế tiếp, đổi `TODO → IN_PROGRESS`, làm và kiểm tra,
  sửa lỗi thuộc bước, cập nhật `DONE` cùng bằng chứng rồi commit riêng trên `trinhpk`.
- Không đánh dấu DONE nếu còn lỗi nghiệm thu thuộc thay đổi. Lỗi có trước phải ghi
  bằng chứng baseline, phạm vi ảnh hưởng và hướng xử lý; không bỏ test để che lỗi.
- Sau mỗi commit báo tên bước, file, chức năng, kiểm tra, hash và bước tiếp theo.
  Hash commit chứa plan lấy từ Git/báo cáo sau commit, không tự chèn hash của chính
  commit đó vào nội dung để tránh vòng sửa-commit.

## 3. Phân tích hiện trạng project

### 3.1. Cấu trúc, runtime và quy ước

- Root có scripts `concurrently`; frontend/backend là hai package riêng, không phải
  npm workspace. Node 24.x, npm 11+. MongoDB cấp riêng, không có Docker Compose.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind 4; routes trong `app/`,
  nghiệp vụ trong `features/`, primitive trong `components/ui/`, helper trong `lib/`.
- Backend: Express 5 ESM, Mongoose, Zod; `routers/ → controllers/ → models/`,
  validation ở `validators/`, middleware/errors ở `common/`. Không tự dựng tầng
  repository/service backend mới. `app.js` lắp HTTP; `server.js` kết nối và tạo index.
- Đã đọc `CLAUDE.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, design contract.
  Trước viết code Next.js phải đọc guide phù hợp trong `frontend/node_modules/next/dist/docs/`.
- Một số mô tả README/CLAUDE/plan cũ đã lạc hậu: code hiện có catalog/cart/customer
  order APIs, cập nhật trạng thái chỉ tới shipping cho Staff; không lấy câu “chưa có
  API” trong tài liệu cũ làm hiện trạng. `app.js` hiện comment rate limit và dùng
  parser 10 MB, khác mô tả cũ; không sửa các điểm ngoài phạm vi trong tác vụ này.

### 3.2. Frontend Staff và tái sử dụng

| Thành phần hiện có | Kết luận / cách sử dụng |
| --- | --- |
| `app/(workspace)/staff/layout.tsx` | Server guard `requireDashboardUser("staff")`, `AuthProvider initialUser`, `StaffShell`; giữ cơ chế này |
| `features/staff/components/staff-shell.tsx` | Đã có sidebar, topbar, menu mobile, links ba màn hình; phần ca 08:00–17:00/kho TP.HCM đang hardcode |
| Ba `page.tsx` dashboard/sales/performance | Metric, thời gian, tên Staff, biểu đồ đang mẫu; không phải kết quả DB |
| `components/report-controls.tsx` | Bộ lọc chỉ đổi state/thông báo demo, chưa lọc số liệu thật |
| `features/workspace/components/workspace-ui.tsx` | Có PageHeader, MetricCard, BarChart, Badge, TableFrame, ListState, Pagination; tái sử dụng |
| `features/staff/components/staff-ui.tsx` | Re-export primitive, còn mapping enum mock `packing`; không dùng mapping này thay enum API thật |
| `features/staff/orders/api.ts`, `types.ts` | Client thật cho Orders, credentials/no-store/AbortSignal, DTO và error; tái sử dụng khi lấy danh sách đơn |
| `features/staff/products/api.ts`, `server.ts` | API sản phẩm thật; dashboard không kế thừa fallback mẫu của màn hình sản phẩm |
| `features/auth/server.ts`, `api.ts`, `auth-provider.tsx` | Hồ sơ phiên thật, redirect và API lỗi; không tạo auth riêng |
| `lib/format-currency.ts` | Dùng formatter hiện hữu; không lấy helper tiền từ mock-data |

`BarChart` hiện chia cho max và ép chiều cao tối thiểu; cần xử lý dãy toàn 0,
dãy rỗng và cột 0 đúng nghĩa khi nối dữ liệu thật, có regression cho Admin dùng chung.
Không xóa cả `mock-data.ts` vì màn hình/test khác có thể vẫn dùng.

### 3.3. API, routing, authentication và authorization

- Browser gọi relative `/api/v1/...`; `next.config.ts` đã rewrite Staff tới
  `BACKEND_ORIGIN`. Không cần thêm proxy hay lộ backend secrets ra client.
- Firebase xác thực danh tính; backend đổi ID token thành HttpOnly session.
  `readCookies → requireAuth → requireRole("staff")` kiểm revocation và tải role
  MongoDB hiện tại. Admin không mặc nhiên có quyền Staff. Actor dùng `User._id`.
- `/api/v1/staff/dashboard` hiện chỉ trả `{success:true,data:{user}}`, được dùng
  bởi guard. **Giữ nguyên contract này**, thêm endpoint analytics riêng.
- Có GET Staff Orders list/detail, POST sale và recovery, customer/product lookup,
  PATCH status, GET/PATCH products. Chưa có endpoint doanh số hoặc hiệu suất.
- List Orders có pagination, statusCounts; bỏ `creationState=pending`. Không cộng
  vài dòng của trang hiện tại để giả tổng doanh số toàn cửa hàng.
- Staff đang xem danh sách Orders toàn hệ thống; chưa có branch/store assignment.
  Quyền xem tổng doanh số toàn cửa hàng vẫn cần xác nhận, không suy từ mock dropdown.
- `app.js` đặt no-store trước middleware cho Staff, kể cả lỗi. API mới dùng error
  envelope/AppError hiện hữu. GET báo cáo không ghi DB; không thay guard CSRF của mutations.

### 3.4. Database và nguồn số liệu

14 model đăng ký: User, Address, PetProfile, Category, Product, Cart, Order,
Payment, Promotion, Review, Wishlist, Notification, AuditLog, Setting.
Nguồn trực tiếp liên quan:

| Model / trường | Dùng được | Giới hạn phải giữ |
| --- | --- | --- |
| Order: items snapshot, subtotal, total, channel, orderStatus/paymentStatus | Tổng hợp đơn và tiền lịch sử | Không dùng giá Product hiện tại để tính lịch sử; discount/shippingFee đang comment trong schema |
| Order: creationState | Loại đơn tạo dở | Dùng `$ne: "pending"` để nhận cả dữ liệu cũ thiếu trường |
| Order: createdByStaffId, createdAt | Đơn tại quầy do Staff tạo | Không đại diện người xử lý tất cả đơn online |
| Order: statusHistory `{from,to,by,at}` | Hoạt động đổi trạng thái gắn actor | Không có assignment/startedAt/SLA; customer cũng ghi sự kiện nhận hàng |
| Payment: orderId, amount, status, timestamps | Đối chiếu trạng thái thanh toán khi cần | Không có paidAt chuẩn; một order có thể có nhiều payment, tránh join nhân doanh thu |
| Product: variants stock/reservedStock, images | Tồn khả dụng, metadata hình ảnh | Dùng `stock - reservedStock`; thiếu ảnh dùng placeholder trung tính |
| AuditLog: actorId, action, target, at | Hoạt động được ghi thực sự | Sale có audit; đổi status ghi trong Order; update Product hiện không ghi actor/audit |
| User: id/fullName/role | Tên Staff từ phiên | Không có mã NV, ca, kho hay mục tiêu |
| Setting: lowStockThreshold | Model có ngưỡng mặc định 5 | Product API đang trả ngưỡng 10, cần chốt đồng bộ trước khi dùng |

Index sẵn có: Order theo customer/date, status/date, paymentStatus/status/date,
unique partial Staff/request; AuditLog actor/date; Product unique SKU và category.
Chưa có index chuyên biệt history.by/at. Chỉ đề xuất index sau explain trên dữ liệu
test, không thêm index/migration mặc định. Không đọc secrets hoặc DB ứng dụng trong lượt lập plan.

### 3.5. Thiết kế đã đọc

- Đã xem [Dashboard.png](../designs/Staff/Dashboard.png) và
  [Statistics.png](../designs/Staff/Statistics.png); ảnh Statistics chứa cả Sales và Performance.
- Giữ hierarchy: header/CTA, bộ lọc, metric cards, biểu đồ và panel phụ; Overview có
  cảnh báo kho và bảng pending; Performance có hoạt động gần nhất.
- Theo design contract: Staff xanh, Inter, semantic tokens, panel radius 8,
  sidebar 232/topbar 72; không gradient/shadow nặng; responsive 320/768/1024/1440,
  zoom 200%, bảng cuộn trong vùng riêng và biểu đồ có bảng dữ liệu truy cập được.
- Dùng ảnh local và tài liệu đã có làm nguồn trong lượt lập plan; chưa truy cập lại
  Figma live, không khẳng định đã đo hoặc khớp từng pixel với node live.
- Những số liệu, tên mẫu và “đạt yêu cầu” trên thiết kế không phải quy tắc nghiệp vụ.
  Phải duyệt thay/ẩn các khối thiếu dữ liệu trước code, giữ bố cục hợp lý.

## 4. Các quyết định nghiệp vụ cần xác nhận trước code

Người dùng xác nhận triển khai bằng “làm đi” ngày 26/10/2026. Áp dụng đề xuất D1–D10; chi tiết được đóng băng tại [spec](../specs/staff-dashboard.md).

| ID | Cần chốt | Đề xuất và lý do |
| --- | --- | --- |
| D1 | Phạm vi doanh số | Staff được xem tổng hợp toàn cửa hàng hiện tại; Performance chỉ actor phiên. Không có bộ lọc Staff khác/chi nhánh giả |
| D2 | Doanh số ghi nhận theo điều kiện/ngày nào? | Tạm đề xuất tổng `subtotal` của đơn completed và paid, loại refunded/cancelled/creation pending, xếp theo ngày tạo; ghi rõ đây là báo cáo theo ngày tạo, không gọi là tiền thu theo ngày thanh toán |
| D3 | Đơn COD completed nhưng unpaid | Không tự coi là đã thu tiền; theo D2 sẽ không tính. Nếu muốn doanh số theo hoàn thành bất kể thanh toán phải đổi định nghĩa/nhãn và test trước code |
| D4 | Legacy delivered, dữ liệu thiếu ngày/snapshot | Map trạng thái theo quy ước đọc Orders; xác nhận cách tính vào doanh số. Không tự lấy updatedAt thay ngày hoàn tất hoặc sửa dữ liệu cũ |
| D5 | Đơn đã xử lý cá nhân | Đề xuất distinct Order có sự kiện hợp lệ by = actor trong kỳ, hoặc offline do actor tạo trong kỳ; không cộng đúp cùng đơn. Cancellation tách riêng, không gọi là yêu cầu hủy được duyệt |
| D6 | Nhóm biểu đồ hiệu suất | Một Order chỉ một lần trong toàn kỳ, gán ngày sự kiện đủ điều kiện đầu tiên trong kỳ; ghi rõ quy tắc để tổng biểu đồ bằng KPI. Không coi số thao tác là số đơn |
| D7 | SLA, thời gian xử lý, mục tiêu, ca làm | Hiển thị “Chưa có dữ liệu/chưa thiết lập” hoặc ẩn khối theo duyệt; không tính chênh giữa timestamps thành thời gian lao động, không thêm model mới |
| D8 | Ngưỡng kho | V1 đề xuất dùng ngưỡng 10 giống Product API và ghi rõ tính theo SKU; không thay Settings/Product API toàn hệ thống. Nếu chọn Settings cần mở scope đồng bộ riêng |
| D9 | Kỳ và múi giờ | Đề xuất Asia/Ho_Chi_Minh (UTC+07), mặc định 7 ngày gồm hôm nay; dateFrom/dateTo bao gồm cả hai ngày, chuyển backend thành [start, nextDayEnd); tối đa 366 ngày; tuần bắt đầu thứ Hai |
| D10 | Export | Đề xuất chưa làm trong V1, bỏ nút demo hoặc ghi rõ chưa hỗ trợ. Nếu cần CSV thật, thêm bước riêng với dữ liệu cùng quyền/cùng bộ lọc và bảo vệ formula injection |

Top sản phẩm theo D2 dùng `unitPrice * qty` của snapshot, gộp productId/SKU, số lượng
ghi là “sản phẩm” thay vì tự đoán túi/quả. Nếu sau này có discount phải duyệt quy tắc
phân bổ; không gắn nhãn doanh thu ròng khi chưa đủ dữ liệu. Tỷ lệ tăng trưởng khi kỳ
trước bằng 0 trả null/“Chưa có cơ sở so sánh”, không Infinity hoặc phần trăm giả.

## 5. Contract dự kiến và phụ thuộc

Chỉ là thiết kế dự kiến, đóng băng ở P1 sau khi D1–D10 được giải quyết:

| GET endpoint mới | Dữ liệu tối thiểu |
| --- | --- |
| `/api/v1/staff/analytics/overview` | generatedAt, timezone, scope, chỉ số hôm nay, chuỗi 7 ngày, pending preview giới hạn, stock alerts giới hạn, chỉ số cá nhân |
| `/api/v1/staff/analytics/sales?dateFrom=&dateTo=&groupBy=` | kỳ hiện tại/kỳ trước, tổng tiền/số đơn/AOV, chuỗi day/week/month, top SKU, month-to-date |
| `/api/v1/staff/analytics/performance?dateFrom=&dateTo=` | actor hiện tại, distinct order count, số thao tác tách biệt, series, hoạt động gần đây giới hạn, chỉ số chưa hỗ trợ nullable có lý do |

Envelope `{success:true,data:{...}}`. Strict query Zod; từ chối staffId/userId,
unknown query, array/object, ngày không tồn tại/range đảo/quá giới hạn và groupBy lạ.
DTO allowlist không chứa Firebase UID, tokens, rawResult, request hash, audit before/after
hay thông tin khách hàng không cần thiết. Auth 401/403/409 giữ cơ chế cũ;
400 VALIDATION_ERROR, 503 ANALYTICS_UNAVAILABLE; no-store cả thành công/lỗi.
Không biến lỗi một nguồn thành số 0; nếu API overview không đủ nguồn thì trả lỗi rõ.

Thứ tự: **P0 → duyệt → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9**.
Từng bước một commit; schema không thay đổi mặc định. Số liệu aggregate tính tại
server, không tải toàn bộ Orders/PII vào browser để tự cộng.

## 6. Các bước triển khai

### P0 — Phân tích và tạo kế hoạch

- **Trạng thái:** DONE.
- **Mục tiêu:** Có kế hoạch review được trước mọi thay đổi chức năng.
- **Công việc:** Kiểm Git/nhánh; đọc file mẫu, conventions, SRS, thiết kế, route,
  auth, API/model/UI Staff; ghi khác biệt hiện trạng và quyết định chưa rõ.
- **File:** Tạo `docs/plan/staff-dashboard-plan.md`.
- **API/Database:** Chỉ đọc source; không gọi dịch vụ thật hoặc ghi DB.
- **Tiêu chí hoàn thành:** Đủ ba màn hình, mỗi bước đủ trường, dependency và gate duyệt rõ.
- **Cách kiểm tra:** Link local tồn tại, kiểm Markdown/checklist và `git diff --check`;
  xác nhận diff chỉ tài liệu, nhánh `trinhpk`.
- **Commit dự kiến:** `docs(staff): add dashboard implementation plan`.

### P1 — Chốt nghiệp vụ, contract và baseline

- **Trạng thái:** DONE.
- **Mục tiêu:** Không triển khai chỉ số dựa trên giả định chưa duyệt.
- **Công việc:** Nhận xác nhận D1–D10; ghi công thức, nguồn timestamp, phạm vi,
  các metric thiếu dữ liệu và DTO chi tiết vào spec; đọc Next guides phù hợp;
  chạy baseline tests/lint/typecheck/build trước sửa chức năng.
- **File:** Tạo `docs/specs/staff-dashboard.md`; cập nhật plan này.
- **API/Database:** Chốt ba GET mới; giữ bootstrap dashboard và model cũ.
- **Tiêu chí hoàn thành:** Không còn mơ hồ ảnh hưởng quyền/công thức; baseline có
  lệnh/exit code và phân biệt lỗi code với lỗi môi trường.
- **Cách kiểm tra:** Đối chiếu từng trường với model/write path; chạy lệnh mục 7;
  kiểm liên kết spec và trường hợp tính mẫu được người dùng duyệt.
- **Commit dự kiến:** `docs(staff): define dashboard metrics and API contracts`.

### P2 — Validation và API doanh số

- **Trạng thái:** TODO.
- **Mục tiêu:** Nguồn tổng hợp thật, có ranh giới ngày và quyền rõ ràng.
- **Công việc:** Zod query; helper kỳ/grouping riêng analytics; named controller
  aggregate Sales theo spec, so sánh kỳ trước, top SKU, month-to-date; mount route
  exact Staff; projection/no-store/error; không join Payment làm nhân số tiền.
- **File:** Tạo `backend/src/validators/staff-analytics.validator.js`,
  `backend/src/controllers/staff-analytics.controller.js`,
  `backend/src/controllers/staff-analytics.helpers.js`,
  `backend/tests/staff-analytics.test.js`; sửa `backend/src/routers/workspace.router.js`, plan.
- **API/Database:** GET analytics/sales; đọc Order, Product enrichment nếu cần; không migration.
- **Tiêu chí hoàn thành:** Tổng/series/top đúng cùng tập đơn; không fallback mock;
  dữ liệu cũ/pending/paid/refunded/cancelled theo spec; tiền không overflow âm/NaN.
- **Cách kiểm tra:** Vitest validator/HTTP 401/403/409/400/503; fake clock, biên
  UTC+07/tháng/năm, range trống, zero denominator, SKU bị xóa/đổi giá, nhiều Payment.
- **Commit dự kiến:** `feat(staff): add sales analytics API`.

### P3 — API hiệu suất theo actor hiện tại

- **Trạng thái:** TODO.
- **Mục tiêu:** Chỉ số cá nhân có thể truy nguyên, không đếm thao tác người khác.
- **Công việc:** Scope actor từ request.user._id ở query trước aggregate; kết hợp
  history và offline creation theo D5/D6; distinct order; hoạt động gần đây giới hạn
  và sort ổn định; thiếu timestamp không tự bịa; không dùng AuditLog như lịch sử đầy đủ.
- **File:** Sửa controller/helpers/validator/router/tests analytics từ P2 và plan.
- **API/Database:** GET analytics/performance; đọc Order, AuditLog chỉ nếu spec duyệt
  loại event được ghi thật. Không thêm SLA/shift/assignment schema.
- **Tiêu chí hoàn thành:** Hai Staff có kết quả độc lập; nhận hàng bởi Customer
  không thành công trạng Staff; offline không đếm hai lần; nullable có lý do rõ.
- **Cách kiểm tra:** Fixture hai Staff, một Customer, nhiều event cùng đơn/ngày,
  đơn đi qua nhiều ngày, pending sale, không có history; thử gửi staffId giả;
  kiểm DTO không trả PII/audit payload.
- **Commit dự kiến:** `feat(staff): add personal performance API`.

### P4 — API Tổng quan và kiểm chứng aggregate với MongoDB

- **Trạng thái:** TODO.
- **Mục tiêu:** Tổng quan dùng cùng công thức Sales/Performance và dữ liệu vận hành thật.
- **Công việc:** Reuse helper, không gọi HTTP nội bộ giữa controllers; pending preview
  giới hạn, status counts đúng enum, stock alerts theo D8; gắn generatedAt;
  integration test query thực, explain và ghi nhu cầu index nếu có.
- **File:** Sửa controller/helpers/router/tests analytics; tạo
  `backend/tests/staff-analytics-integration.mjs`; cập nhật plan.
- **API/Database:** GET analytics/overview; đọc Order/Product và Setting chỉ nếu D8 duyệt.
  Giữ `/staff/dashboard` trả user như cũ.
- **Tiêu chí hoàn thành:** Hôm nay/7 ngày khớp Sales; cá nhân khớp Performance;
  pending creation bị ẩn ở tất cả báo cáo; count không bị giới hạn theo preview.
- **Cách kiểm tra:** HTTP tests và MongoDB database tên ngẫu nhiên riêng; kiểm
  distinct/group/date/stock/bounds với query thật; không load .env ứng dụng,
  cleanup đúng database test. Thiếu runtime ghi chưa kiểm chứng, không tuyên bố pass.
- **Commit dự kiến:** `feat(staff): add overview analytics and database checks`.

### P5 — Frontend API, bộ lọc và trạng thái dùng chung

- **Trạng thái:** TODO.
- **Mục tiêu:** Có typed API/URL state và UI states dùng lại cho ba màn hình.
- **Công việc:** DTO/parsers, API services thuần TS theo conventions hiện hữu;
  hook quản lý date/groupBy, abort/race/retry; URL Back/Forward; refactor
  ReportControls khỏi demo. Kiểm kê helper trước khi tạo, không dựng API framework mới.
  Sửa BarChart cho empty/all-zero/zero bars và kiểm consumers hiện hữu.
- **File:** Tạo `frontend/features/staff/analytics/types.ts`,
  `services/analytics.service.ts`, `hooks/use-staff-analytics.ts`, `query.ts`,
  `frontend/tests/staff-analytics.test.mjs`; sửa `features/staff/components/report-controls.tsx`,
  `features/workspace/components/workspace-ui.tsx` và plan (đường dẫn features thuộc frontend).
- **API/Database:** Ba GET analytics qua rewrite hiện có; credentials/no-store;
  không gửi actor từ browser. Không DB writes.
- **Tiêu chí hoàn thành:** Parser từ chối response sai; không giữ dữ liệu Staff cũ
  khi 401/403; filter đổi thực sự gọi API; loading/error khác empty; không demo fallback.
- **Cách kiểm tra:** Node tests query/response/errors/abort; TypeScript, lint;
  test chart 0/rỗng và smoke consumer Admin khi sửa primitive chung.
- **Commit dự kiến:** `feat(staff): add analytics client and report controls`.

### P6 — Tích hợp màn hình Tổng quan

- **Trạng thái:** TODO.
- **Mục tiêu:** Dashboard phản ánh vận hành thật và danh tính đang đăng nhập.
- **Công việc:** Thin Server page + feature view; tên từ auth, ngày từ API; metric,
  chart, stock alert, pending table dùng DTO; link detail theo id thật; giữ CTA new.
  Loại tên/ngày/ca mẫu theo D7, không viết lại shell/navigation.
- **File:** Sửa `frontend/app/(workspace)/staff/dashboard/page.tsx`; tạo
  `frontend/features/staff/analytics/components/overview-view.tsx`;
  sửa `features/staff/components/staff-shell.tsx` chỉ phần ca mẫu/aria-current khi cần;
  tạo `frontend/tests/staff-dashboard-browser.mjs`; cập nhật plan.
- **API/Database:** GET overview; reuse Orders list/detail links; không ghi DB.
- **Tiêu chí hoàn thành:** Không import data mock; đầy đủ loading/empty/error/retry;
  pending count/links nhất quán, thiếu dữ liệu không hiển thị thành số 0 giả.
- **Cách kiểm tra:** Browser fixtures và manual API thật nếu có tài khoản được cấp;
  tên khác nhau, không đơn, kho trống, API lỗi, direct/reload, bốn viewport, keyboard.
- **Commit dự kiến:** `feat(staff): implement staff overview`.

### P7 — Tích hợp màn hình Doanh số

- **Trạng thái:** TODO.
- **Mục tiêu:** Filter và số liệu Sales đến từ backend thực.
- **Công việc:** Nối controls/metric/series/top SKU/month-to-date; dùng tiền VND
  chuẩn và nhãn theo D2; placeholder ảnh khi thiếu, không giả catalog; xử lý so sánh
  kỳ 0; bỏ DemoAction export theo D10; bảo toàn layout thiết kế.
- **File:** Sửa `frontend/app/(workspace)/staff/sales/page.tsx`; tạo
  `frontend/features/staff/analytics/components/sales-view.tsx`;
  mở rộng tests analytics và browser P6; cập nhật plan.
- **API/Database:** GET sales theo dateFrom/dateTo/groupBy; không truy vấn DB trực tiếp từ UI.
- **Tiêu chí hoàn thành:** Filter cập nhật KPI/chart/top cùng kỳ, refresh/Back/Forward
  đúng, không đè response mới bằng response cũ; loading/empty/error/retry đầy đủ.
- **Cách kiểm tra:** Kỳ không đơn, chỉ unpaid, paid, refund, ngày biên, top SKU thiếu
  Product, day/week/month; đối chiếu tổng trên fixture và DB test; responsive/accessibility.
- **Commit dự kiến:** `feat(staff): implement staff sales dashboard`.

### P8 — Tích hợp Hiệu suất cá nhân

- **Trạng thái:** TODO.
- **Mục tiêu:** Hiển thị đúng công việc được ghi nhận của Staff hiện tại.
- **Công việc:** Nối identity/period/distinct counts/series/activity; giải thích
  định nghĩa đơn đã xử lý; thay KPI SLA/target không có nguồn theo D7;
  không dựng hoạt động cập nhật Product nếu không có audit tương ứng.
- **File:** Sửa `frontend/app/(workspace)/staff/performance/page.tsx`; tạo
  `frontend/features/staff/analytics/components/performance-view.tsx`;
  mở rộng tests analytics/browser; cập nhật plan.
- **API/Database:** GET performance scoped server actor; không có dropdown xem Staff khác.
- **Tiêu chí hoàn thành:** Không tên/mã NV/kho/thời lượng giả; không lộ activity
  người khác; distinction đơn và thao tác rõ; có loading/empty/error/retry.
- **Cách kiểm tra:** Hai tài khoản Staff/fixture actor khác nhau, customer completion,
  nhiều thao tác cùng Order, phiên hết hạn/đổi role, filter/reload và responsive.
- **Commit dự kiến:** `feat(staff): implement personal performance dashboard`.

### P9 — Kiểm tra tổng thể và bàn giao

- **Trạng thái:** TODO.
- **Mục tiêu:** Ba màn hình nhất quán, có bằng chứng kiểm chứng và không phá luồng cũ.
- **Công việc:** Kiểm navigation/sidebar active, quyền direct route/API, số liệu giữa
  màn hình, states, responsive/keyboard; full checks; cập nhật tài liệu API và README;
  review diff chỉ phạm vi, không secrets/no mock fallback; ghi giới hạn live tests.
- **File:** Cập nhật `docs/specs/staff-dashboard.md`, plan,
  `frontend/README.md`, `backend/AGENTS.md`; test files từ các bước trước và sửa
  đúng file có regression nếu phát hiện. Không sửa rộng tài liệu/code ngoài phạm vi.
- **API/Database:** Hồi quy auth bootstrap, Orders read/create/status và Product update;
  xác minh mọi analytics read-only và no-store.
- **Tiêu chí hoàn thành:** Tất cả bước trước DONE; checks liên quan đạt; chênh lệch
  thiết kế do thiếu nghiệp vụ đã duyệt; mọi giới hạn/lỗi baseline ghi trung thực.
- **Cách kiểm tra:** Các lệnh mục 7, browser full flow, DB integration, xem ảnh và
  console/network; không gọi fixtures là bằng chứng Firebase/DB production thật.
- **Commit dự kiến:** `test(staff): verify dashboards and document integration`.

## 7. Chiến lược kiểm tra và bằng chứng

Chạy từ root khi triển khai, không cần chạy build cho riêng lượt viết tài liệu:

```powershell
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --noEmit
npm --prefix frontend run build
git diff --check
```

Focused: `npm --prefix backend test -- tests/staff-analytics.test.js` và
`node --test frontend/tests/staff-analytics.test.mjs` sau khi tạo file.
Browser runner theo pattern có sẵn dùng Playwright cài riêng, không tự thêm dependency.
API fixtures chỉ dùng trong tests. Live smoke cần session Staff hợp lệ và môi trường
cho phép; không seed/chỉnh role hoặc nhận tiền thật để kiểm tra dashboard.

Ma trận bắt buộc: guest/customer/admin/Staff, revoked session, đổi role, dữ liệu
Staff A/B; paid/unpaid/refunded/cancelled/pending creation/legacy; ngày UTC+07,
kỳ trước 0, tiền lớn, nhiều events/Payment, thiếu Product/history; API 400/401/403/
409/503, response hỏng, chậm/abort/race; direct/reload/Back/Forward và navigation
ba màn hình; 320/768/1024/1440px, zoom 200%, bàn phím, bảng dữ liệu biểu đồ.

Baseline cũ trong tài liệu nhắc lỗi rate-limit, password và CSS build; **chưa chạy
lại trong lượt lập plan**, không khẳng định chúng còn tồn tại hoặc đã hết.

| Bước | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| P0 | DONE | Đọc source/thiết kế local; Git sạch trên trinhpk trước sửa; kiểm Markdown/link/diff trước commit |
| P1–P9 | TODO | Chưa chạy test/build/browser/DB integration cho chức năng; chờ duyệt |

## 8. Checklist bàn giao

- [x] P0 — Phân tích, tạo kế hoạch; không sửa code chức năng.
- [x] Người dùng duyệt kế hoạch và giải quyết D1–D10.
- [x] P1 — Spec/contract/baseline.
- [ ] P2 — Sales API.
- [ ] P3 — Performance API.
- [ ] P4 — Overview API và MongoDB integration.
- [ ] P5 — Client/controls/states/chart.
- [ ] P6 — Tổng quan.
- [ ] P7 — Doanh số.
- [ ] P8 — Hiệu suất cá nhân.
- [ ] P9 — Tổng kiểm chứng và bàn giao.

**Tiếp tục theo từng bước đã duyệt; mỗi bước hoàn thành có commit riêng trên `trinhpk`. Không push.**

### Bằng chứng P1 (26/10/2026)

Đã duyệt D1–D10, tạo spec chi tiết và đọc Next guides về client fetching,
useSearchParams/Suspense và auth với Cache Components. Không đổi code chức năng.
Baseline: backend ngoài sandbox 172/182 đạt (10 lỗi: app 2, auth 3, cart 1,
models 1, order-status 1, seed 2); lần sandbox bị EACCES loopback không dùng làm
baseline nghiệp vụ. Frontend tests exit 1 (Auth password/Catalog); lint exit 1
(3 errors, 17 warnings); tsc exit 1 (7 lỗi Admin roleLabel/CartSummary).
Build exit 1 cả trong/ngoài sandbox: Turbopack CSS worker exited before connect.
Các lỗi này có trước triển khai Staff; không tự sửa ngoài phạm vi hoặc hạ kiểm tra.