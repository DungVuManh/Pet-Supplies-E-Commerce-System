# Spec: Staff Sản phẩm và Kho — chỉ đọc

Module: `staff-catalog-inventory-read`. Ngày: 22/10/2026. **Bản thảo chưa triển khai**.
Áp dụng toàn bộ [hợp đồng chung](staff-remaining-read.md),
[plan](../plan/staff-remaining-read.md) C1–C5. Đây là module đầu tiên đã thống nhất.

## 1. Mục tiêu và phạm vi

Staff xem được danh sách SKU, chi tiết và tồn kho thực từ Product/Category/Setting;
cùng SKU có cùng số tồn và ngưỡng giữa các màn hình. Phục vụ UC29/UC30 và tra cứu
sản phẩm. Chưa sửa trạng thái, mô tả, số lượng, giá, danh mục hoặc xuất file.

Giữ route hiện tại. Gỡ link “Chỉnh sửa sản phẩm” khỏi detail; direct URL
`/staff/products/[sku]/edit` sau bảo vệ role chuyển về detail đã encode SKU.
Không còn render `ProductEditForm` mock, không POST/PATCH. SKU không tồn tại sẽ
not-found ở detail. File demo có thể giữ nếu còn consumer; không xóa ngoài phạm vi.

## 2. Quy tắc dữ liệu

- Một dòng tương ứng **một variant/SKU**, không phải một Product document.
  `productId=String(_id)`; `sku=variants.sku`, `weight=variants.label` chỉ là nhãn
  quy cách, không suy ra đơn vị “túi/hộp”. Trạng thái `active|hidden` lấy từ
  **Product.isActive**, áp dụng mọi variant; giữ cả hàng ẩn cho Staff tra cứu.
- `physical=stock`, `reserved=reservedStock`, `availableStock=physical-reserved`.
  Đọc `Setting.findById("global")` một lần mỗi request. Có Setting: dùng đúng
  lowStockThreshold kể cả `0`; không có: dùng mặc định `5`, trả nguồn `default`.
  DB lỗi trả 503, không dùng default che lỗi và không tự tạo Setting.
  Có document nhưng ngưỡng thiếu/âm/không phải safe integer là lỗi dữ liệu 503,
  không áp mặc định schema của một document mới lên kết quả `lean()` đã hỏng.
- `out`: available = 0; `low`: 0 < available <= threshold; `available`: > threshold.
  Nếu dữ liệu DB vi phạm safe integer hoặc reserved > physical thì lỗi dữ liệu
  có kiểm soát 503 `CATALOG_DATA_INVALID`, không clamp thành số có vẻ đúng.
- Không có kho/vị trí trong models. Bỏ select kho giả, “TP.HCM”, “Kệ A1”; mô tả
  “Tồn kho hệ thống”. Không thêm đa kho hoặc lịch sử nhập/xuất.
- Category thiếu: label “Chưa phân loại”, categoryId/categorySlug null. Category
  ngừng hoạt động nhưng đang có Product tham chiếu vẫn có thể lọc Staff. Options
  gồm các danh mục đã tham chiếu; không chỉ lấy active rồi làm mất khả năng lọc.
- Ảnh thiếu trả null; hiển thị placeholder trung tính. Không dùng ảnh một sản phẩm
  khác. `description` là văn bản plain text từ field hiện có; không tách giả thành
  “mô tả ngắn” và “hướng dẫn”, không render HTML chưa được làm sạch.
  URL ảnh phải phù hợp chính sách asset/Next Image đang dùng; nguồn không được
  hỗ trợ hiển thị placeholder, không mở `remotePatterns` wildcard để tải mọi host.
- Giá là giá catalog hiện tại, VND integer; không tuyên bố “đã gồm VAT” khi chưa
  có chính sách thuế. `updatedAt` trả ISO, frontend format giờ Việt Nam.

## 3. API list dùng cho cả Sản phẩm và Kho

Giữ endpoint **`GET /api/v1/staff/products`** và `getStaffProducts`;
không thêm một API inventory chỉ để đọc cùng bảng SKU. Hai màn hình truyền cùng
filter và DTO, Kho chọn hiển thị các cột tồn kho. Tổng hợp dashboard sau này dùng
cùng helper tồn kho, không gọi list qua HTTP hoặc lấy trang 1 để tính tổng.

| Query | Contract |
| --- | --- |
| `query` | String trim, tối đa 100 ký tự; token AND, mỗi token tìm OR trên tên, brand, SKU, tên category; không phân biệt hoa/thường/dấu tiếng Việt, regex literal đã escape |
| `category` | `all` mặc định hoặc slug; slug không tồn tại trả list rỗng, không bỏ filter để trả mọi hàng; tối đa 100 ký tự, không nhận object/mảng |
| `status` | `all|active|hidden`, mặc định all |
| `stock` | `all|available|low|out`, mặc định all |
| `sort` | `updatedAt_desc` mặc định; hoặc `updatedAt_asc|name_asc|availableStock_asc`; luôn khóa phụ `productId,sku` |
| `page`, `pageSize` | Theo hợp đồng chung; áp dụng **sau** unwind/match variant và stock |

`sort=name_asc` so theo collation tiếng Việt được hỗ trợ bởi DB đích; khóa phụ
duy nhất vẫn bắt buộc. Tìm không dấu không dựa vào regex/collation tự động;
kiểm chứng cách normalize/escape, gồm đ/Đ và metacharacters. Chỉ extract helper
search của Orders sang common nếu thực sự giữ nguyên hành vi và tests Orders;
không import nguyên validator Orders vào Catalog.

