# Plan: Backend và tích hợp các màn hình Staff còn lại — chỉ đọc

Ngày: **22/10/2026**. Trạng thái: **bản thảo để duyệt; chưa bắt đầu code**.
Nguồn: [spec tổng quan](../specs/staff-remaining-read.md),
[Sản phẩm + Kho](../specs/staff-catalog-inventory-read.md),
[Doanh số](../specs/staff-sales-read.md),
[Hiệu suất](../specs/staff-performance-read.md),
[Dashboard](../specs/staff-dashboard-read.md).

Đây là **một file plan chung**, chứa cả task và checklist. Không tạo `tasks/`.
Giữ [plan Orders](staff-orders-read.md) và các kế hoạch UI trước đó nguyên trạng.

## 1. Phạm vi, quyết định và thứ tự

Người dùng đã xác nhận dữ liệu thật chỉ đọc và thứ tự bốn module:

1. Sản phẩm + Kho: hoàn thiện endpoint hiện có, nối list/detail/inventory.
2. Doanh số: một endpoint báo cáo vận hành, UI thực theo bộ lọc.
3. Hiệu suất: số đơn có thao tác của actor và feed audit, để trống SLA/mục tiêu.
4. Dashboard: tổng hợp có trạng thái từng phần; sửa thông tin giả trong shell.

Không mở API ghi, export, POS, đổi model/seed/role, thêm dependency hoặc tái cấu
trúc toàn dự án. Trang edit chỉ chuyển về detail. Không xây inventory endpoint
trùng dữ liệu Catalog. Không làm nặng endpoint bootstrap `/staff/dashboard`.

Giữ layer Express routers/controllers/validators/models và Next feature modules;
router Staff hiện có là điểm mount. Helper đọc domain chỉ tạo khi hai handler
thực sự dùng chung, cạnh controller; không thêm service/repository framework.
Shared date/search helpers chỉ tách nhỏ khi cần và có regression tests cho Orders.

Chuỗi triển khai:

```text
C1 → C2 → C3 → C4 → C5 → checkpoint Catalog
                         ↓
                   S1 → S2 → S3 → checkpoint Sales
                                     ↓
                               P1 → P2 → P3 → checkpoint Performance
                                                 ↓
                                           D1 → D2 → D3 → D4 → nghiệm thu
```

S1–S3 và P1–P3 độc lập về dữ liệu; vẫn giữ thứ tự người dùng đã duyệt. D1 phụ
thuộc contract/helper của Catalog/Sales/Performance, không cần gọi HTTP nội bộ.
Không giao nhiều tác vụ cùng sửa workspace router hoặc primitives đồng thời.

Các quy tắc kỹ thuật/metric trong spec là bản đề xuất: cần duyệt trước khi code,
đặc biệt cơ sở doanh số theo trạng thái paid/completed, ngày history completed,
top SKU theo gross và distinct order theo actor. Thiếu dữ liệu không tự mở schema.

## 2. Tasks Sản phẩm + Kho

### C1 — Chốt query/DTO và quy tắc tồn kho (nhỏ; không phụ thuộc)

- [ ] Định nghĩa strict Zod query/SKU, DTO allowlist, summary scopes, SKU unit và
  Setting threshold=0/default=5. Ghi API contract tĩnh trong tài liệu hiện có;
  không dựng Swagger UI runtime hoặc thêm dependency.
- Files dự kiến: `backend/src/validators/product.validator.js`, helper đọc
  `backend/src/controllers/catalog.read.js` nếu cần, `backend/tests/catalog.test.js`.
- Acceptance: C-A2/C-A3/C-A4; từ chối query sai/array/duplicate, category lạ không
  bỏ filter; stock bất hợp lệ không được sửa thành số hợp lệ khi đọc.
- Verify: từ `backend/`, `npm test -- tests/catalog.test.js`; rà DTO/query với
  consumer public và Staff trước thay handler. Tests/helper thuần không ghi DB.

### C2 — API list SKU phân trang từ DB (vừa; phụ thuộc C1)

- [ ] Hoàn thiện `getStaffProducts` theo query, aggregate variants trước paging,
  options và summary đúng scope; đọc Setting, projection, lỗi 503, sort ổn định.
- Files dự kiến: `product.controller.js`, `catalog.read.js`, `catalog.test.js`
  dưới backend theo layer C1; thêm test query DB riêng khi cần (tối đa 4–5 file).
