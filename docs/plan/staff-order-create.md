# Plan: Staff tạo đơn tại quầy

Spec: [staff-order-create](../specs/staff-order-create.md). 22/10/2026.
Theo workflow CLAUDE.md; không tạo thư mục tasks hoặc tài liệu trùng Orders read.

- [x] 1. Schema/validator: CASH, optional address offline, idempotency partial index;
  strict input; focused model/validator tests. Giữ dữ liệu cũ và enum còn lại.
- [x] 2. Protected lookup APIs và create/recovery handlers theo layers hiện có;
  transaction atomic, canonical hash, conditional stock và CSRF reuse.
  Verify HTTP matrix, failure rollback/replay/money tests; DB integration riêng nếu có runtime.
- [x] 3. Typed frontend API/parser, pending intent recovery và validation; Node tests
  cho malformed responses, CSRF và request key/payload retries.
- [x] 4. UI form/search/cart/summary theo design.md, new route và hai CTA;
  cập nhật detail CASH/nhận tại cửa hàng. Verify keyboard/error/success/browser bốn viewport.
- [x] 5. Review security/data consistency; chạy full tests/lint/tsc/build, cập nhật
  instructions/README (replica set/index/new endpoints). Ghi bằng chứng và giới hạn thực tế.

Giữ kiến trúc routers/controllers/validators/models, không dependency mới. Không
sửa workflow payment/checkout khác hoặc những màn hình còn mock ngoài CTA liên quan.
Baseline trước sửa: backend 109/110 (rate limit đang comment); frontend 30/31
(registration password validation). Không bỏ test/hạ assertion để che baseline.

## Bằng chứng kiểm thử

- Backend: 128/129 đạt, chỉ lỗi rate limit giống baseline; 19 tests mới tạo đơn đạt.
- Frontend: 34/35 đạt, chỉ lỗi mật khẩu giống baseline; 4 tests API/form mới đạt.
- TypeScript, ESLint và production build đạt. Đã sửa draft search của Orders
  đồng bộ theo URL bằng reset có điều kiện khi render, thay effect setState bị lint
  báo; không tắt rule hoặc thay kiểm thử để che lỗi.
- Lượt kiểm chứng cuối dùng Node 24.22.1 cài tạm trong cache, không đổi Node hệ
  thống hoặc package/lockfiles của ứng dụng; build, lint, browser và DB integration đạt.
- MongoDB 8.0.17 replica set tạm: 5 request cùng key chỉ một lần ghi/trừ kho;
  5 request khác key tranh phần tồn còn lại không oversell hoặc tiêu reserved stock;
  lỗi AuditLog sau Order/Payment rollback toàn bộ. DB tự sinh, không đọc `.env`.
  Lookup thực cũng kiểm tra hàng ẩn/giữ chỗ không được bán, search regex literal,
  chỉ trả Customer và phân trang đúng sau unwind (15 SKU qua hai trang).
- Browser Chrome với API fixtures: cả hai loại khách, validation/focus bàn phím,
  320/768/1024/1440px không tràn body, empty/error, retry giữ key/payload,
  reload khôi phục đơn đã commit, detail CASH và guest direct route về login.
  Không có pageerror; 503/404 do fixture cố ý tạo để kiểm tra lỗi không phải lỗi ngoài dự kiến.
- Đã xem ảnh desktop/mobile; bố cục tạo đơn là composition theo design.md, không
  tuyên bố đã đối chiếu một node Figma tạo đơn chưa được cung cấp.

Giới hạn: chưa thử bằng Firebase/tài khoản hoặc MongoDB ứng dụng thực, chưa nhận
tiền thật. Chưa triển khai online payment, khuyến mãi, tạo User hoặc chỉnh quy trình
đơn online. Hai lỗi baseline vẫn cần được xử lý riêng.

Optional integration runner (công cụ test cài độc lập, không phải dependency app):

```powershell
$env:MONGODB_MEMORY_MODULE_PATH = '/absolute/path/to/mongodb-memory-server-core'
node backend/tests/staff-sale-integration.mjs
```

Runner tải MongoDB binary chính thức nếu chưa có và khởi tạo replica set tạm;
cần network/cho phép mở cổng loopback. Browser runner và cấu hình Playwright được
ghi trong frontend/README.md. Không dùng URI database thật thay cho fixture này.
