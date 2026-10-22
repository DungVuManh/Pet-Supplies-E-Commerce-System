# Specs: Tích hợp dữ liệu thật cho các màn hình Staff còn lại

Ngày khảo sát: **22/10/2026**. Mốc code: `6d1c9cc`.
Trạng thái: **bản thảo specs và plan; chưa triển khai hoặc kiểm thử tính năng**.

## 1. Phạm vi đã xác nhận

Người dùng chọn **xem/tra cứu dữ liệu thật trước**, giống phạm vi Orders; các
thao tác ghi dành cho giai đoạn sau. Người dùng cũng đồng ý chia thành bốn module
và thứ tự dưới đây. Không tạo lại thư mục `tasks/`; mọi task và checklist nằm
trong [một file plan](../plan/staff-remaining-read.md).

| Module | Màn hình | Phụ thuộc | Spec |
| --- | --- | --- | --- |
| `staff-catalog-inventory-read` | Danh sách, chi tiết sản phẩm; tồn kho; xử lý route chỉnh sửa trong chế độ chỉ đọc | Auth, Product, Category, Setting | [Sản phẩm và Kho](staff-catalog-inventory-read.md) |
| `staff-sales-read` | Doanh số toàn cửa hàng | Auth, Order; catalog chỉ bổ sung ảnh hiện tại | [Doanh số](staff-sales-read.md) |
| `staff-performance-read` | Hoạt động và hiệu suất cá nhân có thể chứng minh từ dữ liệu | Auth, Order.statusHistory, AuditLog | [Hiệu suất](staff-performance-read.md) |
| `staff-dashboard-read` | Tổng quan và thông tin chung của shell | Ba module trên; Orders hiện có | [Dashboard](staff-dashboard-read.md) |

Thứ tự triển khai được chốt: Sản phẩm + Kho → Doanh số → Hiệu suất → Dashboard.
Dependency runtime chỉ trỏ từ Dashboard đến các phép đọc của ba module; ba module
không phụ thuộc ngược vào Dashboard. Thứ tự này không yêu cầu gọi HTTP nội bộ.

Giữ nguyên [spec Orders](staff-orders-read.md) và [plan Orders](../plan/staff-orders-read.md).
Hai tài liệu Orders là bản lập kế hoạch trước đó; **không dùng câu “chưa có API
Orders” trong tài liệu cũ để mô tả hiện trạng hôm nay**. API list/detail và phần
tích hợp Orders đã xuất hiện trong code; việc nghiệm thu Orders nằm ngoài lượt này.

## 2. Bản đồ màn hình và kết quả đọc code

Các đường dẫn dưới đây tương đối với root repository.

| Route | Nguồn và hành vi hiện tại | Khoảng trống cần giải quyết |
| --- | --- | --- |
| `/staff/dashboard` | `frontend/app/(workspace)/staff/dashboard/page.tsx` dùng `mock-data`, KPI và tên/ngày cố định | Bootstrap backend chỉ trả user; chưa có tổng hợp nghiệp vụ |
| `/staff/products` | `products-list.tsx` gọi API rồi lọc trong bộ nhớ; tự chuyển sang mock khi mọi loại lỗi xảy ra | Chưa có parser đầy đủ, pagination server, error/retry; summary đếm không nhất quán |
| `/staff/products/[sku]` | Có gọi API server, nhưng thất bại thì đọc mock; gán kiểu mock `Product` cho DTO thực | Dữ liệu giả có thể che 401/403/404/503; vị trí kho và ảnh dự phòng giả sản phẩm |
| `/staff/products/[sku]/edit` | Chỉ đọc `getProduct()` mock; form lưu state cục bộ | Không triển khai ghi; cần bỏ đường dẫn tới form demo trong luồng dữ liệu thật |
| `/staff/inventory` | `inventory-list.tsx` hoàn toàn mock, số 128 và phân trang cố định | Chưa có API inventory; đang giả địa điểm kho, vị trí và đơn vị |
| `/staff/sales` | Báo cáo doanh số: KPI, chart, top SKU và tháng đều cố định | Đây **không phải POS/bán tại quầy**; `ReportControls` chưa đổi dữ liệu |
| `/staff/performance` | Tên, mã nhân viên, mục tiêu, SLA, thời gian và activity cố định | Chỉ có history actor/time và AuditLog; không có dữ liệu ca, SLA hoặc mục tiêu |
| `/staff/orders`, `/staff/orders/[id]` | Đã có handlers, validator, client, route và tests | Tái sử dụng contract hiện có; không mở rộng workflow ghi trong đợt này |
| `/staff/orders?status=cancelled` | Sidebar đặt tên “Yêu cầu hủy”, thực chất lọc đơn đã hủy | Đổi nhãn đúng ý nghĩa; không tạo module duyệt yêu cầu hủy khi model không có |
| Shell Staff | `staff-shell.tsx`: `AccountMenu` dùng session thật; tên viết tắt, lịch và ca còn hardcode | Giữ menu thật; loại thông tin nhân sự/kho không có nguồn |