- Acceptance: C-A1–C-A4; counts không phụ thuộc page; stock/search cùng dòng SKU;
  GET không ghi, không N+1. Không đổi public list/detail contract.
- Verify: focused test như C1; DB test biệt lập >8 SKU, nhiều variant/category,
  threshold 0/5/10, stale/missing category; ghi explain cho query chính.

### C3 — API detail Staff tách khỏi public (vừa; phụ thuộc C2)

- [ ] Thêm named Staff detail handler, bind route hiện có, bỏ raw variants/giá trị
  giả khỏi Staff response; giữ public consumer dùng handler cũ.
- Files dự kiến: `backend/src/controllers/product.controller.js`,
  `backend/src/routers/workspace.router.js`, `backend/tests/catalog.test.js` và
  test public regression hiện có hoặc file mới (tối đa 4).
- Acceptance: C-A1/C-A4/C-A6; 400/404/503 đúng; cùng SKU khớp list; no-store;
  public payload không có field Staff mới phát sinh.
- Verify: focused HTTP matrix với mock Firebase/model methods như `auth.test.js`;
  kiểm tra route public/Staff độc lập và SKU reserved characters qua HTTP.

**Checkpoint API Catalog:** list/detail contracts, auth matrix và query DB đạt
trước khi UI bỏ fallback. Không tuyên bố suite hiện có đã kiểm chứng các endpoint
này nếu chưa có tests thực sự gọi handler bằng phiên Staff hợp lệ.

### C4 — Client/parser và hai màn hình danh sách (vừa; phụ thuộc C2/C3)

- [ ] Tạo types/API/parser Catalog; tích hợp ProductsList và InventoryList với
  query URL, abort/debounce/page thật và error/retry. Bỏ mock fallback và xuất giả.
- Files dự kiến: `frontend/features/staff/catalog/types.ts`, `api.ts`,
  `frontend/features/staff/components/products-list.tsx`, `inventory-list.tsx`,
  `frontend/tests/staff-catalog.test.mjs`. Đặt URL helpers nhỏ trong api trước;
  tách task nếu cần module query riêng khiến lượt sửa vượt 5 file.
- Acceptance: C-A2/C-A3/C-A7; types từ API thật; parser từ chối DTO hỏng; summary
  và filtered total đúng nghĩa; không hiển thị dữ liệu mẫu khi 401/403/503.
- Verify: từ frontend, `node --test tests/staff-catalog.test.mjs`; browser URL,
  Back/Forward, gõ search nhanh, focus refresh, trang rỗng và >1 trang.

### C5 — Detail thật và route edit chỉ đọc (vừa; phụ thuộc C3/C4)

- [ ] Tạo server-only helper, nối detail từ DTO, chuyển direct edit về detail;
  bỏ kho/vị trí/VAT/ảnh sản phẩm thay thế không có nguồn, hiển thị description thật.
- Files dự kiến: `frontend/features/staff/catalog/server.ts`, hai route
  `frontend/app/(workspace)/staff/products/[sku]/page.tsx` và `edit/page.tsx`,
  `frontend/tests/staff-catalog.test.mjs` (tối đa 4, thêm error UI nếu cần là 5).
- Acceptance: C-A4–C-A7; session forward đúng host/cookie, no-store/Suspense,
  auth redirect/notFound không bị catch nuốt; không render form mock.
- Verify: focused frontend tests, lint/tsc cho phần thay đổi; browser list → detail,
  reload/direct edit, SKU không tồn tại và endpoint lỗi. Kiểm tra ảnh qua Next/Image.

**Checkpoint Catalog end-to-end:** C-A1–C-A7, Staff có session thật xem DB thật;
Sản phẩm và Kho cùng số SKU/ngưỡng; không mock fallback. Phân biệt bằng chứng fixture
browser với bằng chứng live MongoDB/Firebase. Không thao tác tài khoản thực để test.

## 3. Tasks Doanh số

### S1 — Công thức/bucket và validation (nhỏ; phụ thuộc checkpoint Catalog theo thứ tự)

- [ ] Định nghĩa eligible orders, recognizedAt, range/group/channel, previous,
  top gross và dataQuality theo spec. Không nhận giá/tổng từ client.
- Files dự kiến: `backend/src/validators/report.validator.js`,
  `backend/src/controllers/sales.read.js`, `backend/tests/sales.test.js`.
