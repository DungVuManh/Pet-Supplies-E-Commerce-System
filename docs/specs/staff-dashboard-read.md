# Spec: Staff Dashboard và Shell — chỉ đọc

Module: `staff-dashboard-read`. Ngày: 22/10/2026. **Bản thảo chưa triển khai**.
Phụ thuộc ba [module đã thống nhất](staff-remaining-read.md);
[plan](../plan/staff-remaining-read.md) D1–D4. Triển khai cuối để dùng cùng định nghĩa.

## 1. Mục tiêu và ranh giới bootstrap

`/staff/dashboard` hiển thị tổng quan thật, tên Staff thật và liên kết đến dữ
liệu thật. Shell không hiển thị ca, địa điểm, mã nhân viên hoặc ngày mẫu.

**Giữ nguyên `GET /api/v1/staff/dashboard` trả `{data:{user}}`**. Auth server
helper dùng endpoint này cho mọi trang Staff; không đưa aggregate nặng hoặc lỗi
Catalog/Report vào bootstrap khiến mọi trang không truy cập được. Admin dùng
cùng handler bootstrap hiện tại nên không sửa handler chung để trả thống kê Staff.

Thêm **`GET /api/v1/staff/dashboard/overview`**, exact Staff, query rỗng strict.
Backend đọc Order/Product/Setting/AuditLog qua helper domain cùng tầng đã có ở
các module, không gọi route HTTP nội bộ hoặc gọi controller khác bằng fake req/res.

## 2. Các khối và nguồn dữ liệu

| Khối | Nguồn/ý nghĩa | Hiển thị thiếu dữ liệu |
| --- | --- | --- |
| Chào Staff, cập nhật | AuthUser.fullName, overview.asOf giờ Việt Nam | Không gán tên/ngày mẫu |
| Giá trị hàng hoàn tất hôm nay | Sales.today.netSales + comparison ngày trước theo spec Doanh số | Missing mốc có cảnh báo; không gọi là đã đối soát |
| Đơn cần xử lý | Order.orderStatus pending/confirmed/processing, **mọi ngày tạo** | 0 khi query thành công không có đơn |
| Đơn có thao tác của bạn hôm nay | Actor từ session, định nghĩa Performance | 0 recorded, không có mẫu số mục tiêu |
| Thời gian xử lý | Không có nguồn | “Chưa có dữ liệu”, không 8,4 phút |
| Chart 7 ngày | Cùng cơ sở Sales, ngày Việt Nam, series 0 khi thiếu ngày | Không giả đường/cột nếu API lỗi |
| Cần chú ý | SKU active, availableStock<=threshold theo Catalog/Setting | Count SKU, tối đa 4 rows; không gọi là Product count |
| Đơn chờ tiếp nhận | Pending mọi ngày, cũ nhất trước createdAt/_id, tối đa 3 | Không có assignment nên bỏ “chờ bạn tiếp nhận” |

Chỉ cảnh báo kho cho **Product active** để không tính hàng đã ẩn vào vận hành
hôm nay. List Kho mặc định mọi trạng thái; link drill-down phải truyền
`status=active` và stock phù hợp để count khớp. SKU out trước, low theo available
tăng rồi productId/sku. Khi có cả hai trạng thái, dùng hai link riêng
`stock=out`/`stock=low`; không phát minh filter `stock=alert` chưa có contract.

Pending rows dùng DTO list Orders hiện có: id thật, orderCode, createdAt,
customer{name,phone}, itemCount,total,orderStatus,paymentMethod,paymentStatus,channel.
Chỉ lấy tối đa 3; click detail dùng ObjectId `/staff/orders/[id]`, không dùng
orderCode như id. Link “Xem tất cả” có số pending thật, query status=pending.
Orders cần xử lý khác pending count phải có nhãn và phân nhóm rõ ràng.

## 3. Contract overview

Envelope `{success:true,data:{asOf,timeZone,revenue,workload,personal,inventory}}`.
Mỗi phần là một union riêng:

```ts
type OverviewSection<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; code: string };
```

- `revenue.data`: `{today:SalesTotals,yesterday:SalesTotals,
  netSalesDelta:number,netSalesPercent:number|null,
  series:{dateFrom:string,dateTo:string,orderCount:number,netSales:number}[],
  excludedMissingCompletionAt:number}`; 7 ngày gồm hôm nay, channel all.
- `workload.data`: `{pending:number,confirmed:number,processing:number,
  totalNeedsProcessing:number,pendingOrders:StaffOrderListItem[]}`.
