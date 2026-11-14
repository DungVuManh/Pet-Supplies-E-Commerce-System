# Data Model: Đăng Nhập Bằng Google (Google Auth)

## 1. Firebase Claims Mapping

Khi người dùng đăng nhập bằng Google trên Firebase Client, Firebase ID Token được gửi lên Backend và được xác thực qua Firebase Admin SDK: `getFirebaseAuth().verifyIdToken(idToken, true)`.

Các trường claims được trích xuất và sử dụng:

| Claim Key | Kiểu | Ý nghĩa trong hệ thống Petjoy |
| :--- | :--- | :--- |
| `uid` | `string` | Định danh duy nhất của Firebase User (`firebaseUid` trong MongoDB) |
| `email` | `string` | Địa chỉ email của tài khoản Google |
| `email_verified` | `boolean` | Trạng thái email đã xác thực bởi Google (luôn là `true` với tài khoản Google) |
| `name` / `displayName` | `string` | Tên hiển thị trên tài khoản Google (dùng điền sẵn cho `fullName`) |
| `picture` / `photoURL` | `string` | URL ảnh đại diện Google (dùng cho `avatarUrl`) |
| `auth_time` | `number` | Thời điểm xác thực (dùng để kiểm tra recent sign-in < 300s) |
| `firebase.sign_in_provider` | `string` | Phải là `"google.com"` (hoặc `"password"`) |

---

## 2. MongoDB Entity: `User` Collection

Không cần thay đổi cấu trúc bảng `User` vì schema hiện tại đã được thiết kế sẵn sàng:

```javascript
{
  _id: ObjectId,
  firebaseUid: String,        // Lưu uid từ Google hoặc Email/Password (Unique Index)
  email: String,              // Email từ Google
  fullName: String,           // Họ tên người dùng (2-100 ký tự)
  phone: String,              // Số điện thoại Việt Nam (Bắt buộc)
  role: "customer",           // Luôn là customer đối với người dùng đăng nhập Google
  termsAcceptedAt: Date,      // Thời điểm đồng ý điều khoản dịch vụ
  dob: Date,                  // Ngày sinh (mặc định chưa cập nhật)
  gender: String,             // Giới tính (mặc định chưa cập nhật)
  avatarUrl: String,          // URL ảnh đại diện (lấy từ Google picture nếu có)
  status: "active",           // Trạng thái tài khoản
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3. Public User Contract (`publicUser`)

Đối tượng trả về cho Client khi đăng nhập Google thành công:

```json
{
  "id": "650000000000000000000001",
  "email": "customer@gmail.com",
  "fullName": "Nguyen Van A",
  "phone": "0912345678",
  "role": "customer",
  "dob": null,
  "gender": null,
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",
  "createdAt": "2026-11-14T10:00:00.000Z"
}
```