- Acceptance: S-A2–S-A5; schema ngày thật, timezone Việt Nam, null AOV/% khi cần;
  snapshots không thay theo catalog, không suy ra verified payment từ QR.
- Verify: từ backend `npm test -- tests/sales.test.js`; fixtures nhiều item/history,
  discount toàn bộ, duplicate history, thiếu mốc và overflow; clock cố định.

### S2 — Endpoint Sales (vừa; phụ thuộc S1)

- [ ] Tạo named handler và GET `/staff/sales`, aggregate reports, batch ảnh, DTO
  và lỗi 503; documentation contract cùng spec module.
- Files dự kiến: `backend/src/controllers/sales.controller.js`, `sales.read.js`,
  `backend/src/routers/workspace.router.js`, `backend/tests/sales.test.js`.
- Acceptance: S-A1–S-A5; không count trùng Order/discount khi unwind; chart totals
  khớp summary, các kỳ độc lập vẫn đúng. Không aggregate tiền từ Payment attempts.
- Verify: focused HTTP tests và DB integration trên database test riêng; ngày giao
  năm/tháng nhuận/UTC+07, nhiều Payment, paid nhưng chưa completed, missing history;
  so aggregate với bộ kết quả kỳ vọng tính tay và ghi explain.

### S3 — Báo cáo Sales thực trên UI (vừa; phụ thuộc S2)

- [ ] Tạo `features/staff/sales/types.ts`, `api.ts`, `components/sales-report.tsx`;
  page mỏng dùng component mới, controls đổi range/group/channel và URL thật.
- Files dự kiến: ba file feature trên, `frontend/app/(workspace)/staff/sales/page.tsx`,
  `frontend/tests/staff-sales.test.mjs` (5 file). Nếu cần sửa chart dùng chung,
  làm task D3 sớm như một điều kiện của checkpoint này, không vẽ dữ liệu giả chờ D3.
- Acceptance: S-A6 và parser cho S-A2–S-A5; error khác empty; top gross có nhãn;
  cảnh báo thiếu history; export không giả thành công.
- Verify: từ frontend `node --test tests/staff-sales.test.mjs`; browser chuyển
  day/week/month và channel, direct/reload URL, không có/0 dữ liệu, timeout/retry.

**Checkpoint Sales:** S-A1–S-A6; doanh số snapshot và bucket chứng minh bằng DB
test, UI không gọi dữ liệu ghi nhận là lợi nhuận/tiền đối soát. Khi chart toàn 0
chưa đạt thì chưa đóng checkpoint, thực hiện D3 sớm nếu primitive cần sửa.

## 4. Tasks Hiệu suất cá nhân

### P1 — Định nghĩa aggregate theo actor và DTO an toàn (nhỏ; phụ thuộc checkpoint Sales theo thứ tự)

- [ ] Tạo helper metrics distinct theo entry, kỳ/hôm nay/kỳ trước; map audit
  allowlist, giữ unavailable null. Reuse validator ngày/paging khi cùng contract.
- Files dự kiến: `backend/src/controllers/performance.read.js`,
  `backend/src/validators/report.validator.js`, `backend/tests/performance.test.js`.
- Acceptance: P-A2/P-A3/P-A4; actor/time/status cùng entry; seed audit không tăng
  KPI; không tính duration từ chênh hai timestamp, không đọc actorId từ query.
- Verify: từ backend `npm test -- tests/performance.test.js`; fixtures nhiều
  actor/ngày, thiếu by/from, from=to, history sai ngày và Mixed chứa dữ liệu nhạy cảm.

### P2 — Endpoint Performance (vừa; phụ thuộc P1)

- [ ] GET `/staff/performance`, session actor cố định, history aggregate + feed
  AuditLog paginated, batch orderCode lookup cho link hợp lệ.
- Files dự kiến: `backend/src/controllers/performance.controller.js`,
  `performance.read.js`, `backend/src/routers/workspace.router.js`,
  `backend/tests/performance.test.js` (4 file).
- Acceptance: P-A1–P-A5; không user khác; không trả raw audit/target/Mixed;
  phân trang feed độc lập KPI, thiếu logs khác DB lỗi.
- Verify: HTTP auth matrix/focus role và DB integration với hai Staff, cùng
  Order nhiều history; kiểm tra actor isolation, stable feed paging và explain.

### P3 — UI cá nhân và trạng thái chưa có dữ liệu (vừa; phụ thuộc P2)

- [ ] Tạo `features/staff/performance/types.ts`, `api.ts`,
  `components/performance-report.tsx`; route dùng report thật, feed phân trang.
