# Quickstart Validation: Đăng Nhập Bằng Google (Google Auth)

Hướng dẫn kiểm thử và xác thực luồng đăng nhập Google trong hệ thống Petjoy.

---

## 1. Điều kiện tiên quyết (Prerequisites)
1. **Firebase Console**:
   - Phương thức đăng nhập **Google** đã được bật trong Firebase Authentication > Sign-in method.
   - Authorized Domains đã bao gồm `localhost` và domain triển khai.
2. **Cấu hình môi trường Frontend (`frontend/.env.local`)**:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## 2. Kịch bản kiểm thử End-to-End

### Kịch bản 1: Đăng nhập lần đầu bằng Google (First-time Sign-in & Profile Completion)
1. Mở trình duyệt đến `http://localhost:3000/login`.
2. Bấm nút **"Đăng nhập bằng Google"**.
3. Cửa sổ pop-up của Google hiển thị, chọn một tài khoản Google chưa từng đăng ký trên hệ thống.
4. **Kết quả mong đợi**:
   - Pop-up đóng lại sau khi chọn tài khoản.
   - Form **Hoàn tất hồ sơ** (`CompleteProfileForm`) hiển thị:
     - Trường **Họ và tên**: Đã tự động điền tên tài khoản Google.
     - Trường **Số điện thoại**: Trống, hiển thị ô nhập liệu.
     - Checkbox **Đồng ý điều khoản dịch vụ**.
5. Nhập số điện thoại hợp lệ (ví dụ: `0912345678`), tích chọn đồng ý điều khoản và nhấn **"Hoàn tất và đăng nhập"**.
6. **Kết quả mong đợi**:
   - Tài khoản được lưu vào database MongoDB.
   - Nhận cookie phiên `petly-session`.
   - Giao diện chuyển hướng về trang chủ `/`.
   - Header hiển thị avatar từ Google và tên người dùng.

---

### Kịch bản 2: Đăng nhập lần tiếp theo bằng Google (Returning User)
1. Đăng xuất khỏi hệ thống.
2. Quay lại trang `http://localhost:3000/login`.
3. Bấm nút **"Đăng nhập bằng Google"**.
4. Chọn đúng tài khoản Google đã hoàn tất hồ sơ ở Kịch bản 1.
5. **Kết quả mong đợi**:
   - Pop-up đóng lại và hệ thống đăng nhập thành công ngay lập tức.
   - Không xuất hiện form hoàn tất hồ sơ.
   - Chuyển hướng về trang chủ `/` (hoặc trang được chỉ định bởi tham số `redirect`).

---

### Kịch bản 3: Hủy thao tác pop-up Google (Cancelled Popup)
1. Tại trang `/login`, bấm **"Đăng nhập bằng Google"**.
2. Khi pop-up Google vừa mở ra, nhấn nút **X** để đóng pop-up mà không chọn tài khoản.
3. **Kết quả mong đợi**:
   - Không có thông báo lỗi màu đỏ nào xuất hiện trên màn hình.
   - Nút đăng nhập trở lại trạng thái bình thường.

---

### Kịch bản 4: Kiểm thử Backend HTTP Boundary (Vitest)
Chạy lệnh kiểm thử backend:
```powershell
npm.cmd --prefix backend test -- tests/auth.test.js
```
**Kết quả mong đợi**:
- Test case kiểm tra `verifyIdToken` với `claims.firebase.sign_in_provider = "google.com"` chạy thành công.
- Provider không hợp lệ bị từ chối với HTTP 401.
