# Spec: Staff analytics

26/10/2026. Người dùng duyệt [plan](../plan/staff-dashboard-plan.md) bằng yêu cầu
“làm đi”. Áp dụng D1–D10 theo đề xuất, với các định nghĩa chính xác dưới đây.

## Phạm vi và nguồn dữ liệu

Ba màn hình hiện có dùng API MongoDB thật. Exact Staff; doanh số toàn cửa hàng
hiện tại, hiệu suất chỉ actor của phiên. Không store/branch model, không chọn
Staff khác. Giữ nguyên GET `/api/v1/staff/dashboard` dùng cho auth bootstrap.
Không sửa schema, seed, payment, checkout, Orders mutation hoặc phân quyền cũ.

Doanh số = tổng subtotal snapshot các Order có paymentStatus=paid và
orderStatus thuộc completed/delivered (legacy), creationState != pending,
createdAt trong kỳ. Đây là doanh số sản phẩm theo ngày tạo đơn, không phải dòng
tiền thu trong kỳ, doanh thu ròng hoặc doanh số theo ngày hoàn thành. COD unpaid,
refunded (nếu dữ liệu cũ có), failed, cancelled không tính. Không join Payment;
nhiều Payment không làm nhân tổng. Không suy ngày từ updatedAt. Ngày/tiền/snapshot
bị thiếu hay sai ở đơn đủ điều kiện gây lỗi báo cáo, không âm thầm thành số 0.

Top tối đa 4 SKU theo tổng unitPrice*qty, group productId/variantSku, tie-break
productId/SKU. Tên lấy snapshot mới nhất trong tập hợp, không giá catalog hiện tại.
Không cần ảnh Product để báo cáo hoạt động; UI dùng biểu tượng sản phẩm trung tính.
AOV = round(revenue/orderCount), không có đơn trả null. So sánh revenue với kỳ
liền trước có cùng số ngày; kỳ trước 0 trả null. Today và month-to-date luôn theo
ngày hiện tại của server, không đổi theo kỳ người dùng chọn, được gắn nhãn riêng.

Hiệu suất: event online hợp lệ là pending→confirmed, confirmed→processing,
processing→shipping; hủy pending/confirmed→cancelled là hoạt động riêng. Chỉ event
by=User._id hiện tại, at là Date trong kỳ. Một offline completed/paid hợp lệ do
actor tạo có một event offline_sale tại createdAt; không cộng history tạo cùng đơn.
Loại creation pending ở mọi nguồn. Không gán event Customer nhận hàng cho Staff.
processedOrders = distinct Order có event xử lý hoặc offline_sale (không cancellation).
series gán mỗi đơn vào ngày event xử lý đầu tiên trong kỳ; tổng series bằng KPI.
actionCount gồm tất cả các event hợp lệ trên; cancelledOrders distinct theo event
hủy, có thể giao với processedOrders nên không cộng hai KPI thành tổng đơn.
Activity giới hạn 10 event trong kỳ, newest first, tie-break orderId/action.
Today/previousPeriod dùng cùng định nghĩa nhưng distinct trong từng kỳ riêng.
Thiếu history không tạo hoạt động giả. Không dùng AuditLog để bịa Product activity.

Không đủ nguồn tính thời gian lao động, SLA, mục tiêu, ca/kho/mã NV. Trả các KPI
chưa hỗ trợ là null, hiển thị “Chưa có dữ liệu” cùng lý do. Không tính hiệu suất
đạt/không đạt, không xuất báo cáo demo. Sidebar giữ cấu trúc, bỏ ca/kho giả.

Overview: Sales 7 ngày, today/previous-day, Performance today, backlog online
pending/confirmed/processing mọi ngày (không giới hạn kỳ báo cáo), pending preview
3 đơn mới nhất; chỉ id/orderCode/createdAt/total, không PII. Stock alerts tính SKU
active, available=stock-reservedStock; out<=0, low 0<available<=10; preview 4 SKU
sort available/productId/SKU. Ngưỡng 10 giữ tương thích API Product hiện tại.

