# Staff chỉnh sửa sản phẩm

Theo yêu cầu trong chat, Staff sửa trạng thái bán, số lượng thực tế của SKU và
một ô mô tả duy nhất. Người dùng đã chọn gộp “Mô tả ngắn”/“Nội dung hướng dẫn”.
Tên, giá, danh mục, thương hiệu, quy cách, ảnh và số giữ chỗ chỉ đọc. Trạng thái và
mô tả thuộc Product, áp dụng cho mọi SKU; số lượng chỉ đổi ở SKU đang mở.

## Hợp đồng

GET `/api/v1/staff/products/:sku` cung cấp dữ liệu thật cho trang chi tiết/chỉnh sửa,
thêm `description` chuẩn. Không dùng mock để che lỗi tải sản phẩm trên hai trang này.

PATCH cùng đường dẫn, đúng role Staff, JSON/Origin/CSRF, no-store. Body strict:
`{ physical, status, description, expected: { physical, reserved, status, description } }`.
Số lượng là số nguyên an toàn không âm, không nhỏ hơn số giữ chỗ hiện tại;
status chỉ active/hidden; mô tả trim, bắt buộc, tối đa 10.000 ký tự. SKU tối đa 100 ký tự.

Snapshot `expected` dùng để phát hiện dữ liệu cũ. Một update có điều kiện theo SKU,
stock, reservedStock, isActive và description ghi đồng thời trong Product. Không
ghi đè toàn bộ variants; không đổi giá/SKU/số giữ chỗ. Áp dụng trên MongoDB standalone.
Thành công trả `{success:true,data:{sku}}`; client tải lại dữ liệu từ backend.

400 VALIDATION_ERROR; 404 NOT_FOUND; 409 PRODUCT_CHANGED/STOCK_BELOW_RESERVED;
503 PRODUCTS_UNAVAILABLE. Lỗi không lộ thông tin driver. Timeout/mất phản hồi yêu cầu
tải lại trước khi gửi tiếp, không giả định chắc chắn chưa lưu.

## UI và kiểm chứng

Giữ Staff shell/token, bố cục form hiện có; một ô mô tả, hiển thị giữ chỗ/khả dụng,
validation/focus, trạng thái đang lưu, lỗi/thành công, chống gửi lặp và tải lại khi
xung đột. Chỉ báo thành công sau PATCH hợp lệ. Hủy quay lại chi tiết; lưu xong
lấy lại dữ liệu thật. Không thêm dependency hoặc thay schema Product.

Backend: Node 24 chạy `node_modules/vitest/vitest.mjs run` trong backend.
Frontend: `npm test`, `npm run lint`, `tsc --noEmit`, `npm run build` trong frontend.
Test API kiểm tra quyền/CSRF, giới hạn trường, số giữ chỗ, SKU và xung đột cạnh tranh;
browser fixture kiểm tra tải SKU ngoài mock, validation, lưu, tải lại và lỗi.
Chạy browser từ root: `node frontend/tests/staff-product-edit-browser.mjs`, đặt
`PLAYWRIGHT_MODULE_PATH` tới Playwright đã cài; cần cổng 3024/3134 trống. Các API
đều là fixture. Test giữ gate CSS trước khi kiểm tra responsive, không coi bản
Webpack chưa xử lý Tailwind là một lần kiểm tra bố cục đạt.
Baseline có lỗi test rate-limit, mật khẩu và Turbopack worker CSS; không hạ chuẩn kiểm tra.