Envelope `{success:true,data:{items,categories,summary,pagination,asOf}}`:

```ts
type StaffSkuItem = {
  productId: string; sku: string; name: string;
  categoryId: string | null; categorySlug: string | null; category: string;
  brand: string; weight: string; price: number;
  physical: number; reserved: number; availableStock: number;
  threshold: number; thresholdSource: "setting" | "default";
  stockStatus: "available" | "low" | "out"; status: "active" | "hidden";
  image: string | null; updatedAt: string;
};
```

- `categories`: `{id,slug,name}[]` danh mục được Product tham chiếu, unique/sort
  theo name/id, độc lập search/status/stock. Payload options có thể tăng theo số
  danh mục; đo thực tế trước khi quyết định endpoint options riêng, không tải
  toàn bộ sản phẩm về client để lập options.
- `summary`: `{totalProducts,totalActive,totalHidden,stockCounts:{available,low,out}}`.
  Giữ tên trường tương thích API Staff đang có nhưng UI nói rõ **số SKU**.
  Summary áp dụng query/category, bỏ status/stock/paging; các tổng phải cộng khớp.
- `pagination`: `{page,pageSize,total,totalPages}` áp dụng **toàn bộ** filter.
  Không dùng `items.length` hoặc summary.totalProducts làm filtered total.
- `asOf`: ISO thời điểm đọc request, không khẳng định snapshot transaction.

Pipeline: match product/category/search cần thiết → unwind variants → match SKU
và stock theo đúng token semantics → facet/count/page/summary thích hợp. Cần
chứng minh các token SKU không bị match trên hai variant khác nhau rồi trả sai
dòng; query nhiều token phải khớp cùng dòng đã flatten. Không tải toàn bộ Product
về Node rồi phân trang. Số query cố định, không query Category riêng cho mỗi SKU.
Giữ giới hạn bộ nhớ aggregate; không coi facet là transaction nhất quán với các
query Setting/options độc lập.

## 4. API detail và bảo vệ ranh giới public

Giữ **`GET /api/v1/staff/products/:sku`**, thêm handler Staff riêng có validation,
projection và DTO allowlist. `sku` decoded một lần bởi router, trim không rỗng,
tối đa 100 ký tự; không tự upper/lower vì SKU hiện tại so khớp chính xác.
Frontend dùng `encodeURIComponent` ở link và fetch. SKU với ký tự reserved cần
test xuyên Next rewrite/Express, không chỉ test helper.

Thành công giữ dạng detail hiện tại `{success:true,data:{...StaffSkuItem,description}}`.
Không trả mảng `variants` nguyên bản, `location`, `content` giả hoặc raw category.
404 `PRODUCT_NOT_FOUND`; 400 `VALIDATION_ERROR`; 503 `CATALOG_UNAVAILABLE` cho lỗi đọc.

`getProductBySku` còn được public router dùng. Trước thay đổi, xác định consumer
`frontend/features/catalog` và contract public; tách named Staff handler không
làm biến đổi public response để phục vụ UI Staff. Việc public detail đang trả
dữ liệu stock/reserved là phát hiện cần xử lý ở đợt hardening riêng; không gọi
API public để né lỗi quyền Staff, không mở thêm field Staff ra public.

## 5. Tích hợp UI và nghiệm thu

`frontend/features/staff/catalog/`: types/parser/api/query helpers. `ProductsList`
và `InventoryList` chia sẻ client + DTO, giữ component riêng theo cột và mục đích;
không dựng một bảng cấu hình tổng quát. URL lưu filters/sort/page, debounce search
300ms, Back/Forward hoạt động, đổi filter reset page. Bỏ `dataSource`, mock fallback,
nhãn “MongoDB Live” và thông báo giả “đã đưa vào hàng đợi xuất”. Export ẩn hoặc
disabled với giải thích chưa hỗ trợ. Refresh/focus tải lại, abort stale request.

Detail tiếp tục Server Component với helper `catalog/server.ts`, đọc cookie
trong Suspense; redirect auth/notFound/error theo hợp đồng chung. Nội dung nguồn
DB thật, không gán kiểu mock. Không tạo cảm giác đang chỉnh sửa trong giai đoạn đọc.

| ID | Điều kiện nghiệm thu |
| --- | --- |
| C-A1 | Matrix auth/no-store chung đúng cho list/detail và direct page; lỗi không hiển thị mock |
| C-A2 | >8 SKU thuộc nhiều Product/category; search/filter/sort/pagination đúng sau unwind, mọi tổng khớp định nghĩa |
| C-A3 | Threshold setting=0/5/10, thiếu Setting và DB Setting lỗi; 0/đúng ngưỡng/vượt ngưỡng; ba màn hình dùng cùng quy tắc |
| C-A4 | Dữ liệu thiếu ảnh/category/brand, category ẩn, SKU có ký tự cần encode, unknown category, invalid stock đều xử lý đúng |
| C-A5 | Detail/reload thật; direct edit chuyển detail; không render form mock, không có mutation hoặc xuất giả |
| C-A6 | Public handler không bị thay đổi contract ngoài ý muốn; không dùng DTO raw variants hoặc mở rộng public fields |
| C-A7 | Parser/URL/error tests, DB aggregate integration và browser responsive/keyboard đạt theo hợp đồng chung |

Giới hạn: số tồn là số đã lưu tại thời điểm đọc; chưa có quy trình reserve/release
stock hoặc cập nhật realtime. Module này không thể bảo đảm số tồn đúng với mọi
đơn hàng khi workflow ghi chưa tồn tại.