## API contract

GET `/api/v1/staff/analytics/{overview|sales|performance}`; readCookies, requireAuth,
requireRole("staff"); no-store trước mọi middleware. Backend tự suy actor.
sales query optional dateFrom/dateTo/groupBy(day|week|month); performance chỉ dates;
overview không nhận query. Hai ngày cùng có hoặc cùng bỏ; mặc định 7 ngày tới hôm nay.
Strict YYYY-MM-DD thực, 2000–2099, tối đa 366 ngày; khoảng UTC+07 bao gồm hai ngày,
backend [start,endExclusive). Tuần bắt đầu thứ Hai. Từ chối unknown/duplicate/array/
object params, staffId/userId và range đảo. Query kỳ tương lai hợp lệ trả dữ liệu
trống nếu DB không có. Không tự cắt ngày người dùng chọn.

Envelope success `{success:true,data}`. Tất cả data có generatedAt ISO, timezone
`Asia/Ho_Chi_Minh`, scope `store` hoặc `self`. Period `{dateFrom,dateTo,groupBy}`;
summary `{revenue,orderCount,averageOrderValue}`; series `[{date,value}]` gồm bucket
rỗng 0, date là ngày đầu bucket (tuần/tháng có thể bắt đầu trước kỳ được lọc).

- Sales: period, summary, previousPeriod `{period,summary}`, growthPercent nullable,
  series, topProducts `[{productId,sku,name,quantity,revenue}]`, today và monthToDate
  `{period,summary}`.
- Performance: actor `{id,fullName}`, period, processedOrders, actionCount,
  cancelledOrders, series, previousProcessedOrders, todayProcessedOrders,
  activity `[{orderId,orderCode,action,at}]`, unsupported
  `{averageProcessingMinutes:null,onTimeRate:null,target:null}`.
- Overview: sales (Sales DTO), personal (Performance DTO hôm nay), backlog
  `{pending,confirmed,processing,total,items:[{id,orderCode,createdAt,total}]}`,
  stock `{threshold:10,low,out,total,items:[{productId,sku,name,availableStock}]}`.

400 VALIDATION_ERROR; auth errors giữ status/code cũ; dependency/data-invalid
503 ANALYTICS_UNAVAILABLE không lộ driver error. Không trả report partial giả thành
công. Aggregate dùng maxTimeMS và allowDiskUse; response/top/activity bounded.
Số tiền/số đếm phải safe integer không âm; lỗi overflow không trả số thiếu chính xác.
Đọc nhiều aggregate không phải snapshot transaction; dữ liệu có thể đổi khi đang
xem, generatedAt là thời điểm bắt đầu đọc, không cam kết snapshot atomic.

## UI và nghiệm thu

Tái dùng StaffShell/AuthProvider, workspace UI, formatCurrency và Orders links.
Client fetching no-store; filter lưu URL, Back/Forward/reload đúng; request cũ
không ghi đè request mới. Xóa data khi query/actor đổi, mất quyền hoặc refresh lỗi.
Loading/empty/error/retry rõ; 401/403 dẫn tới login/forbidden. Không demo fallback.
Auth lỗi không hiển thị số liệu của phiên cũ. Biểu đồ cột 0 không giả số dương,
ngày nhiều có vùng scroll riêng và bảng dữ liệu. Có nút tải lại dữ liệu.

Theo design.md và Dashboard/Statistics PNG local, responsive bốn viewport và zoom
200%; keyboard, nhãn date/group, focus, table semantics, sidebar active. Giữ đơn
pending và top sản phẩm có link hợp lệ; khi thiếu catalog, không dựng link SKU giả.

Kiểm thử validator/HTTP guard, MongoDB aggregate thật trên DB UUID riêng, parser/
request contracts, browser fixtures đủ data/loading/empty/error/race/auth/navigation.
Fixture không chứng minh Firebase live. Full tests/lint/tsc/build so baseline;
không nới assertions, disable lint/typecheck hoặc sửa code ngoài phạm vi để giấu lỗi.
