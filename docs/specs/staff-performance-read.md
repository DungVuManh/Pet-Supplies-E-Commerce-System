# Spec: Staff Hiệu suất cá nhân — dữ liệu ghi nhận, chỉ đọc

Module: `staff-performance-read`. Ngày: 22/10/2026. **Bản thảo chưa triển khai**.
Áp dụng [hợp đồng chung](staff-remaining-read.md), [plan](../plan/staff-remaining-read.md) P1–P3.

## 1. Mục tiêu và dữ liệu có thật

`/staff/performance` hiển thị hoạt động **của Staff đang đăng nhập** từ
`Order.statusHistory.by/at` và `AuditLog.actorId/at`. Không dùng tên “Trần Hoàng
Nam”, mã NV-024, vị trí kho hoặc ca giả. User không có employeeCode/shift.

Không coi “đơn từng xử lý” là đơn được giao cho nhân viên hay số đơn họ hoàn tất
toàn bộ; model không có assignment và clock thao tác. Seed có history/audit mô
phỏng, không đủ suy ra SLA hoặc chất lượng làm việc thật.

## 2. Định nghĩa chỉ số đề xuất

- “Đơn có thao tác của bạn”: số Order **distinct** có history `by=request.user._id`,
  `at` hợp lệ trong kỳ, `to` thuộc `confirmed|processing|shipping|delivered|completed`,
  `from` có mặt và khác `to`. Chỉ là hoạt động đã ghi nhận, không xác nhận workflow
  chuyển trạng thái hợp lệ khi cơ chế ghi chưa triển khai.
- Một đơn nhiều thao tác trong kỳ chỉ tính một lần vào KPI kỳ. Series theo ngày
  đếm distinct order trong từng ngày; một đơn hoạt động ở hai ngày xuất hiện ở
  cả hai cột. Vì vậy **không cộng series để suy ra số distinct cả kỳ**; giải thích
  ngay dưới chart, không âm thầm làm hai số có ý nghĩa khác nhau.
- Kỳ trước N ngày, “hôm nay” và delta số đơn lấy cùng actor và cùng định nghĩa.
  Không nhận actor/user ID từ client, không lấy createdByStaffId thay cho người xử lý.
- “Đơn bạn đã ghi nhận hủy”: distinct Order có history actor hiện tại, from có
  mặt và khác cancelled, to=cancelled trong kỳ. Đây không phải yêu cầu hủy đã duyệt.
  KPI hủy tách riêng, không tự cộng vào KPI thao tác ở trên.
- Thời gian xử lý trung bình, SLA đúng hạn/quá hạn, mục tiêu ngày/tuần và phần trăm
  hoàn thành **null/unavailable** vì chưa có dữ liệu. Không dùng khoảng cách hai
  status timestamp thay cho thời gian nhân viên làm việc; không tạo progress bar
  hoặc badge “đạt yêu cầu”.
- `AuditLog` chỉ phục vụ feed hoạt động, không cộng với history để tăng KPI đơn;
  không suy ra success/failed từ việc một log tồn tại. Không đếm log seed như
  một thao tác xử lý đơn của nhân viên.

Các metric dựa vào record đang có, không chứng minh toàn bộ việc làm ngoài hệ
thống. Hiển thị chú thích này kể cả khi các số bằng 0.

## 3. API và DTO

Thêm **`GET /api/v1/staff/performance`**, exact Staff. Query `dateFrom,dateTo`
theo hợp đồng chung; `page,pageSize` phân trang **feed AuditLog**, không phân trang
KPI/chart. Chưa có filter “tất cả bước xử lý” vì chưa có taxonomy công việc.

Envelope `{success:true,data:StaffPerformanceReport}`:

```ts
type StaffPerformanceReport = {
  user: { id: string; fullName: string };
  asOf: string; timeZone: "Asia/Ho_Chi_Minh";
  range: { dateFrom: string; dateTo: string };
  summary: { touchedOrderCount: number; cancelledOrderCount: number;
    todayTouchedOrderCount: number; previousTouchedOrderCount: number;
    touchedOrderDelta: number };
  series: { date: string; touchedOrderCount: number }[];
  unavailable: {
    averageHandlingMinutes: null; onTimeRate: null;
    dailyTarget: null; weeklyTarget: null; reason: "NOT_RECORDED";
  };
  activities: { id: string; at: string; label: string;
    orderId: string | null; orderCode: string | null }[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
```

