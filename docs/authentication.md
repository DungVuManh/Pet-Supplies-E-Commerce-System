# Đăng nhập và phân quyền Petly

## Cấu hình và chạy local

Dùng Node.js 24.x và npm 11+. Cài dependency bằng `npm ci` trong `backend/`
và `frontend/`. Sao chép `.env.example` sang `.env` ở backend và `.env.local`
ở frontend, rồi điền cấu hình Firebase của dự án.

- Firebase Console: bật Authentication → Email/Password. Dùng cấu hình Web App
  cho các biến `NEXT_PUBLIC_FIREBASE_*` ở frontend.
- Backend dùng Firebase Admin Application Default Credentials. Đặt
  `GOOGLE_APPLICATION_CREDENTIALS` trỏ đến file service account nằm ngoài repo;
  `FIREBASE_PROJECT_ID` phải khớp dự án frontend. Không đưa service account vào
  biến `NEXT_PUBLIC_*` hoặc commit vào Git.
- Chạy MongoDB theo `MONGODB_URI`; tài khoản database cần quyền đọc, ghi và tạo
  index. Backend mặc định ở `http://localhost:3001`, frontend ở
  `http://localhost:3000`; `CORS_ORIGIN` phải khớp chính xác origin frontend.
- `BACKEND_ORIGIN` ở frontend mặc định là `http://127.0.0.1:3001`. Đây là cấu hình
  phía server, dùng cho rewrite API và kiểm tra dashboard khi render server.

Từ repo root chạy `npm run dev` sau khi đã cấu hình cả hai ứng dụng.

## Luồng đăng nhập

Customer, Staff và Admin dùng chung `/login` và đều về `/` sau khi đăng nhập.
Firebase quản lý email/mật khẩu. Frontend gửi ID token vừa xác thực đến backend
để đổi lấy cookie phiên HttpOnly, không lưu token trong localStorage. Phiên
thường có token 24 giờ và cookie của phiên trình duyệt; chọn ghi nhớ đăng nhập
thì cookie/token có hạn 14 ngày. Production dùng cookie Secure có tiền tố
`__Host-`; phục vụ qua HTTPS.

Các mutation xác thực yêu cầu JSON, Origin được cho phép và CSRF cookie/header
khớp nhau. Đăng ký công khai luôn tạo `customer`; trường role/identity từ client
bị từ chối. Đăng ký lại chỉ lấy hồ sơ có sẵn, không ghi đè thông tin hoặc role.
Hồ sơ chưa lưu được sau khi tạo tài khoản Firebase có thể hoàn tất khi đăng nhập lại.

## API

Response hồ sơ thành công dùng
`{ success: true, data: { user: { id, email, fullName, phone, role } } }`.
Không trả Firebase UID, token hoặc trường nội bộ. Role chỉ nhận `customer`,
`staff`, `admin`.

| Method | Endpoint | Hành vi |
| --- | --- | --- |
| GET | `/api/v1/auth/csrf` | Cấp CSRF cookie và `data.csrfToken` |
| POST | `/api/v1/auth/register` | ID token, fullName, phone, terms=true, remember tùy chọn |
| POST | `/api/v1/auth/session` | ID token, remember tùy chọn; tạo phiên cho cả ba role |
| GET | `/api/v1/auth/me` | Xác thực phiên, đọc hồ sơ/role hiện tại |
| DELETE | `/api/v1/auth/session` | Xóa cookie phiên trình duyệt hiện tại; HTTP 204 |
| GET | `/api/v1/staff/dashboard` | Chỉ Staff; trả hồ sơ công khai, chưa có thống kê |
| GET | `/api/v1/admin/dashboard` | Chỉ Admin; trả hồ sơ công khai, chưa có thống kê |

Các endpoint xác thực/dashboard và cả response lỗi dùng `Cache-Control: no-store`.
API được bảo vệ xác minh Firebase cookie với kiểm tra thu hồi, rồi đọc MongoDB
trên từng request. Role từ Firebase claims hoặc dữ liệu client không cấp quyền.
Admin không kế thừa quyền Staff. Middleware `requireAuth` và `requireRole` phải
được dùng cho API nghiệp vụ được bảo vệ trong các đợt tiếp theo.

