# Feature Specification: Đăng Nhập Bằng Google (Google Sign-In Authentication)

**Feature Branch**: `feature/google-auth`  
**Created**: 2026-11-14  
**Status**: Ready  
**Input**: User request: "tích hợp tính năng đăng nhập = email google giúp tôi ở trên firebase tôi đã setup google method r"

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Bối cảnh hiện tại
- Hệ thống Petjoy hiện chỉ hỗ trợ xác thực bằng tài khoản email và mật khẩu (`sign_in_provider: "password"`).
- Khách hàng muốn sử dụng hệ thống phải thực hiện đầy đủ các bước đăng ký tài khoản (nhập họ tên, số điện thoại, email, mật khẩu, xác nhận mật khẩu, đồng ý điều khoản).
- Việc gõ mật khẩu thủ công có thể gây bất tiện cho người dùng di động hoặc người dùng muốn đăng nhập nhanh bằng một cú nhấp chuột thông qua tài khoản Google có sẵn.
- Phía quản trị Firebase Auth: Người dùng đã bật phương thức đăng nhập Google (Google Sign-In Provider) trên Firebase Console.
- Ở phía Backend (`backend/src/controllers/auth.controller.js`), hàm `verifyIdToken` hiện đang kiểm tra cứng:
  ```javascript
  if (claims.firebase?.sign_in_provider !== "password" || typeof claims.email !== "string") {
    throw new AppError("Vui lòng sử dụng email và mật khẩu.", 401, "UNAUTHENTICATED");
  }
  ```
  Do đó, mọi token tạo từ Google Provider (`google.com`) khi gửi lên backend đều bị từ chối với mã lỗi 401.

### 1.2. Mục tiêu tính năng
1. **Frontend (Giao diện khách hàng)**:
   - Thêm nút bấm **"Đăng nhập bằng Google"** trên trang Đăng nhập (`/login`) và **"Đăng ký bằng Google"** trên trang Đăng ký (`/register`).
   - Khi bấm, mở cửa sổ pop-up đăng nhập Google chuẩn của Firebase Web SDK (`signInWithPopup`).
   - Sau khi người dùng chọn tài khoản Google thành công:
     - Nhận `idToken` từ Firebase client.
     - Gửi token về backend qua API `/api/v1/auth/session` (POST) kèm CSRF token.
     - **Nếu tài khoản đã từng đăng nhập/hoàn tất hồ sơ**: Đăng nhập thành công ngay, nhận HttpOnly session cookie và chuyển hướng về trang chủ `/` (hoặc URL chuyển tiếp theo tham số `redirect`).
     - **Nếu đây là lần đầu người dùng đăng nhập bằng Google**: Backend phản hồi `409 PROFILE_INCOMPLETE`. Giao diện tự động mở form `CompleteProfileForm` (đã được pre-fill sẵn họ tên từ tài khoản Google `displayName`), khách hàng chỉ cần nhập thêm Số điện thoại và tích chọn Điều khoản dịch vụ để hoàn tất hồ sơ.
2. **Backend (Xác thực & Bảo mật)**:
   - Cập nhật hàm `verifyIdToken` để chấp nhận cả `sign_in_provider === "google.com"` bên cạnh `"password"`.
   - Giữ nguyên toàn bộ các tiêu chuẩn bảo mật hiện tại:
     - Kiểm tra `claims.auth_time` trong vòng 5 phút (recent sign-in check) chống replay attack.
     - Kiểm tra `email` hợp lệ và đã xác thực từ Google (`email_verified`).
     - Yêu cầu CSRF token hợp lệ và Origin header từ frontend được cấp phép.
     - Sinh Firebase Session Cookie chuẩn (`petly-session` / `__Host-petly-session`) với cờ HttpOnly, SameSite=Lax.
     - Khi hoàn tất hồ sơ tài khoản mới qua Google, tự động lấy `picture` (ảnh đại diện Google) làm `avatarUrl` ban đầu nếu có.

---

## 2. Yêu cầu Chức năng (Functional Requirements)