KPI aggregate Order bằng `$elemMatch`/unwind+match để actor, at, to thuộc **cùng
history entry**; group distinct theo order/day. Không ghép actor ở entry A với ngày
entry B. Validate `at>=createdAt` và `at<=asOf`; entry sai bỏ khỏi phép đếm, không
đổi ngày. Có thể thiếu `by` ở entry hệ thống; bỏ khỏi KPI cá nhân, không gán cho
người đăng nhập. Query feed bắt buộc actorId MongoDB thật, sort at desc/_id desc.

Feed dùng AuditLog trong kỳ, project `_id,at,action,target` nội bộ rồi map ra DTO:
action đã biết map nhãn an toàn; `seed.sample-data` → “Khởi tạo dữ liệu mẫu”;
action lạ → “Hoạt động được ghi nhận”, không in raw string, before/after hoặc
target tùy ý. Chỉ link Order nếu collectionName=`orders`, target id là ObjectId
hợp lệ và batch lookup Order tồn tại; orderCode lấy từ DB. Không lộ log của Staff
khác/Admin qua param hoặc bằng payload Mixed. Missing target hiển thị không link.

Không thêm AuditLog mới trong GET. DB aggregate/feed/enrichment lỗi trả 503
`PERFORMANCE_UNAVAILABLE`; không che lỗi bằng “Bạn chưa làm việc”. Khi không có
record hợp lệ: series ngày 0, KPI 0, activities rỗng nhưng chú thích coverage vẫn có.

## 4. UI và nghiệm thu

Module client `features/staff/performance/`; page mỏng, report component với date
và page URL, loading/error/retry. Tái sử dụng date controls kiểu Doanh số nhưng
không hiển thị groupBy/channel không liên quan. AuthProvider hiển thị danh tính;
server luôn dùng request.user cho việc giới hạn dữ liệu.

Giữ bố cục KPI/chart/hoạt động, thay các card không tính được thành “Chưa có dữ
liệu” và lý do. Bỏ mục tiêu 210, 32, tỷ lệ đúng hạn và đánh giá giả. Chart có bảng
ngày/count; feed phân trang thật. Export ẩn/disabled. Không nhận email/phone/User
đầy đủ chỉ để in tên đầu trang.

Với khoảng ngày dài, chart và bảng ngày được cuộn trong vùng riêng có tên truy
cập được; không ép hàng trăm cột vào viewport hoặc làm tràn ngang body. Không
tự gộp tuần/tháng khiến series không còn đúng định nghĩa daily distinct ở trên.

| ID | Điều kiện nghiệm thu |
| --- | --- |
| P-A1 | Matrix auth chung; query giả staffId/actorId bị 400, không bao giờ xem dữ liệu nhân viên khác |
| P-A2 | Nhiều history/actor cùng đơn, nhiều thao tác cùng ngày và qua ngày, by thiếu, entry sai: distinct và series đúng định nghĩa |
| P-A3 | Canceled tách KPI; createdByStaffId không thay actor; thiếu history không tạo dữ liệu hiệu suất |
| P-A4 | AuditLog nhiều trang, action lạ, target xóa/sai ID, Mixed chứa secrets: feed an toàn, không rò raw before/after |
| P-A5 | Không có SLA/target => null/“Chưa có dữ liệu”, không 0 phút/0% hoặc kết luận chất lượng |
| P-A6 | Thử user khác, hạ role/focus, DB lỗi, range biên giờ Việt Nam và chart toàn 0 trên DB test/browser |

Giới hạn: chưa có taxonomy audit chính thức hoặc API ghi domain đầy đủ. Dữ liệu
ghi nhận có thể thưa; module đọc không bổ sung lịch sử quá khứ hay nâng cấp schema
nhân sự. Cần một spec nghiệp vụ riêng khi triển khai SLA, phân công hoặc mục tiêu.
