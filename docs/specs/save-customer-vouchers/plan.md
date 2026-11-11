# Implementation Plan: Quản Lý và Lưu Mã Giảm Giá Khách Hàng (Customer Voucher Wallet)

**Branch**: `feature/save-customer-vouchers` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/save-customer-vouchers/spec.md`

## Summary

Xây dựng và tích hợp hoàn chỉnh tính năng **Lưu mã giảm giá và Ví voucher cá nhân (Customer Voucher Wallet)** vào hệ thống Petjoy:
1. **Phía Khách hàng (Storefront Discovery & UI Wallet)**:
   - Cho phép người dùng bấm nút "Lưu" trên từng thẻ voucher tại trang `/voucher`, trang chủ và banner. Thao tác lưu là **1 chiều và chỉ được lưu đúng 1 lần duy nhất**; sau khi lưu nút chuyển sang "Đã lưu" (disabled/cố định, không cho phép hủy lưu rồi lưu lại).
   - Cung cấp trang chuyên biệt "Ví voucher của tôi" (`/account/vouchers`) với 3 tab: Có hiệu lực, Đã sử dụng, Hết hiệu lực. Không có nút xóa/hủy lưu chủ động (chỉ tự động dọn dẹp mã sau 30 ngày theo FR-016).
   - Bổ sung bộ lọc / tab "Mã đã lưu" trên trang khuyến mãi công khai `/voucher`.
   - Cung cấp modal chọn nhanh mã từ ví tại bước Giỏ hàng (`/cart`) và Thanh toán (`/checkout`), đối chiếu tức thì với giá trị đơn hàng.
2. **Cơ chế cho Khách vãng lai & Đồng bộ (Guest Persistence & Cloud Sync)**:
   - Khách vãng lai chưa đăng nhập lưu tạm danh sách mã vào `localStorage`.
   - Tự động gọi API đồng bộ (`POST /api/v1/customer/vouchers/sync`) ngay khi người dùng đăng nhập hoặc tạo tài khoản thành công.
3. **Phía Backend & Cơ sở dữ liệu (Backend Foundation & API)**:
   - Xây dựng model `CustomerVoucher` với Compound Unique Index `{ userId: 1, voucherId: 1 }` chống trùng lặp.
   - Tính toán động trạng thái mã (Ready, Used, Expired) dựa trên sự phối hợp giữa `Promotion` và `PromotionRedemption`.
   - Tự động chuyển đổi trạng thái khi đặt hàng thành công và tự động phục hồi khi đơn hàng bị hủy.

---

## Technical Context

**Language/Version**:
- Backend: Node.js 24.x (ES Modules `import/export`), Express 5.3.0
- Frontend: TypeScript 5.x, React 19, Next.js 16 (App Router), Tailwind CSS 4

**Primary Dependencies**:
- Backend: `express` (5.3.0), `mongoose` (9.11.2), `zod` (4.6.7), `cors`, `helmet`, `express-rate-limit`
- Frontend: `next` (16.x), `react` (19.x), `lucide-react`, `tailwind-merge`

**Storage**:
- MongoDB 7+ (Standalone / MongoDB Atlas) thông qua Mongoose 9 ODM.
- Thao tác nguyên tử (atomic `$setOnInsert`, `$inc`, Unique Index) đảm bảo tính toàn vẹn và bất biến (Idempotent).

**Testing**:
- Backend: Vitest 5.0.5, Supertest 7.3.1
- Frontend: Vitest, React Testing Library

**Target Platform**:
- Web application (Next.js storefront cổng 3000, Express API cổng 3001)

**Project Type**:
- Web application (Hai package riêng biệt: `backend/` và `frontend/`)

**Performance Goals**:
- Phản hồi nút "Lưu / Đã lưu" tức thì (Optimistic UI < **50ms**).
- Tải danh sách ví voucher trong dưới **200ms**.

**Constraints**:
- Tuân thủ các quy tắc bảo mật của dự án:
  - Khách hàng chỉ xem và quản lý được danh sách voucher thuộc quyền sở hữu của chính tài khoản mình (`userId` trích xuất an toàn từ Auth Token/Session, không tin ID do client gửi).
  - Không để lộ các thông tin quản trị nhạy cảm của voucher (ví dụ: tổng ngân sách chiến dịch, tổng số lượt dùng toàn sàn).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Technical Debt Leakage**: Dữ liệu lưu trữ độc lập qua collection `CustomerVoucher`, không gây phình to document `User`.
- [x] **Separation of Concerns**: Phân tách rõ ràng giữa Controller (`customer-voucher.controller.js`), Model (`customer-voucher.model.js`), Service tính toán trạng thái và Validator Zod.
- [x] **Security & Zero Trust**: Mọi API quản lý ví yêu cầu xác thực (`requireAuth`); ID người dùng lấy trực tiếp từ session (`request.user._id`).
- [x] **Standalone Compatibility**: Tương thích hoàn toàn với MongoDB standalone, không bắt buộc Replica Set.

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/save-customer-vouchers/
├── spec.md                          # Tài liệu đặc tả yêu cầu nghiệp vụ
├── plan.md                          # Bản kế hoạch triển khai kiến trúc (tập tin này)
├── research.md                      # Nghiên cứu giải pháp kỹ thuật & quyết định thiết kế
├── data-model.md                    # Mô hình thực thể, ERD, Schema & Máy trạng thái
├── quickstart.md                    # Hướng dẫn kiểm thử và xác thực luồng hoạt động
├── contracts/
│   └── customer-vouchers-api.yaml   # Hợp đồng chuẩn OpenAPI 3.0 cho các endpoint
└── checklists/
    └── requirements.md              # Bảng kiểm tra chất lượng yêu cầu (16/16 Đạt)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── customer-voucher.model.js        # Model lưu trữ liên kết User - Voucher
│   │   └── index.js                         # Export CustomerVoucher model
│   ├── controllers/
│   │   └── customer-voucher.controller.js   # Xử lý Lưu, Bỏ lưu, Danh sách ví, Đồng bộ
│   ├── routers/
│   │   ├── customer-voucher.router.js       # Router /api/v1/customer/vouchers
│   │   └── app.js                           # Đăng ký router vào ứng dụng
│   └── validators/
│       └── customer-voucher.validator.js    # Schema kiểm tra dữ liệu đầu vào với Zod
└── tests/
    └── customer-vouchers.test.js            # Kiểm thử tích hợp lưu mã, chống trùng, đồng bộ

frontend/
├── app/
│   └── (customer)/
│       └── account/
│           └── vouchers/
│               └── page.tsx                 # Trang Ví voucher của tôi trong Tài khoản
├── features/
│   ├── account/
│   │   └── components/
│   │       ├── account-nav.tsx              # Bổ sung tab điều hướng "Ví voucher"
│   │       └── vouchers/
│   │           ├── customer-vouchers-view.tsx # Giao diện xem danh sách ví voucher (3 tab)
│   │           └── customer-voucher-card.tsx  # Card hiển thị voucher trong ví
│   ├── vouchers/
│   │   ├── components/
│   │   │   ├── voucher-card.tsx             # Cập nhật kết nối API lưu/bỏ lưu thật
│   │   │   └── voucher-view.tsx             # Thêm tab/bộ lọc "Mã đã lưu"
│   │   ├── hooks/
│   │   │   └── use-customer-vouchers.ts     # Hook lấy danh sách mã đã lưu và mutate
│   │   └── services/
│   │       └── customer-voucher.service.ts  # Service gọi API Backend
│   └── checkout/
│       └── components/
│           └── voucher-wallet-modal.tsx     # Modal chọn nhanh mã từ ví khi thanh toán
└── lib/
    └── voucher-sync.ts                      # Tiện ích tự động đồng bộ LocalStorage khi login
```