Backend hiện có `/api/v1/staff/products`, `/products/:sku`, `/orders`, `/orders/:id`
trong `workspace.router.js`. `product.router.js` còn cung cấp public list/detail;
public detail và Staff detail **đang dùng chung `getProductBySku`**, trong đó có
stock/reserved và toàn bộ `variants`. Khi cải thiện Staff phải tách DTO/handler
Staff, tránh vô tình mở rộng dữ liệu nội bộ trong API công khai.

`product.controller.js` hiện flatten variants; ngưỡng `10`, vị trí “Kệ A1” và
ảnh Royal Canin dự phòng là giá trị viết cứng. `Setting.global.lowStockThreshold`
mới là nguồn cấu hình, mặc định schema là `5`. Không có model Warehouse,
StockMovement, Shift, EmployeeTarget hay CancellationRequest.

## 3. Kiến trúc bắt buộc giữ

### Backend

- Express 5.3, JavaScript ESM, Mongoose 9.11.2, Zod 4; Node 24.x/npm 11+ theo
  `backend/package.json`. Không thêm dependency hoặc tầng repository/service.
- `routers/` chỉ bind route, `controllers/` export named handlers và trực tiếp
  đọc models, `validators/` giữ Zod schemas. Helper domain nhỏ ở cùng tầng
  controller khi nhiều handler dùng thật; `common/` chỉ chứa kỹ thuật dùng chung.
- Các route Staff ở `workspace.router.js`, dùng đúng thứ tự
  `readCookies → requireAuth → requireRole("staff")`. Không thừa kế quyền Admin.
- Giữ `createApp(config)` không kết nối DB/Firebase hoặc mở listener. Không thêm
  factory controller hay dependency injection phục vụ riêng tests.
- GET không ghi DB, tạo Setting, audit, index, sửa seed hoặc cập nhật timestamps.
  Không `$out`/`$merge`; read-only aggregation, projection và `lean()` phù hợp.
- Một handler thực tế hiện có minh họa convention cần giữ:

  ```js
  export function dashboard(request, response) {
   response.json({ success: true, data: { user: publicUser(request.user) } });
  }
  ```

### Frontend

- Next 16.4.2/React 19.3, App Router, TypeScript strict, Tailwind 4; giữ
  `cacheComponents: true`, `partialPrefetching: true` và rewrite Staff hiện có.
- Route/page mỏng; UI tiếp tục trong `features/staff/components`. Mỗi module có
  `types.ts`, `api.ts` và helper cần thiết dưới `features/staff/<module>/`.
  Không nhập kiểu nghiệp vụ thực từ `mock-data.ts`.
- Giữ `StaffLayout → requireDashboardUser("staff") → AuthProvider → StaffShell`
  và boundary `Suspense` của workspace. Request API vẫn tự kiểm tra quyền; layout
  không bảo đảm quyền trong các lần điều hướng/reuse tiếp theo.
- Client đọc API cùng origin, `credentials: "include"`, `cache: "no-store"`.
  Server helper dùng `server-only`, đọc đúng session cookie và chỉ forward cookie
  đó tới `BACKEND_ORIGIN` cấu hình; không forward tùy ý host từ input.