Lỗi dùng envelope `{ success: false, message, error: { code } }`:

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Thiếu cookie, phiên không hợp lệ/hết hạn/thu hồi hoặc tài khoản Firebase bị vô hiệu hóa |
| 403 | `FORBIDDEN` | Sai role, role thiếu hoặc ngoài danh sách |
| 409 | `PROFILE_INCOMPLETE` | Danh tính Firebase chưa có hồ sơ MongoDB |
| 503 | `AUTH_UNAVAILABLE` / `PROFILE_UNAVAILABLE` | Không thể xác minh phiên hoặc đọc hồ sơ |

Các lỗi validation, CSRF, rate limit và kiểm tra đăng nhập gần đây tiếp tục dùng
các mã hiện có; không trả chi tiết lỗi dịch vụ hoặc credentials.

## Cấp role thủ công trong MongoDB

1. Đăng ký tài khoản qua website và hoàn tất hồ sơ.
2. Lấy UID của đúng tài khoản từ Firebase Console → Authentication → Users.
3. Trong MongoDB Compass, mở database đã cấu hình ở `MONGODB_URI`, collection
   `users`, lọc `{ "firebaseUid": "UID_CAN_CAP_QUYEN" }`. Kiểm tra email/họ tên
   trước khi sửa. Chỉ đổi trường `role` sang `staff` hoặc `admin`.
4. Tải lại website hoặc đưa cửa sổ về focus để cập nhật menu profile. Staff thấy
   “Dashboard nhân viên”, Admin thấy “Dashboard quản trị”; Customer không có link.

Tương đương trong `mongosh`, sau khi chọn đúng database:

```javascript
db.users.findOne(
  { firebaseUid: "UID_CAN_CAP_QUYEN" },
  { firebaseUid: 1, email: 1, fullName: 1, role: 1 }
)
db.users.updateOne(
  { firebaseUid: "UID_CAN_CAP_QUYEN", role: "customer" },
  { $set: { role: "staff", updatedAt: new Date() } }
)
```

Kiểm tra `matchedCount` và đọc lại hồ sơ. Để cấp Admin, dùng `role: "admin"`
trong `$set`; để hạ quyền, lọc role hiện tại và đặt lại `customer`. Không dùng
upsert, không sửa UID, không tạo hồ sơ thiếu trường bằng tay. Thuộc tính
`immutable` của role ngăn thay đổi qua Mongoose; thao tác MongoDB trực tiếp là
cách quản trị thủ công đã chọn và không chạy validation Mongoose, nên phải dùng
đúng ba giá trị role trên.

Quyền mới có hiệu lực ở request được bảo vệ kế tiếp, không cần đăng nhập lại.
Giao diện đang mở cập nhật menu khi tải lại/focus; một dashboard đã render không
tự thay thế nội dung khi bạn sửa database. Truy cập dashboard lần tiếp theo sẽ
kiểm tra lại quyền. Không có API/giao diện cấp role hoặc dữ liệu seed tài khoản
quyền cao trong đợt này.

## Dashboard và kiểm chứng

`/staff/dashboard` và `/admin/dashboard` có shell riêng, thông tin hồ sơ thật,
điều hướng về cửa hàng và đăng xuất qua menu tài khoản. Chưa có chức năng đơn
hàng, kho, quản trị tài khoản hoặc báo cáo. Server kiểm tra quyền trước khi
render nội dung; thiếu/hết phiên về `/login`, sai role về `/forbidden`, dịch vụ
lỗi hiện thông báo và nút thử lại.

Chạy `npm --prefix backend test`, `npm --prefix frontend test`, frontend lint,
TypeScript và build. Test HTTP dùng mock Firebase/MongoDB và cần quyền mở socket
loopback; không chứng minh kết nối dịch vụ thật. Kiểm chứng live bằng ba tài
khoản riêng: đăng nhập, mở popup, truy cập cả hai URL dashboard trực tiếp, tải
lại và đăng xuất. Thử hạ Staff/Admin về Customer khi phiên còn hoạt động rồi
truy cập lại dashboard; API phải trả 403. Không dùng tài khoản thật để thử cấp
quyền nếu chưa xác định đúng UID.