---

## Phase Breakdown & Execution Roadmap

### Giai đoạn 1: Backend Data Model & Service Foundation
1. **Khởi tạo Mongoose Model**:
   - Tạo file [`backend/src/models/customer-voucher.model.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/models/customer-voucher.model.js) với `userId`, `voucherId`, `code`, `savedAt`.
   - Cấu hình Unique Index `{ userId: 1, voucherId: 1 }` và Index `{ userId: 1, savedAt: -1 }`.
   - Đăng ký export tại [`backend/src/models/index.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/models/index.js).
2. **Logic tính toán trạng thái động**:
   - Xây dựng helper phân loại trạng thái voucher (`ready`, `used`, `expired`) dựa trên `Promotion` và `PromotionRedemption`.

### Giai đoạn 2: Backend API & Endpoints
1. **Schema Validation**:
   - Tạo [`backend/src/validators/customer-voucher.validator.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/validators/customer-voucher.validator.js) kiểm tra `code`, `status`, `codes`.
2. **Bộ điều khiển (Controller)**:
   - Tạo [`backend/src/controllers/customer-voucher.controller.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/controllers/customer-voucher.controller.js):
     - `listCustomerVouchers`: Lấy danh sách ví, tính toán trạng thái, phân nhóm tab.
     - `saveCustomerVoucher`: Lưu mã vào ví (idempotent).
     - `removeCustomerVoucher`: Bỏ lưu mã.
     - `getSavedVoucherCodes`: Lấy nhanh danh sách mã đã lưu cho UI highlight.
     - `syncCustomerVouchers`: Đồng bộ hàng loạt mã từ khách vãng lai sau đăng nhập.