### FR-01: Nút bấm đăng nhập & đăng ký Google
- Xuất hiện trên form Đăng nhập (`/login`) và form Đăng ký (`/register`).
- Hiển thị dải phân cách thẩm mỹ: `"Hoặc đăng nhập với"` / `"Hoặc đăng ký với"`.
- Nút bấm có logo chuẩn Google (SVG đa sắc), chữ rõ ràng: `"Đăng nhập bằng Google"` hoặc `"Đăng ký bằng Google"`.
- Trạng thái loading: Khi người dùng đang tương tác với pop-up hoặc hệ thống đang xử lý session, nút Google và form chính chuyển sang trạng thái disabled, hiển thị text `"Đang kết nối Google…"`.

### FR-02: Đăng nhập với tài khoản Google đã có hồ sơ
- Khi khách hàng đã có tài khoản MongoDB liên kết với `firebaseUid` của Google:
  - Hệ thống xác thực ID token, kiểm tra role và status (không bị khóa `lockedAt`).
  - Trả về thông tin `publicUser` và ghi cookie phiên HttpOnly.
  - Điều hướng người dùng về trang đích (hỗ trợ tham số `redirect` / `next` an toàn).

### FR-03: Đăng nhập lần đầu với tài khoản Google (Hoàn tất hồ sơ)
- Khi khách hàng lần đầu đăng nhập bằng Google:
  - Do tài khoản MongoDB chưa tồn tại, backend trả về mã `409 PROFILE_INCOMPLETE`.
  - Frontend giữ lại phiên Firebase in-memory của người dùng đó và hiển thị màn hình **Hoàn tất hồ sơ**.
  - Trường **Họ và tên** được tự động điền sẵn từ `user.displayName` của Google.
  - Khách hàng điền **Số điện thoại** (định dạng Việt Nam 10 chữ số) và tích chọn **Đồng ý điều khoản**.
  - Bấm `"Hoàn tất và đăng nhập"`: gọi API `/api/v1/auth/register` để tạo bản ghi trong collection `users` MongoDB và nhận session cookie.

### FR-04: Xử lý ngoại lệ & Hủy thao tác
- Nếu khách hàng đóng cửa sổ Google pop-up trước khi đăng nhập (`auth/popup-closed-by-user` hoặc `auth/cancelled-popup-request`): Hệ thống bỏ qua nhẹ nhàng, không hiển thị thông báo lỗi màu đỏ gây hoang mang.
- Nếu xảy ra lỗi mạng hoặc lỗi cấu hình Firebase: Hiển thị thông báo tiếng Việt thân thiện qua `AuthFeedback`.

---

## 3. Yêu cầu Phi chức năng & Ràng buộc (Constraints & Security)

1. **Tuân thủ Kiến trúc Auth hiện tại**:
   - Firebase Client trên browser tiếp tục sử dụng `inMemoryPersistence` (không lưu token vào `localStorage` hay cookie không an toàn).
   - Sau khi đổi lấy Session Cookie từ backend thành công, client gọi `signOut(auth)` để dọn dẹp in-memory Firebase state.
2. **Bảo mật CSRF & Origin**:
   - Mọi request gửi ID token lên backend bắt buộc kèm CSRF token qua header `X-CSRF-Token` và cookie `petly-csrf`.
   - Origin phải thuộc danh sách `CORS_ORIGIN` được cấu hình.
3. **Phân quyền & Vai trò**:
   - Người dùng đăng nhập qua Google mặc định nhận role `customer`.
   - Backend tuyệt đối không cho phép client chọn role hoặc thay đổi role của tài khoản hiện tại.

---

## 4. Tiêu chí Chấp nhận (Acceptance Criteria)

- [ ] Nút Google Sign-In hiển thị đẹp mắt trên `/login` và `/register`, đúng chuẩn thương hiệu Google.
- [ ] Bấm nút Google mở pop-up tài khoản Google thành công.
- [ ] Người dùng mới dùng Google được chuyển đến bước hoàn tất SĐT và Điều khoản, tạo tài khoản thành công.
- [ ] Người dùng cũ dùng Google đăng nhập ngay lập tức và chuyển về trang chủ / URL redirect.
- [ ] Backend chấp nhận `sign_in_provider: "google.com"` và từ chối các provider không xác định.
- [ ] Toàn bộ unit tests backend (`auth.test.js`) và frontend tests pass 100%.
- [ ] Lệnh `npm run build` của frontend biên dịch thành công không có lỗi type hay lint.
