# Spec: Staff tạo đơn bán tại quầy

Ngày 22/10/2026. Phạm vi người dùng xác nhận: khách nhận ngay, Staff xác nhận đã
thu tiền; hỗ trợ nhập khách chưa có tài khoản và tìm/chọn Customer hiện có.
Spec này mở rộng phạm vi đọc của Orders, không thay kế hoạch tích hợp các màn hình khác.
Đã triển khai trong lượt này; xem bằng chứng và giới hạn kiểm thử tại
[plan](../plan/staff-order-create.md).

## Luồng và giao diện

- CTA ở danh sách và dashboard mở `/staff/orders/new`, vẫn dùng guard/shell Staff.
- Chọn Customer bằng tìm tên/điện thoại/email (tối thiểu 2 ký tự), hoặc nhập tên,
  điện thoại, email tùy chọn. Khách nhập mới chỉ là snapshot Order, không tạo User.
- Tìm SKU đang bán, chọn variant/số lượng, xem tạm tính từ giá catalog thật.
  Không giả sản phẩm khi API lỗi; có loading/empty/error/retry.
- Chỉ thu tiền mặt CASH trong lượt này, phí giao hàng/giảm giá = 0. Xác nhận rõ
  “Đã thu đủ tiền mặt”; không giả xác minh chuyển khoản/QR hoặc tạo COD tại quầy.
- Backend kiểm tra giá đã xem trước khi thu tiền (`expectedPrice` là điều kiện
  so sánh, không phải giá dùng để ghi đơn). Giá/tồn thay đổi trả 409, yêu cầu xem lại.
- Thành công: offline/completed/paid, lịch sử ghi đúng một sự kiện tạo hoàn tất,
  có createdByStaffId từ phiên; chuyển detail ID thật. Không tạo history xử lý giả.
- Không hỏi địa chỉ giao cho đơn nhận tại quầy; giữ required address cho đơn online.
  Detail offline ghi “Nhận tại cửa hàng”, không hiển thị địa chỉ trống.
- Form hai cột nội dung/tóm tắt trên desktop, một cột ở mobile; cùng tokens,
  PageHeader, control, Button/TextField theo frontend/design.md. Đây là bố cục mới
  theo design contract, không khẳng định có node Figma tạo đơn đã được cung cấp.
- Label, field errors/focus, bàn phím, disabled khi gửi; không lưu PII vào storage.

## Contract và tính toàn vẹn

Exact Staff, session revocation/current role, no-store trên tất cả endpoint:

- GET `/api/v1/staff/order-customers?query=&page=`: chỉ role customer, tối đa 10
  kết quả/trang, page<=100; DTO id/fullName/phone/email. Query 2–100 ký tự.
- GET `/api/v1/staff/order-products?query=&page=`: active SKU còn khả dụng,
  tối đa 10 dòng/trang sau unwind; query <=100, page<=100. DTO productId/sku/name/
  variantLabel/price/availableStock; cả hai lookup trả items/page/hasMore.
- POST `/api/v1/staff/orders`: JSON, Origin/CSRF theo cơ chế hiện có;
  `Idempotency-Key` UUID. Body strict: customerId hoặc customer{name,phone,email?},
  items[{sku,qty,expectedPrice}], cashReceived=true. 1–50 SKU unique, qty 1–999,
  giá safe integer. Không nhận total/status/role/actor/discount/payment từ client.
- GET `/api/v1/staff/orders/creation/:requestId`: tra kết quả yêu cầu chỉ của
  Staff hiện tại; 404 nếu chưa tìm thấy, không có tác dụng ghi.
- Response create/recovery: `{success:true,data:{order:{id,orderCode,total,
  channel:"offline",orderStatus:"completed",paymentStatus:"paid",paymentMethod:"CASH"}}}`.
  POST lần đầu 201, replay 200. Không trả raw document hay dữ liệu khách ngoài nhu cầu.

Theo yêu cầu chuyển sang standalone ngày 22/10/2026, luồng hiện tại không dùng
transaction: đọc/kiểm tra giá và Customer, lưu Order `creationState=pending` để
giữ unique request key, trừ stock có điều kiện không xâm phạm reservedStock,
save Payment CASH paid + AuditLog actor/action/target (không PII), rồi đánh dấu
Order `creationState=complete`. Đơn pending không hiện ở list/detail/summary và
create/recovery trả 503 ORDERS_UNAVAILABLE thay vì receipt thành công.
Nếu ghi thất bại: thử hoàn các lần trừ kho đã xác nhận bằng $inc, xóa Payment/Audit
theo ID của lần tạo và xóa Order pending khi đã dọn xong. Không reset stock về
snapshot cũ. Nếu kết quả ghi stock không rõ hoặc dọn thất bại, giữ pending key và
log ID đơn để kiểm tra thủ công, không tự chạy lại. Nếu mất phản hồi lúc đánh dấu
complete thì tra lại receipt, không bù trừ vì có thể đơn đã hoàn tất.
Giới hạn: không atomic nhiều document; crash hoặc mất kết nối có thể để dữ liệu
dở dang cần đối soát thủ công. Chỉ dùng database test tách biệt để integration test;
không thay cấu hình hoặc ghi thử database ứng dụng thực.

Order thêm request ID/hash optional và unique partial index theo Staff+request ID;
đơn cũ không cần migration. Hash payload chuẩn hóa; cùng key khác payload = 409
IDEMPOTENCY_CONFLICT; retries cùng intent không trừ kho/thanh toán hai lần, kể cả
hai request đồng thời. Frontend giữ key pending trong sessionStorage (chỉ UUID),
không giữ PII; sau reload tra kết quả trước khi cho tạo tiếp. Unknown timeout giữ
nguyên payload/key để retry hoặc tra cứu, không tự tạo intent mới.

Lỗi: 400 VALIDATION_ERROR; auth 401/403/409 như hiện có; 403 CSRF_INVALID;
409 OUT_OF_STOCK/CATALOG_CHANGED/IDEMPOTENCY_CONFLICT; 404 CUSTOMER_NOT_FOUND;
503 ORDERS_UNAVAILABLE. Không expose driver errors.
Không cấp quyền Admin, đổi giá, giảm giá, vận chuyển, online payment hoặc tạo tài khoản.

## Nghiệm thu

1. Staff tạo được cả đơn guest và Customer, snapshot/tổng/actor chính xác; không tạo User.
2. Backend không tin giá/tổng/trạng thái; hàng ẩn/thiếu/hết/giá thay đổi bị từ chối.
3. Standalone ghi được Stock/Order/Payment/Audit, bù trừ lỗi đã xác định; concurrent
   sale không oversell, replay không ghi trùng, pending không giả thành công.
   Integration test riêng kiểm chứng bằng database ngẫu nhiên trên standalone.
4. Guest/Customer/Admin không gọi được API; invalid/revoked cookie, CSRF, malformed
   bodies và user role lạ được từ chối; DTO không lộ hồ sơ/PII audit.
5. Direct/reload new route, search/chọn/xóa/sửa số lượng, lỗi và thành công hoạt động;
   320/768/1024/1440px, bàn phím, không tràn body; không success giả.
6. Chạy backend/frontend tests, lint, tsc/build; ghi baseline và giới hạn live services riêng.

Nguồn: [MongoDB atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
Không biến timeout chưa rõ kết quả thành đơn thất bại chắc chắn rồi tự phát
một request ID mới. Có thể nâng lại transaction khi triển khai replica set/Atlas.