- `personal.data`: `{todayTouchedOrderCount:number,averageHandlingMinutes:null,
  dailyTarget:null,reason:"NOT_RECORDED"}`; chỉ actor đang đăng nhập.
- `inventory.data`: `{threshold:number,thresholdSource:"setting"|"default",
  activeSkuCount:number,lowCount:number,outCount:number,items:StaffSkuItem[]}`.

Auth lỗi giữ HTTP 401/403/409/503 theo hợp đồng chung và không trả data nghiệp vụ.
Sau khi auth thành công, đọc các phần độc lập; một phần lỗi trả unavailable với
code allowlist và UI lỗi/thử lại **riêng phần**, không điền 0 cho phần đó. Nếu
không phần nào đọc được, trả 503 `DASHBOARD_UNAVAILABLE`. `ready` chỉ khi mọi
đọc bắt buộc trong phần thành công. Không trả stack, lỗi driver hoặc message tùy ý.

API standalone Sales/Performance/Catalog vẫn lỗi toàn response khi dependency
của chính module lỗi. Dashboard có hợp đồng partial **tường minh**, không biến
sự khác nhau đó thành catch chung trả thành công với bất kỳ payload thiếu nào.
Frontend parser kiểm tra union từng phần trước render. Retry có thể tải lại toàn
overview v1, không cần endpoint riêng mỗi card hoặc state framework mới.

## 4. Shell và UI

Dashboard dùng Server Component với helper server-only và Suspense như detail;
khối retry tương tác nhỏ nếu cần. Không đưa protected card vào static shell trước
auth. Giữ primitive `MetricCard/BarChart/TableFrame` và token Staff; sửa primitive
chart có phạm vi để max=0/array rỗng không chia 0, không vẽ bar cao giả. Không đổi
giao diện Admin hoặc contract Orders trong nhiệm vụ này.

`StaffShell` lấy tên/initials từ AuthProvider khi ready và role staff; bỏ avatar
HN cố định. Đồng hồ ngày hiện tại format `Asia/Ho_Chi_Minh` chỉ là ngày UI, không
đại diện `asOf` dữ liệu. Xử lý runtime dưới boundary có sẵn, tránh Date render
static gây hydration mismatch. Bỏ khối “Đang trong ca 08:00–17:00 · Kho TP.HCM”
hoặc thay chú thích trung tính rằng ca làm chưa được cấu hình.

Giữ AccountMenu/logout thật. Khi focus refresh thấy mất quyền, dừng hiển thị
workspace và điều hướng đúng; AuthProvider lỗi dịch vụ không được làm nội dung
cũ trông như đã xác nhận quyền mới. Backend protected request vẫn là hàng rào
quyền chính. Không bắt query overview để đổi menu role.

Sidebar `/staff/orders?status=cancelled` đổi nhãn thành **“Đơn đã hủy”**; không
thêm màn hình duyệt yêu cầu. Nút tạo đơn hộ khách và export không khả dụng trong
giai đoạn đọc, không để `?create=1` giả như có chức năng tạo đơn.

## 5. Nghiệm thu

| ID | Điều kiện nghiệm thu |
| --- | --- |
| D-A1 | Bootstrap Staff/Admin vẫn chỉ trả public profile, không gọi aggregate, lỗi report không chặn login/menu/các trang khác |
| D-A2 | Overview exact Staff/no-store và DTO nhỏ; mọi phần cùng asOf; empty khác unavailable; lỗi một phần và tất cả phần xử lý đúng |
| D-A3 | Tổng/chart khớp Sales cùng thời điểm/quy tắc; personal cùng actor Performance; inventory ngưỡng và SKU như Catalog với status=active |
| D-A4 | Pending gồm đơn cũ, sort cũ nhất, tối đa 3, link ID thật; stock drill-down đúng status và counts; không mock fallback |
| D-A5 | Shell tên/ngày thật, không ca/kho/mục tiêu giả; “Đơn đã hủy” đúng nghĩa; logout/hạ role/focus không giữ nội dung trái quyền |
| D-A6 | Partial retry, chart toàn 0, keyboard, direct/reload và 320/768/1024/1440px đạt; Admin/Customer/storefront không bị ảnh hưởng |

Giới hạn: các đọc độc lập có thể chênh lệch nhỏ khi dữ liệu thay đổi đồng thời;
`asOf` là mốc request, không bảo đảm snapshot transaction. Không bổ sung replica
set/transaction cho báo cáo đọc ở đợt này. Chưa có workflow ghi nên số liệu phản
ánh records đã lưu, không chứng minh tồn kho/hiệu suất vận hành ngoài hệ thống.