3. **Đăng ký Router**:
   - Tạo [`backend/src/routers/customer-voucher.router.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/src/routers/customer-voucher.router.js) gắn middleware `requireAuth`.
   - Khởi tạo route `/api/v1/customer/vouchers` trong `app.js`.
4. **Kiểm thử tích hợp (Tests)**:
   - Viết test suite [`backend/tests/customer-vouchers.test.js`](file:///e:/Pet-Supplies-E-Commerce-System/backend/tests/customer-vouchers.test.js) bao phủ các ca: Lưu mã thành công, chống lưu trùng lặp, bỏ lưu, lọc theo tab, đồng bộ từ guest.

### Giai đoạn 3: Frontend Services & Đồng bộ hóa
1. **Tầng API Service**:
   - Tạo `frontend/features/vouchers/services/customer-voucher.service.ts`: Gọi các endpoint `/api/v1/customer/vouchers`.
2. **Custom Hook**:
   - Tạo `frontend/features/vouchers/hooks/use-customer-vouchers.ts` quản lý state, cache và optimistic updates.
3. **Cơ chế tự động đồng bộ khi Đăng nhập**:
   - Tích hợp hàm đồng bộ `syncGuestVouchers()` trong `auth-provider.tsx` hoặc hook đăng nhập: Tự động quét `localStorage` và đẩy lên server khi user đăng nhập.

### Giai đoạn 4: Giao diện người dùng (UI)
1. **Trang Ví Voucher trong Tài khoản cá nhân**:
   - Tạo route `frontend/app/(customer)/account/vouchers/page.tsx`.
   - Bổ sung menu item "Ví voucher" vào thanh điều hướng tài khoản `account-nav.tsx`.
   - Thiết kế giao diện 3 tab: Có hiệu lực, Đã sử dụng, Hết hiệu lực với thiết kế rực rỡ, đồng bộ với thương hiệu Petjoy.
2. **Nâng cấp trang Khuyến mãi (`/voucher`)**:
   - Kết nối nút "Lưu / Đã lưu" trong `voucher-card.tsx` với API thật (kèm fallback LocalStorage cho guest).
   - Bổ sung tab / nút lọc "Mã đã lưu" ngay trên đầu trang `/voucher`.
3. **Tích hợp Modal chọn Voucher khi Thanh toán & Giỏ hàng**:
   - Tạo component `voucher-wallet-modal.tsx` hiển thị danh sách voucher trong ví.
   - Nhúng vào thẻ nhập mã ở `use-checkout` và trang `/cart`, cho phép người dùng click 1 chạm để áp dụng mã.

### Giai đoạn 5: Xác thực End-to-End & Hoàn tất
- Chạy các kịch bản kiểm thử theo [`quickstart.md`](./quickstart.md).
- Kiểm tra độ tương thích trên các kích thước màn hình (Mobile, Tablet, Desktop).

