# Research & Technical Decisions: Đăng Nhập Bằng Google (Google Auth)

## 1. Technical Unknowns & Decisions

### Decision 1: Firebase Auth Method (`signInWithPopup` vs `signInWithRedirect`)
- **Context**: Firebase Web SDK cung cấp hai phương thức chính để đăng nhập OAuth: Pop-up (`signInWithPopup`) và Redirect (`signInWithRedirect`).
- **Options**:
  1. `signInWithRedirect`: Trình duyệt chuyển hướng toàn trang sang accounts.google.com rồi quay về.
  2. `signInWithPopup`: Mở một cửa sổ pop-up nhỏ để chọn tài khoản Google mà không làm reload hay rời khỏi trang web hiện tại.
- **Decision**: Chọn **`signInWithPopup`**.
- **Rationale**:
  - Ứng dụng Next.js đang sử dụng `inMemoryPersistence` cho Firebase Auth. Khi dùng `signInWithRedirect`, việc chuyển trang và quay trở lại sẽ làm mất in-memory persistence trừ khi phải xử lý phức tạp với `getRedirectResult()` ở cấp layout cao nhất.
  - `signInWithPopup` giữ nguyên context React, duy trì state của trang login/register, cho phép xử lý ngay lập tức token trả về và xử lý mượt mà luồng `409 PROFILE_INCOMPLETE` nếu khách hàng cần bổ sung số điện thoại.
- **Alternatives considered**:
  - Google One Tap / Google Identity Services (GIS): Đòi hỏi tích hợp thư viện ngoài riêng biệt thay vì tận dụng Firebase Web SDK đã cài sẵn trong repo.

---

### Decision 2: Backend Allowed Providers in `verifyIdToken`
- **Context**: Trong `backend/src/controllers/auth.controller.js`, `claims.firebase?.sign_in_provider` hiện đang giới hạn cứng cho `"password"`.
- **Decision**: Cập nhật danh sách nhà cung cấp hợp lệ:
  ```javascript
  const ALLOWED_SIGN_IN_PROVIDERS = new Set(["password", "google.com"]);
  ```
- **Rationale**:
  - Token do Firebase Admin SDK giải mã từ Google OAuth chứa `claims.firebase.sign_in_provider = "google.com"`.
  - Việc kiểm tra whitelist nghiêm ngặt này ngăn chặn các provider không mong muốn (như anonymous, twitter, github, v.v.) khi chưa được hệ thống hỗ trợ.

---

### Decision 3: Profile Completion Flow (Xử lý tài khoản mới qua Google)
- **Context**: Trong schema MongoDB của Petjoy, mỗi người dùng bắt buộc phải có `phone` (số điện thoại) để liên hệ nhận hàng/xác thực đơn và `termsAcceptedAt` (thời điểm đồng ý điều khoản dịch vụ). Tuy nhiên, Google OAuth mặc định chỉ cung cấp `email`, `displayName` (họ tên) và `photoURL` (ảnh đại diện).
- **Options**:
  1. Tự động sinh số điện thoại ngẫu nhiên: Vi phạm tính toàn vẹn dữ liệu và gây lỗi giao hàng.
  2. Bỏ `required` ở trường `phone` trong database: Ảnh hưởng lớn đến luồng đặt hàng và quản trị đơn hàng.
  3. Sử dụng luồng `PROFILE_INCOMPLETE` sẵn có: Khi gọi `/api/v1/auth/session` (login) mà chưa có profile trong MongoDB, backend trả về `409 PROFILE_INCOMPLETE`. Frontend giữ in-memory Firebase user và hiển thị form `CompleteProfileForm` để người dùng điền SĐT và tích chọn Điều khoản.
- **Decision**: Sử dụng luồng **`PROFILE_INCOMPLETE`** (Option 3).
- **Rationale**:
  - Không phá vỡ ràng buộc của database (`phone: { type: String, required: true }`).
  - Tận dụng 100% component `CompleteProfileForm` đã được xây dựng sẵn trong `frontend/features/auth/components/complete-profile-form.tsx`.
  - Nâng cấp `CompleteProfileForm` để tự động điền sẵn `fullName` lấy từ `user.displayName` của Google, giúp khách hàng chỉ cần gõ duy nhất số điện thoại và ấn hoàn tất trong 3 giây.

---

### Decision 4: Avatar URL Handling
- **Context**: Google trả về URL ảnh đại diện qua `claims.picture` (hoặc `user.photoURL`).
- **Decision**: Khi tạo profile mới qua `register` (hoặc hoàn tất profile), nếu có `claims.picture`, lưu vào `avatarUrl` trong `User` MongoDB thay vì dùng ảnh mặc định `/images/customer-avatar.jpg`.
- **Rationale**: Tăng trải nghiệm cá nhân hóa cho người dùng ngay khi vừa đăng nhập xong.
