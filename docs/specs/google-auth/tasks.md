# Tasks: Đăng Nhập Bằng Google (Google Auth Integration)

**Branch**: `feature/google-auth`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **API Contract**: [contracts/google-auth-api.yaml](./contracts/google-auth-api.yaml)

---

## Task Summary

- **Total Tasks**: 11
- **Phase 1 (Backend Core & Security Boundary)**: 3 tasks (T001 - T003)
- **Phase 2 (Frontend Auth Actions & Client SDK - US1 & US2)**: 2 tasks (T004 - T005)
- **Phase 3 (Frontend UI Components & Form Integration - US1, US2, US3)**: 3 tasks (T006 - T008)
- **Phase 4 (Polish & Comprehensive Verification)**: 3 tasks (T009 - T011)

---

## User Stories Mapped

- **US1 (P1 - Đăng nhập tài khoản Google đã có hồ sơ)**: Khách hàng bấm "Đăng nhập bằng Google", xác thực qua pop-up Google thành công và được cấp session cookie ngay lập tức để chuyển hướng về trang chủ `/` (hoặc URL `redirect`).
- **US2 (P1 - Đăng ký / Hoàn tất hồ sơ lần đầu bằng Google)**: Khách hàng lần đầu đăng nhập Google được backend phản hồi 409 `PROFILE_INCOMPLETE`. Màn hình hoàn tất hồ sơ tự động điền sẵn Họ và tên từ Google, khách hàng chỉ cần nhập Số điện thoại và đồng ý Điều khoản để tạo tài khoản.
- **US3 (P2 - Trải nghiệm hủy/đóng pop-up Google)**: Nếu khách hàng tắt cửa sổ pop-up trước khi đăng nhập (`auth/popup-closed-by-user`), hệ thống không hiển thị thông báo lỗi màu đỏ gây hoang mang.

---

## Execution Tasks

### Phase 1: Backend Core & Security Boundary

- [x] T001 Cập nhật hàm `verifyIdToken` trong `backend/src/controllers/auth.controller.js`:
  - Thay đổi điều kiện kiểm tra `claims.firebase?.sign_in_provider` từ chỉ `"password"` thành whitelist `["password", "google.com"]`.
  - Giữ nguyên kiểm tra `auth_time` (recent sign-in trong vòng 300 giây) và sự tồn tại của `email`.
- [x] T002 [P] Cập nhật handler `register` trong `backend/src/controllers/auth.controller.js`:
  - Trích xuất `avatarUrl: input.avatarUrl || claims.picture || undefined` khi lưu thông tin người dùng mới vào collection `users` trong MongoDB qua `userRepository.createIfMissing`.
- [x] T003 [P] Bổ sung và cập nhật test cases trong `backend/tests/auth.test.js`:
  - Kiểm tra xác thực token có `claims.firebase.sign_in_provider = "google.com"` thành công và tạo session cookie.
  - Kiểm tra token có provider không nằm trong whitelist (ví dụ: `"anonymous"`) bị từ chối với HTTP 401 `UNAUTHENTICATED`.
  - Kiểm tra tài khoản Google chưa có profile trong database trả về HTTP 409 `PROFILE_INCOMPLETE`.

---

### Phase 2: Frontend Auth Actions & Client SDK (US1 & US2)

- [x] T004 [P] [US1] Xây dựng hàm `loginWithGoogle(remember: boolean)` trong `frontend/features/auth/auth-actions.ts`:
  - Nạp client auth qua `getClientAuth()`, import động `GoogleAuthProvider`, `signInWithPopup`, `signOut` từ `"firebase/auth"`.
  - Tạo `new GoogleAuthProvider()` và thực hiện `signInWithPopup(auth, provider)`.
  - Lấy `idToken = await credential.user.getIdToken()` và gọi `authApi.login(idToken, remember)`.
  - Xử lý mã lỗi `409 PROFILE_INCOMPLETE`: Giữ phiên Firebase in-memory (`auth.currentUser`) để nạp sang form hoàn tất hồ sơ, trả về `displayName` cho caller.
  - Dọn dẹp `signOut(auth)` khi hoàn thành đăng nhập hoặc khi gặp lỗi khác.
- [x] T005 [P] [US2] Cập nhật component `CompleteProfileForm` trong `frontend/features/auth/components/complete-profile-form.tsx`:
  - Bổ sung prop `initialFullName?: string`.
  - Khởi tạo giá trị mặc định cho ô nhập Họ và tên nếu có `initialFullName` (lấy từ tài khoản Google).

---

### Phase 3: Frontend UI Components & Form Integration (US1, US2, US3)

- [x] T006 [P] [US1] Xây dựng component `GoogleAuthButton` tại `frontend/features/auth/components/google-auth-button.tsx`:
  - Thiết kế nút bấm chuẩn thương hiệu Google với icon SVG đa sắc Google "G".
  - Nhận props `text`, `disabled`, `loading`, `onClick`.
  - Hỗ trợ styling responsive phù hợp với design system Tailwind CSS 4 của Petjoy.
- [x] T007 [US1] Tích hợp đăng nhập Google vào `frontend/features/auth/components/login-form.tsx`:
  - Thêm dải phân cách `"Hoặc đăng nhập với"` và nhúng `GoogleAuthButton`.
  - Thêm state `googlePending` và `initialFullName`.
  - Gọi `loginWithGoogle(remember)`. Nếu gặp `PROFILE_INCOMPLETE`, mở `CompleteProfileForm` với `initialFullName` tương ứng.
  - Xử lý mã lỗi [US3] `auth/popup-closed-by-user` và `auth/cancelled-popup-request` để bỏ qua nhẹ nhàng không hiển thị banner lỗi đỏ.
- [x] T008 [US2] Tích hợp đăng ký Google vào `frontend/features/auth/components/register-form.tsx`:
  - Thêm dải phân cách `"Hoặc đăng ký với"` và nhúng `GoogleAuthButton`.
  - Khi bấm, thực hiện luồng Google sign-in để chuyển thẳng đến màn hình hoàn tất hồ sơ nếu là tài khoản mới.

---

### Phase 4: Polish & Comprehensive Verification

- [x] T009 Chạy bộ kiểm thử tự động Backend:
  ```powershell
  npm.cmd --prefix backend test -- tests/auth.test.js
  ```
- [x] T010 Chạy kiểm thử tự động Frontend:
  ```powershell
  node --test frontend/tests/auth-api.test.mjs
  npm.cmd --prefix frontend test
  ```
- [x] T011 Chạy kiểm tra tĩnh và production build Next.js:
  ```powershell
  npm.cmd --prefix frontend run build
  ```
