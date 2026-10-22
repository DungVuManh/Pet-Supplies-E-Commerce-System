# Spec: Staff Doanh số — chỉ đọc

Module: `staff-sales-read`. Ngày: 22/10/2026. **Bản thảo chưa triển khai**.
Áp dụng [hợp đồng chung](staff-remaining-read.md), [plan](../plan/staff-remaining-read.md) S1–S3.

## 1. Mục tiêu và giới hạn nghiệp vụ

Thay số mẫu trên `/staff/sales` bằng báo cáo vận hành từ snapshot Order. Đây là
trang **thống kê doanh số**, không phải POS. Không tạo đơn offline, ghi Payment,
xuất file, tính lợi nhuận, doanh thu thuế hoặc hoàn tiền.

UC41 trong SRS thuộc Admin, không tự cấp báo cáo tài chính Admin cho Staff.
Đề xuất ở đây là đọc **giá trị đơn hoàn tất đang được ghi nhận đã thanh toán**
của cửa hàng, như màn hình Staff hiện có. Nhãn và trợ giúp cần nói đúng cơ sở
này; không quảng bá là số liệu kế toán hay tiền đã đối soát ngân hàng.

## 2. Quy tắc tính đề xuất để duyệt

- Đơn đủ điều kiện: `orderStatus=completed` và `paymentStatus=paid`, cả online và
  offline. Không chỉ loại cancelled rồi cộng mọi trạng thái còn lại.
- Thời điểm ghi nhận `recognizedAt`: mốc history `to=completed` hợp lệ đầu tiên
  của đơn, không trước createdAt và không sau `asOf`. Không dùng updatedAt,
  vì cập nhật sau đó không phải ngày hoàn tất. Thiếu/sai timestamp: loại khỏi
  doanh số theo kỳ, trả số cảnh báo `excludedMissingCompletionAt` toàn bộ đơn đủ
  trạng thái và channel đã chọn nhưng thiếu mốc hợp lệ; số này không giới hạn kỳ
  vì không có ngày để xếp kỳ. Không tự lấy ngày hôm nay thay thế.
- Lưu ý: model chưa có `paidAt` hoặc bằng chứng callback đã verified. Kết quả chỉ
  dựa vào trạng thái đã lưu; không suy ra paid từ Payment QR, paymentMethod,
  statusHistory hay trạng thái hoàn tất. Không join Payment để cộng tiền vì một
  đơn có thể có nhiều lần thanh toán. Mốc ghi nhận có thể không phản ánh ngày
  nhận tiền nếu paymentStatus được cập nhật sau ngày hoàn tất.
- Giá trị hàng trước giảm = tổng subtotal. Giảm giá = tổng discount. Giá trị hàng
  sau giảm = tổng `(subtotal-discount)`; không gồm shippingFee. Giá trị TB =
  giá trị hàng sau giảm / số đơn, làm tròn VND một lần khi trả DTO; không có đơn
  trả null, UI “—”. Miễn phí hoặc giảm toàn bộ vẫn được tính là một đơn đủ điều kiện.
- So sánh kỳ: N ngày ngay trước N ngày đang chọn theo giờ Việt Nam. Delta tuyệt
  đối luôn có; phần trăm null khi kỳ trước = 0 (kể cả hiện tại = 0), UI “Không có
  cơ sở so sánh”, không Infinity hoặc +100% tùy tiện.
- KPI hôm nay và month-to-date lấy từ cùng `asOf`, độc lập range đang chọn và có
  nhãn riêng rõ ràng. Mọi tổng tiền là safe integer VND; nếu cộng dồn vượt giới
  hạn trả 503 `SALES_DATA_INVALID`, không làm tròn sai âm thầm.
- Các khoản dùng Order snapshot; đổi giá/tên catalog không đổi doanh số lịch sử.
  Top SKU xếp theo **giá trị hàng trước giảm** `sum(unitPrice*qty)`, tie theo SKU;
  không gọi số này là doanh thu thuần vì discount chỉ có ở mức Order. Không phân
  bổ giảm giá giả cho từng item, không hiển thị tỷ trọng top/gross trên tổng net.

Các quy tắc trên là mặc định đề xuất; trước triển khai cần duyệt nghĩa doanh số
và ngày ghi nhận. Không thêm schema/payment workflow để cố lấp thiếu dữ liệu.

## 3. API và DTO

Thêm **`GET /api/v1/staff/sales`** trong workspace router với middleware Staff.
Query `dateFrom,dateTo` theo hợp đồng chung; `groupBy=day|week|month` mặc định day;
`channel=all|online|offline` mặc định all. Không nhận staffId hoặc customerId.
Group tuần bắt đầu thứ Hai; bucket là phần giao với kỳ chọn, tháng cũng vậy.
Nhóm theo timezone Việt Nam, bucket thiếu dữ liệu điền 0 sau khi aggregate thành
công. Không trả một bucket 0 cho request DB lỗi.

