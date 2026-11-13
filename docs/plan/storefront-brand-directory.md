# Triển khai danh sách thương hiệu Petjoy

1. Mở rộng `GET /api/v1/catalog/brands` bằng số sản phẩm theo thương hiệu. Giữ danh sách tên dạng `data.brands` cho các màn hình đang dùng API. Dùng một truy vấn nhóm các sản phẩm công khai, không cần migration.
2. Cho phép lọc sản phẩm theo tham số `brandName` lặp lại để giữ nguyên dấu câu trong tên. Tiếp tục nhận tham số `brands` phân tách bằng dấu phẩy. Cập nhật dịch vụ và hook danh mục để sử dụng bộ lọc chính xác.
3. Thêm trang `/brands` trong layout Customer. Tách tải dữ liệu và lọc vào hook, dùng lại dịch vụ danh mục, `TextField` và `Button`. Kết nối menu và mục thương hiệu trên trang chủ.
4. Kiểm tra HTTP cho cấu trúc phản hồi cũ, số lượng và truy vấn tên có dấu phẩy. Kiểm tra trang bằng trình duyệt với dữ liệu thử, gồm liên kết lọc sản phẩm, tìm tên, bộ lọc chữ cái, cuộn, trạng thái lỗi và các kích thước trong `frontend/design.md`. Chạy test hai package, lint, TypeScript và build frontend.