- Files dự kiến: ba file trên, `frontend/app/(workspace)/staff/performance/page.tsx`,
  `frontend/tests/staff-performance.test.mjs` (5 file).
- Acceptance: P-A5/P-A6; tên thật, KPI đúng nhãn, chart ngày khác distinct cả kỳ
  được giải thích; không progress/quality badge/SLA giả; export disabled/ẩn.
- Verify: từ frontend `node --test tests/staff-performance.test.mjs`; browser hai
  phiên Staff, query date/page, feed rỗng, backend down và trực tiếp/reload route.

**Checkpoint Performance:** P-A1–P-A6, dữ liệu tách actor cả API và UI, chưa có
SLA/mục tiêu vẫn thể hiện rõ; không mở rộng schema để lấp các card trống.

## 5. Tasks Dashboard và Shell

### D1 — API overview không ảnh hưởng bootstrap (vừa; phụ thuộc C2/C3/S2/P2)

- [ ] Tạo handler overview Staff, section ready/unavailable, đọc cùng helper,
  counts/pending cũ nhất và cảnh báo SKU active; giữ bootstrap Staff/Admin nguyên dạng.
- Files dự kiến: `backend/src/controllers/dashboard.controller.js`, helper
  `dashboard.read.js` khi cần, `backend/src/routers/workspace.router.js`,
  `backend/tests/dashboard.test.js` (4 file).
- Acceptance: D-A1–D-A4; không đưa aggregate vào guard login; lỗi một phần khác
  số 0, mọi phần lỗi → 503; không cross-controller/HTTP nội bộ hoặc N+1.
- Verify: từ backend `npm test -- tests/dashboard.test.js`; spy bootstrap không
  gọi aggregate; matrix auth/no-store và faults từng phần; DB test đối chiếu
  Catalog/Sales/Performance với clock cố định và pending cũ qua nhiều ngày.

### D2 — Dashboard API client và nội dung thật (vừa; phụ thuộc D1)

- [ ] Tạo types/parser và helper server-only, kết nối page trong Suspense;
  section retry nhỏ, link id thật và stock drill-down có status active.
- Files dự kiến: `frontend/features/staff/dashboard/types.ts`, `server.ts`,
  `frontend/app/(workspace)/staff/dashboard/page.tsx`,
  `frontend/features/staff/components/dashboard-retry.tsx` nếu cần,
  `frontend/tests/staff-dashboard.test.mjs` (tối đa 5).
- Acceptance: D-A2–D-A4; DTO hỏng không render, auth lỗi không partial success,
  không tên/mục tiêu/số mẫu, không create=1 hoặc export giả.
- Verify: từ frontend `node --test tests/staff-dashboard.test.mjs`; browser
  partial fault, thử lại, tất cả lỗi, snapshot rỗng và link sang Orders/Catalog.

### D3 — Primitive chart và shell dữ liệu thật (vừa; có thể làm sớm trước checkpoint Sales)

- [ ] Làm chart empty/all-zero không NaN/bar giả, giữ data table/a11y. Shell bỏ
  ngày/initials/ca/kho cứng; đổi nhãn “Đơn đã hủy”; dùng AuthProvider và refresh
  bảo đảm không giữ nội dung khi đã xác định mất quyền.
- Files dự kiến: `frontend/features/staff/components/staff-ui.tsx`, `staff-shell.tsx`,
  component guard Staff nhỏ nếu cần, `frontend/tests/staff-dashboard.test.mjs`
  và test chart thuần nếu cần (tối đa 5). Chỉ thêm guard nếu shell hiện có chưa đủ.
- Acceptance: D-A5/D-A6, S-A5; AccountMenu không mất chức năng, chart không giảm
  accessibility, Admin/storefront không đổi theme hoặc guard.
- Verify: frontend focused tests; browser date/identity lúc reload/focus, logout,
  đổi role bằng fixture test, biểu đồ 0/empty, mobile nav và bàn phím.

### D4 — Nghiệm thu liên màn hình và cập nhật tài liệu (vừa; phụ thuộc mọi task)

- [ ] Chạy full checks theo spec tổng quan; kiểm tra dữ liệu xuyên màn hình, auth
  matrix, không cache, không request ghi. Ghi bằng chứng live/fixture tách bạch.