- Session, dữ liệu cá nhân và dữ liệu nghiệp vụ không đưa vào `use cache`,
  localStorage hoặc cache dùng chung. Đọc runtime/session nằm trong `Suspense`;
  giữ mặc định framework hiện có thay vì thêm cấu hình cũ để ép dynamic.
- Tái sử dụng `AccountMenu`, `PageHeader`, `Badge`, bảng, card, chart và
  `frontend/lib/format-currency.ts`. Tách format đang ở mock chỉ khi có consumer
  thật; không refactor toàn bộ Orders để thực hiện việc này.
- Theo [design contract](../../frontend/design.md): Staff xanh, shell 232px/top
  bar 72px, token ngữ nghĩa, trạng thái đầy đủ, bàn phím và bảng dữ liệu chart.

## 4. Contract HTTP, lỗi và trạng thái dùng chung

Base URL `/api/v1/staff`. Thành công: `{ success: true, data: ... }`;
lỗi: `{ success: false, message, error: { code } }` theo `AppError` hiện tại.
Các DTO cụ thể ở từng spec; không trả raw Mongoose document/User/Payment/AuditLog.

| HTTP/code | Ý nghĩa | UX |
| --- | --- | --- |
| 400 `VALIDATION_ERROR` | Query/param không hợp lệ | Nêu bộ lọc sai; cho sửa/xóa, không fallback dữ liệu khác |
| 401 `UNAUTHENTICATED` | Thiếu/giả/hết hạn/thu hồi session | Xóa dữ liệu đã tải, về `/login` |
| 403 `FORBIDDEN` | Sai role hoặc role không hợp lệ | Xóa dữ liệu đã tải, về `/forbidden` |
| 409 `PROFILE_INCOMPLETE` | Thiếu hồ sơ | Về `/login` theo recovery hiện có |
| 404 `<RESOURCE>_NOT_FOUND` | SKU không tồn tại | Trang not-found khi mở chi tiết |
| 503 `AUTH_UNAVAILABLE` / `PROFILE_UNAVAILABLE` | Auth hoặc đọc hồ sơ lỗi | Lỗi có thử lại; không đổi thành chưa đăng nhập |
| 503 `<MODULE>_UNAVAILABLE` | DB đọc nghiệp vụ lỗi | Lỗi có thử lại; không biến thành mảng rỗng/số 0 |
| 500 `INVALID_RESPONSE` phía client | JSON hoặc DTO hỏng dù HTTP 2xx | Lỗi dữ liệu, có thử lại; không ép kiểu rồi render |

Headers no-store đã đặt ở `app.js` cho Staff **trước** CORS/body parsers;
giữ trên cả lỗi. API client giữ status/code, giới hạn thời gian request, hủy
request cũ và bỏ stale response. Aborted request do đổi filter không hiện lỗi.
Không tự retry vô hạn. Nếu nhận 429 thì xử lý lỗi chờ/thử lại, nhưng **rate limiter
đang bị comment trong `app.js`**, khác `backend/AGENTS.md`; không tuyên bố nó đang
bảo vệ endpoint hoặc tự bật lại trong phạm vi này.

Parser kiểm tra envelope và toàn bộ fields sử dụng: id, nullable, enum, ISO/date,
safe integer VND, stock/counts, pagination, chart. UI phân biệt loading, ready,
empty, error; không giữ bảng cũ như dữ liệu của filter mới. Refresh/focus gọi lại
API được bảo vệ để thấy dữ liệu/quyền hiện tại, không chỉ đọc AuthProvider.
Chưa có polling, WebSocket hoặc đồng bộ kho realtime; nói rõ “Cập nhật lúc …”.

Query list dùng pagination như Orders: `page=1`, `pageSize=8`, tối đa `50`,
`page<=10000`; `totalPages=0` khi rỗng. Page vượt cuối trả items rỗng và tổng đúng,
UI cho về trang hợp lệ, không vòng lặp request. Sort có khóa phụ duy nhất.
Từ chối query lạ, duplicate params, array/object, enum/số không hợp lệ.