Envelope `{success:true,data:StaffSalesReport}`:

```ts
type SalesTotals = {
  orderCount: number; grossSales: number; discount: number;
  netSales: number; averageOrderValue: number | null;
};
type StaffSalesReport = {
  asOf: string; timeZone: "Asia/Ho_Chi_Minh";
  range: { dateFrom: string; dateTo: string; groupBy: "day" | "week" | "month";
    channel: "all" | "online" | "offline" };
  summary: SalesTotals;
  previous: { dateFrom: string; dateTo: string; summary: SalesTotals };
  comparison: { netSalesDelta: number; netSalesPercent: number | null };
  today: SalesTotals; monthToDate: SalesTotals;
  series: { dateFrom: string; dateTo: string; orderCount: number; netSales: number }[];
  topItems: { variantSku: string; name: string; qty: number;
    grossSales: number; currentImage: string | null }[];
  dataQuality: { excludedMissingCompletionAt: number };
};
```

`today/monthToDate` giữ channel đã chọn. Summary/previous/series/topItems dùng cùng
eligibility, recognizedAt và range tương ứng; sum(series.netSales)=summary.netSales.
TopItems tối đa 4, key SKU; tên từ snapshot gần nhất theo recognizedAt/orderId,
không lấy tên hiện tại để thay lịch sử. Enrichment ảnh hiện tại batch tối đa 4
SKU, thiếu ảnh trả null. DB enrichment lỗi phải trả 503 hoặc lỗi bộ phận rõ ràng;
v1 chọn **503 toàn báo cáo**, không che bằng “sản phẩm không có ảnh”.

Controller/validator mới theo layer hiện có; helper `sales.read.js` cạnh controller
chỉ khi dùng chung với Dashboard, không mở tầng analytics platform. Aggregate trên
MongoDB, không tải mọi đơn rồi group trong frontend/Node; match status trước,
tính recognizedAt, match kỳ cần thiết, aggregate totals/buckets/top. Các kỳ today,
monthToDate, previous phải được bao phủ, không chỉ đọc range rồi suy ra các kỳ khác.
Không count trùng đơn khi unwind items/history; không sum discount cho mỗi item.
Phải kiểm tra snapshot subtotal/items và số tiền bất hợp lệ trước khi phát report.
Lỗi 400 theo hợp đồng chung; DB 503 `SALES_UNAVAILABLE`.

## 4. UI và nghiệm thu

`features/staff/sales/` chứa types/parser/API/query; `/staff/sales` giữ page mỏng,
report component quản lý URL/date/group/channel và các trạng thái. Thay
`ReportControls` bằng controls hoạt động thật, không chỉ thay selected label.
Reuse style và primitives; không buộc Performance phải có groupBy nếu không cần.

Giữ chart/bảng, KPI và danh sách top; sửa nội dung nhãn theo định nghĩa trên,
bỏ lợi nhuận/% mẫu. Chart trống hiển thị thông báo; toàn 0 không tạo NaN hoặc bar
cao giả tối thiểu như có doanh số. Export ẩn/disabled, không demo success. Nếu
dataQuality > 0 hiện cảnh báo đơn thiếu mốc đã bị loại và phạm vi số liệu chưa đủ.

| ID | Điều kiện nghiệm thu |
| --- | --- |
| S-A1 | Matrix quyền/lỗi/no-store; Staff xem báo cáo của cửa hàng, Admin bị từ chối endpoint Staff |
| S-A2 | Pending/failed/unpaid/cancelled không vào báo cáo; nhiều Payment không nhân doanh số; thiếu lịch sử có cảnh báo |
| S-A3 | Snapshot giá, discount=0/toàn bộ, nhiều item, nhiều SKU, sửa/xóa catalog vẫn tính đúng |
| S-A4 | Biên UTC+07, tuần qua năm, tháng nhuận, 366 ngày, kỳ trước, ngày thiếu, range sai; nhóm có tổng bằng summary |
| S-A5 | Kỳ trước=0/null AOV, toàn 0 và overflow không NaN/Infinity; top gross không bị gọi là net |
| S-A6 | Controls đổi request/URL thật; browser responsive/keyboard/error/retry và DB integration theo hợp đồng chung |

Giới hạn: chưa có ngày thanh toán xác thực, hoàn tiền hoặc sổ kế toán. Seed có dữ
liệu mô phỏng; báo cáo từ database development không chứng minh nghiệp vụ thanh
toán production đã vận hành. Chưa có index recognizedAt; đo explain trước khi
đề xuất bổ sung index hoặc field vật hóa riêng.