- Files dự kiến: tài liệu API đã dùng, `backend/AGENTS.md`,
  `backend/src/models/README.md` nếu cần giải thích giới hạn đọc,
  `frontend/README.md`, spec/plan này để ghi trạng thái (chia lượt nếu >5 file).
- Acceptance: C-A1–C-A7/S-A1–S-A6/P-A1–P-A6/D-A1–D-A6; đúng lệnh package hiện tại;
  không gọi số liệu mẫu/giới hạn chưa kiểm chứng là nghiệp vụ đã hoàn tất.
- Verify: từ root, chạy lần lượt:

  ```powershell
  npm --prefix backend test
  npm --prefix frontend test
  npm --prefix frontend run lint
  npm --prefix frontend exec -- tsc --noEmit
  npm --prefix frontend run build
  git diff --check
  ```

  Browser 320/768/1024/1440px và zoom 200%, console/network, keyboard; fresh
  load/direct/reload/back/filter/focus/logout. Test dữ liệu trên DB riêng, không
  sửa User thật để thực hiện ma trận hạ role. Nếu suite có baseline đỏ, báo rõ
  phạm vi và nguyên nhân; không bỏ test/tắt rule/đổi assertions để đạt màu xanh.

## 6. Rủi ro và quyết định không mở rộng

| Rủi ro | Cách xử lý trong phạm vi |
| --- | --- |
| Public/Staff đang chung Product detail | Tách Staff handler/DTO, test public regression; ghi riêng hardening public tồn kho |
| AGENTS/spec UI cũ khác code mới | Dùng mốc khảo sát, không bỏ qua code Product/Orders mới; cập nhật instructions khi triển khai |
| Paid chưa có paidAt/verified event; history có thể thiếu | Báo cáo theo trạng thái ghi nhận + completed history, cảnh báo coverage; không tạo bằng chứng thanh toán giả |
| SLA/ca/mục tiêu/warehouse không có schema | Unavailable/bỏ field giả; chưa mở module nhân sự/kho nâng cao |
| Regex/search, unwind/facet và history aggregate có thể scan nhiều | Bounded pagination/date range, projection, DB integration + explain; chưa cam kết latency hoặc tự thêm index |
| Nhiều query không cùng snapshot | Một asOf và quy tắc chung, ghi giới hạn concurrency; không đưa transaction vào GET |
| Dữ liệu seed mô phỏng nhìn như giao dịch thật | Không dùng seed kết luận payment/SLA production đã được xác thực |
| Rate limiter đang comment, tests/docs có thể còn kỳ vọng cũ | Ghi baseline khi chạy, không bật/tắt hoặc hạ test ngoài phạm vi read integration |

## 7. Checklist tổng để theo dõi

Tất cả task triển khai **chưa thực hiện**. Trong lượt hiện tại chỉ khảo sát và
viết Markdown; không chạy tests/build, không đọc hoặc ghi database thực.

- [x] Người dùng chốt phạm vi chỉ đọc; giữ thao tác ghi cho giai đoạn sau.
- [x] Người dùng đồng ý 4 module và thứ tự Sản phẩm + Kho → Doanh số → Hiệu suất → Dashboard.
- [x] Khảo sát routes/components, models, handlers, guard, rewrite, package và docs Next hiện có.
- [ ] Duyệt các mặc định đề xuất/giới hạn metric trong specs trước khi code.
- [ ] C1 — Query/DTO/tồn kho.
- [ ] C2 — List Catalog từ DB.
- [ ] C3 — Staff detail tách public.
- [ ] C4 — Client và hai danh sách.
- [ ] C5 — Detail và route edit chỉ đọc.
- [ ] Checkpoint Catalog — C-A1–C-A7.
- [ ] S1 — Công thức/validation Sales.
- [ ] S2 — Endpoint Sales.
- [ ] S3 — UI Sales.
- [ ] Checkpoint Sales — S-A1–S-A6; D3 làm sớm nếu chart yêu cầu.
- [ ] P1 — Actor/metrics/audit contract.
- [ ] P2 — Endpoint Performance.
- [ ] P3 — UI cá nhân.
- [ ] Checkpoint Performance — P-A1–P-A6.
- [ ] D1 — Overview API.
- [ ] D2 — Dashboard dữ liệu thật.
- [ ] D3 — Chart/shell thật.
- [ ] D4 — Full checks, browser và tài liệu.
- [ ] Bàn giao bằng chứng và các giới hạn chưa kiểm chứng, không thay scope sang chức năng ghi.
