# Implementation Plan: Đăng Nhập Bằng Google (Google Auth Integration)

**Branch**: `feature/google-auth` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

---

## 1. Summary & Architecture

Kế hoạch triển khai hoàn thiện tính năng **Đăng nhập bằng Google qua Firebase Authentication**:
1. **Backend Layer**:
   - Cập nhật hàm `verifyIdToken` trong `backend/src/controllers/auth.controller.js` để cho phép `sign_in_provider === "google.com"`.
   - Trong `register` handler, hỗ trợ trích xuất `picture` từ Firebase claims làm `avatarUrl` ban đầu cho tài khoản tạo từ Google.
   - Viết/cập nhật unit test trong `backend/tests/auth.test.js` kiểm tra chấp nhận Google provider và từ chối các provider không hợp lệ.
2. **Frontend Layer**:
   - Thêm hàm `loginWithGoogle(remember: boolean)` trong `frontend/features/auth/auth-actions.ts` sử dụng `GoogleAuthProvider` và `signInWithPopup`.
   - Xử lý mượt mà luồng `409 PROFILE_INCOMPLETE`: Giữ Firebase in-memory user, truyền `displayName` sang `CompleteProfileForm`.
   - Nâng cấp `CompleteProfileForm` trong `frontend/features/auth/components/complete-profile-form.tsx`: hỗ trợ `defaultFullName` được trích xuất từ Google.
   - Thêm nút **"Đăng nhập bằng Google"** trên `frontend/features/auth/components/login-form.tsx` và nút **"Đăng ký bằng Google"** trên `frontend/features/auth/components/register-form.tsx` kèm biểu tượng SVG Google chuẩn.
   - Thêm component giao diện phụ trợ `GoogleSignInButton`.
   - Bắt các mã lỗi Firebase thường gặp như `auth/popup-closed-by-user` để không hiển thị lỗi gây gián đoạn trải nghiệm người dùng.

---

## 2. Technical Context

- **Backend**: Express 5, Node.js 24.x, Firebase Admin SDK (ADC), Vitest, Supertest.
- **Frontend**: Next.js 16 App Router, React 19, Firebase Web SDK 11.x, Tailwind CSS 4.
- **Database**: MongoDB Collection `users` (Mongoose Model `User`).
- **Security**: HttpOnly Session Cookies (`petly-session`), CSRF tokens (`X-CSRF-Token`), Origin checks, `inMemoryPersistence` trên Firebase Client.

---

## 3. Phased Implementation Roadmap

### Phase 1: Backend Provider Whitelist & Session Exchange
- [ ] **Step 1.1**: Cập nhật `verifyIdToken` trong `backend/src/controllers/auth.controller.js`:
  - Thay đổi điều kiện kiểm tra `claims.firebase?.sign_in_provider` thành whitelist: `["password", "google.com"]`.
  - Giữ nguyên các ràng buộc về thời gian xác thực (`auth_time` < 300s) và sự tồn tại của `email`.
- [ ] **Step 1.2**: Trong hàm `register` của `backend/src/controllers/auth.controller.js`:
  - Cho phép trích xuất `avatarUrl: input.avatarUrl || claims.picture || undefined` khi lưu vào database.
- [ ] **Step 1.3**: Bổ sung unit tests trong `backend/tests/auth.test.js`:
  - Kiểm tra đăng nhập với token có `claims.firebase.sign_in_provider = "google.com"` thành công.
  - Kiểm tra token với provider khác (ví dụ: `"anonymous"`) bị từ chối với 401 `UNAUTHENTICATED`.

### Phase 2: Frontend Auth Actions & Firebase Web SDK
- [ ] **Step 2.1**: Trong `frontend/features/auth/auth-actions.ts`:
  - Viết hàm `loginWithGoogle(remember: boolean)`:
    - Nạp `getClientAuth()`, import động `GoogleAuthProvider`, `signInWithPopup`, `signOut` từ `"firebase/auth"`.
    - Tạo `provider = new GoogleAuthProvider()`.
    - Thực hiện `signInWithPopup(auth, provider)`.
    - Lấy `idToken` và gọi `authApi.login(idToken, remember)`.
    - Bắt lỗi: Nếu `error.code === "PROFILE_INCOMPLETE"`, lưu lại `displayName` và giữ nguyên phiên Firebase để nạp sang form hoàn tất hồ sơ.
    - Dọn dẹp `signOut(auth)` khi hoàn thành hoặc có lỗi khác.
- [ ] **Step 2.2**: Cập nhật `CompleteProfileForm` trong `frontend/features/auth/components/complete-profile-form.tsx`:
  - Nhận prop `initialFullName?: string` từ tài khoản Google để tự động điền sẵn vào ô Họ và tên.

### Phase 3: Frontend UI Components
- [ ] **Step 3.1**: Tạo component nút Google `GoogleAuthButton` (`frontend/features/auth/components/google-auth-button.tsx`):
  - Biểu tượng logo Google SVG chuẩn.
  - Xử lý trạng thái loading / disabled.
  - Hiển thị văn bản tùy biến: "Đăng nhập bằng Google" hoặc "Đăng ký bằng Google".
- [ ] **Step 3.2**: Tích hợp `GoogleAuthButton` vào `LoginForm` (`frontend/features/auth/components/login-form.tsx`):
  - Thêm divider "Hoặc đăng nhập với".
  - Bắt lỗi hủy pop-up `auth/popup-closed-by-user`.
  - Kết nối luồng hoàn tất hồ sơ `CompleteProfileForm` kèm `initialFullName`.
- [ ] **Step 3.3**: Tích hợp `GoogleAuthButton` vào `RegisterForm` (`frontend/features/auth/components/register-form.tsx`):
  - Thêm divider "Hoặc đăng ký với".
  - Tận dụng luồng đăng nhập/đăng ký Google chung.

### Phase 4: Verification & Quality Assurance
- [ ] **Step 4.1**: Chạy backend test: `npm.cmd --prefix backend test -- tests/auth.test.js`.
- [ ] **Step 4.2**: Chạy frontend unit test: `npm.cmd --prefix frontend test`.
- [ ] **Step 4.3**: Chạy frontend production build: `npm.cmd --prefix frontend run build`.
- [ ] **Step 4.4**: Kiểm thử giao diện trực tiếp trên trình duyệt (mở pop-up Google, hoàn tất profile người dùng mới và đăng nhập tài khoản cũ).