Ngày báo cáo mặc định hôm nay và 6 ngày trước theo `Asia/Ho_Chi_Minh` (UTC+07),
`dateFrom/dateTo` dạng `YYYY-MM-DD`, cùng có hoặc cùng vắng, tối đa 366 ngày kể
cả hai đầu; đổi filter reset page. Backend chốt một `asOf` ISO cho request;
ngày đầu inclusive/ngày sau cuối exclusive. Không dùng timezone hệ điều hành.
Các mặc định tính toán là **đề xuất thiết kế để duyệt**, không phải nghiệp vụ đã
được người dùng xác nhận riêng.

## 5. Kiểm thử, lệnh và ranh giới

Khi triển khai, chạy từ root:

```powershell
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --noEmit
npm --prefix frontend run build
```

Khởi động local ở hai terminal bằng `npm --prefix backend run dev` và
`npm --prefix frontend run dev` sau khi cấu hình Firebase/MongoDB. Backend chưa có
script build/lint; không bịa lệnh. Tests backend dùng Vitest/Supertest, mock
Firebase/model boundary như tests hiện có; frontend dùng Node test runner với
module TypeScript thuần. Chưa có runner UI e2e trong npm scripts, không gọi
`rbac-browser.mjs` là test suite trình duyệt đầy đủ cho các module này.

Matrix bắt buộc cho **mọi endpoint**: Guest/Customer/Staff/Admin, role lạ, cookie
giả/hết hạn/bị thu hồi, hạ Staff thành Customer lúc session còn hiệu lực,
PROFILE_INCOMPLETE, Firebase/MongoDB lỗi; kiểm tra DTO và no-store kể cả lỗi.
Không chỉ mock chain rồi kết luận aggregate đúng: cần DB test riêng với nhiều
variants/đơn/history để kiểm chứng filters, counts, bucket, sort và explain.
Không chạy seed hoặc tác động dữ liệu thực để phục vụ test.

Browser: truy cập trực tiếp/reload, Back/Forward, query URL, mất quyền/focus,
logout, timeout/retry, malformed API, không flash dữ liệu trước kiểm tra quyền;
320/768/1024/1440px, zoom 200%, Tab/Enter, focus và chart toàn số 0.

- Luôn làm: validation ở boundary; DTO allowlist; kế thừa exact role; không cache;
  giữ giới hạn design và tests hiện có.
- Cần chốt trước khi mở rộng: quyền ghi sản phẩm/kho, đổi model, thư viện mới,
  nghĩa doanh số/SLA khác spec hoặc báo cáo tài chính Staff theo quyền Admin.
- Không làm: CRUD, import/export thực, upload, POS, đổi trạng thái đơn/payment,
  duyệt hủy, thay user/role, migrations, Admin dashboard, giả thành công hoặc KPI.

## 6. Nguồn và giới hạn

[SRS](../SRS.md): UC29/30, BR-03/26/28, CR-04/05/07/08/10/11. UC40/41 là
**Admin**; các trang thống kê Staff hiện có không tự động được xem là đã có đặc
tả nghiệp vụ tài chính/SLA. Đợt này chỉ đề xuất báo cáo vận hành đọc từ dữ liệu.

Kiểm tra theo `backend/src/models/`, `backend/src/controllers/`,
`backend/src/routers/`, `frontend/app/(workspace)/staff/`,
`frontend/features/staff/`, package.json và next.config.ts. `backend/AGENTS.md`
và spec UI cũ có một số mô tả trước khi Product/Orders API được thêm; code tại mốc
khảo sát là nguồn của bảng hiện trạng, không sửa các tài liệu cũ trong lượt này.

Đã đọc docs Next đóng gói trong `frontend/node_modules/next/dist/docs/` về
authentication-with-cache-components và use-search-params. Nguồn MongoDB:
[$unwind](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/)
cho xử lý variant/history và
[$dateToString](https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetostring/)
cho bucket có timezone rõ ràng. Chưa đo hiệu năng, chưa xác minh DB/Firebase thực,
chưa chạy tests/build hoặc kiểm tra giao diện cho tính năng dự kiến.
