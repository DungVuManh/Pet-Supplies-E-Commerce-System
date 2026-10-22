# Staff cập nhật trạng thái đơn hàng

Phạm vi được chốt trong chat: chỉ triển khai phần Staff. Luồng đơn online:
`pending → confirmed → processing → shipping`; chỉ hủy từ `pending`/`confirmed`.
`processing` hiển thị “Đang chuẩn bị”. Khách xác nhận nhận hàng để hoàn thành là
bước triển khai riêng; Staff không được chuyển sang `delivered`/`completed`.
Đơn offline đã hoàn thành tiếp tục chỉ đọc. Trạng thái `delivered` cũ vẫn đọc được.

## Hợp đồng và quy tắc

- PATCH `/api/v1/staff/orders/:id/status`, đúng role Staff, JSON/Origin/CSRF,
  no-store kể cả lỗi. Body strict: `{ expectedStatus, orderStatus, shipping? }`.
  Shipping chỉ nhận khi chuyển sang `shipping`; carrier/trackingNumber tùy chọn,
  trim, tối đa 100 ký tự mỗi trường. Không tích hợp API vận chuyển.
- GET chi tiết trả thêm `allowedNextStatuses`, do backend quyết định.
- Khi xác nhận: kiểm tra snapshot/liên hệ hợp lệ, tồn khả dụng hiện tại đủ cho
  các SKU; ONLINE yêu cầu paymentStatus đã là `paid`. Kiểm tra kho chỉ là kiểm tra
  tại thời điểm đọc, không phải giữ hàng hay cam kết kho dưới cạnh tranh.
- Chỉ ghi trạng thái và lịch sử `{from,to,by,at}` do server xác định. Không đổi
  tồn kho, giữ chỗ, thanh toán hoặc số tiền. Không có migration dữ liệu.
- Một update có điều kiện theo trạng thái hiện tại ghi trạng thái + history cùng
  document Order, dùng được trên MongoDB standalone. History là audit nguyên tử
  của thao tác này, không ghi thêm collection AuditLog bằng một write rời rạc.
- 400 VALIDATION_ERROR; 404 ORDER_NOT_FOUND; 409 ORDER_STATUS_CONFLICT,
  INVALID_ORDER_TRANSITION, ORDER_NOT_CONFIRMABLE, PAYMENT_NOT_VERIFIED,
  OUT_OF_STOCK; 503 ORDERS_UNAVAILABLE. Không lộ driver error.
- Request trùng/cạnh tranh chỉ một lần ghi được; request cũ nhận 409, không ghi
  lặp lịch sử. Mất phản hồi/timeout: giao diện yêu cầu tải lại trước khi gửi tiếp.

## Giao diện và kiểm chứng

Chi tiết đơn dùng Staff shell/token sẵn có, chọn các bước hợp lệ, nhập vận chuyển
tùy chọn, xác nhận trước khi gửi, khóa gửi lặp, hiển thị lỗi/thành công và tải lại
badge/lịch sử từ server. Không giả thông báo thành công khi chưa lưu.

Code: validators/order.validator.js, controllers/order-status.controller.js,
routers/workspace.router.js, model Order và feature Staff Orders frontend.
Không thêm dependency, không sửa luồng tạo đơn tại quầy.

Kiểm chứng: Node 24 chạy `node_modules/vitest/vitest.mjs run` trong backend;
frontend `npm test`, `npm run lint`, `tsc --noEmit`, `npm run build`;
browser fixture kiểm tra chuyển trạng thái/refresh/conflict/terminal và bàn phím.
Chạy browser bằng `node frontend/tests/staff-order-status-browser.mjs` từ root,
với `PLAYWRIGHT_MODULE_PATH` trỏ tới Playwright đã cài; dùng các cổng riêng 3023/3133.
Baseline đã biết: test rate-limit backend và test mật khẩu frontend đang lỗi;
Turbopack production build lỗi worker CSS. Không bỏ assertions để né các lỗi này.

Nguồn kỹ thuật: [MongoDB single-document atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/),
[Mongoose update validators](https://mongoosejs.com/docs/validation.html#update-validators).
