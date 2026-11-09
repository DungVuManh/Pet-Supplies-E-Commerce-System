# Tasks: Quản Lý và Lưu Mã Giảm Giá Khách Hàng (Customer Voucher Wallet)

**Input**: Design documents from `docs/specs/save-customer-vouchers/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/customer-vouchers-api.yaml`, `quickstart.md`)

**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/customer-vouchers-api.yaml`

**Tests**: Bao gồm các bài kiểm thử tự động với Vitest (`backend/tests/customer-vouchers.test.js`) và kịch bản kiểm thử End-to-End theo `quickstart.md`.

**Organization**: Các nhiệm vụ được nhóm theo từng kịch bản người dùng (User Story) để đảm bảo tính độc lập khi triển khai và kiểm thử từng phần.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Có thể thực hiện song song (khác tệp tin, không phụ thuộc nhiệm vụ chưa xong)
- **[Story]**: Gắn với User Story tương ứng (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Tệp tin được chỉ định rõ ràng với đường dẫn chính xác trong dự án.

---

## Phase 1: Setup (Shared Infrastructure & Types)

**Purpose**: Thiết lập schema xác thực đầu vào Zod ở Backend và định nghĩa kiểu dữ liệu TypeScript ở Frontend.

- [x] T001 [P] Create Zod validation schema in `backend/src/validators/customer-voucher.validator.js` validating `code` (string, uppercase, trim, min 1, max 60), `status` (enum `['all', 'ready', 'used', 'expired']`, default `'all'`), `codes` (array of strings, max 100), and pagination (`page` min 1, `limit` min 1, max 100)
- [x] T002 [P] Create TypeScript types and interfaces in `frontend/features/vouchers/types/customer-voucher.ts` defining `CustomerVoucherItem`, `CustomerVoucherCounts`, `CustomerVoucherState`, `CustomerVoucherListResponse`, `SaveVoucherPayload`, and `SyncVouchersPayload`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hạ tầng cơ sở dữ liệu Mongoose Model, logic tính toán trạng thái động và bộ định tuyến API bắt buộc trước khi triển khai các User Story.

**⚠️ CRITICAL**: Phải hoàn thành toàn bộ giai đoạn này trước khi bắt đầu các User Story.

- [x] T003 Create `CustomerVoucher` Mongoose model in `backend/src/models/customer-voucher.model.js` with fields: `userId` (ObjectId, ref: 'User', required, index: true), `voucherId` (ObjectId, ref: 'Promotion', required), `code` (String, required, uppercase, trim), `savedAt` (Date, default: Date.now, required), with compound unique index `{ userId: 1, voucherId: 1 }` and `{ userId: 1, savedAt: -1 }`
- [x] T004 [P] Export `CustomerVoucher` from `backend/src/models/index.js`
- [x] T005 [P] Create voucher state computation helper in `backend/src/common/customer-voucher-helpers.js` that evaluates `Promotion` (`startAt`, `endAt`, `isActive`, `usageLimit`, `usedCount`) against current time and checks `PromotionRedemption` (matching `customerKey === "user:<userId>"` and `status === "active"`) to determine dynamic state: `ready`, `used`, or `expired`
- [x] T006 Create router in `backend/src/routers/customer-voucher.router.js` with `readCookies` and `requireAuth` middleware, and mount it at `/api/v1/customer/vouchers` in `backend/src/app.js`

**Checkpoint**: Nền tảng dữ liệu và định tuyến hoàn tất - sẵn sàng triển khai User Story 1.

---

## Phase 3: User Story 1 - Khách hàng lưu mã giảm giá 1 lần duy nhất từ giao diện khám phá (Priority: P1) 🎯 MVP

**Goal**: Khách hàng (đăng nhập hoặc vãng lai) có thể bấm "Lưu" mã giảm giá vào ví. Thao tác lưu là một chiều (One-way) và chỉ được lưu đúng 1 lần duy nhất; nút chuyển sang "Đã lưu" (disabled/cố định, không cho phép hủy lưu rồi lưu lại).

**Independent Test**: Mở trang `/voucher`, nhấn nút "Lưu" trên một mã bất kỳ; kiểm tra nút đổi thành "Đã lưu", hiển thị Toast xác nhận, nút bị khóa tương tác không thể bấm lại để hủy lưu, dữ liệu được ghi nhận vào DB (với user) hoặc LocalStorage (với guest), và tự động đồng bộ lên DB sau khi đăng nhập.

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `saveCustomerVoucher` (POST `/api/v1/customer/vouchers`) and disallow unsaving in `removeCustomerVoucher` (DELETE `/api/v1/customer/vouchers/:code` returning 400 `VOUCHER_CANNOT_BE_UNSAVED`) in `backend/src/controllers/customer-voucher.controller.js` with idempotent handling on duplicate saves, enforcing maximum 50 active vouchers per user (FR-017), auto-filtering out vouchers expired/used > 30 days (FR-016), and verifying valid promotion code
- [x] T008 [P] [US1] Implement `getSavedVoucherCodes` (GET `/api/v1/customer/vouchers/ids`) in `backend/src/controllers/customer-voucher.controller.js` returning an array of saved codes/IDs for fast storefront status rendering
- [x] T009 [P] [US1] Implement API client methods in `frontend/features/vouchers/services/customer-voucher.service.ts` (`saveVoucherApi`, `getSavedVoucherCodesApi`, `syncVouchersApi`)
- [x] T010 [P] [US1] Create guest voucher storage helper in `frontend/lib/voucher-storage.ts` managing `petjoy_saved_vouchers` in browser LocalStorage with error-safe parsing and writing (one-way save only)
- [x] T011 [US1] Create custom hook `frontend/features/vouchers/hooks/use-customer-vouchers.ts` managing saved codes state, one-way save operation, and syncing with backend when authenticated or LocalStorage when guest
- [x] T012 [US1] Update `frontend/features/vouchers/components/voucher-card.tsx` to connect `isSaved` and `onToggleSave` to `use-customer-vouchers` with static/locked "Đã lưu" button (disabled, no hover unsave) and toast feedback
- [x] T013 [P] [US1] Implement automatic guest voucher sync utility `frontend/lib/voucher-sync.ts` and integrate into `frontend/features/auth/auth-provider.tsx` to call `syncVouchersApi` immediately upon successful user login
- [x] T014 [P] [US1] Add Vitest integration tests in `backend/tests/customer-vouchers.test.js` verifying saving voucher, idempotent duplicate save, disallow unsave (400), and guest sync bulk upsert

**Checkpoint**: User Story 1 hoàn thành - Khách hàng có thể lưu voucher 1 lần duy nhất trên toàn bộ storefront và tự động đồng bộ khi đăng nhập (MVP hoàn tất).

---

## Phase 4: User Story 2 - Xem và quản lý danh sách mã đã lưu tại trang Ví Voucher cá nhân (Priority: P1)

**Goal**: Người dùng truy cập trang `/account/vouchers` hoặc tab "Mã đã lưu" trên `/voucher` để xem lại đầy đủ các voucher đã lưu với 3 nhóm trạng thái: Có hiệu lực, Đã sử dụng, Hết hiệu lực (không có nút xóa/hủy lưu thủ công).

**Independent Test**: Đăng nhập tài khoản, truy cập `/account/vouchers`, kiểm tra danh sách hiển thị đầy đủ các mã đã lưu, phân nhóm tab chuẩn xác, thông tin chi tiết (mức giảm, đơn tối thiểu, hạn dùng), không có nút xóa/bỏ lưu, và các nút "Sao chép mã", "Dùng ngay" hoạt động đúng.

### Implementation for User Story 2

- [x] T015 [P] [US2] Implement `listCustomerVouchers` (GET `/api/v1/customer/vouchers`) in `backend/src/controllers/customer-voucher.controller.js` supporting filtering by status (`all`, `ready`, `used`, `expired`), sorting by `savedAt` descending, and returning summary counts for all tabs
- [x] T016 [P] [US2] Create customer voucher wallet card component in `frontend/features/account/components/vouchers/customer-voucher-card.tsx` displaying voucher discount, code pill, min order, expiry date, status badge, "Sao chép mã" button, and "Dùng ngay" button with smart navigation to `/products` or applicable category (FR-008, không hiển thị nút xóa/bỏ lưu)
- [x] T017 [US2] Create customer voucher wallet view component in `frontend/features/account/components/vouchers/customer-vouchers-view.tsx` with 3 tabs ("Có hiệu lực", "Đã sử dụng", "Hết hiệu lực"), tab count badges, empty state illustrations, and search/filter
- [x] T018 [P] [US2] Create wallet page route in `frontend/app/(customer)/account/vouchers/page.tsx` rendering `CustomerVouchersView` with proper metadata
- [x] T019 [P] [US2] Update account navigation sidebar in `frontend/features/account/components/account-nav.tsx` adding "Ví voucher" menu item with Ticket/Tag icon and active link highlight
- [x] T020 [US2] Update public voucher view in `frontend/features/vouchers/components/voucher-view.tsx` adding a "Mã đã lưu" filter tab alongside all vouchers so users can view saved vouchers directly on `/voucher`

**Checkpoint**: User Story 2 hoàn thành - Khách hàng có thể xem lại và quản lý ví voucher cá nhân mọi lúc trên giao diện.

---

## Phase 5: User Story 3 - Chọn và áp dụng trực tiếp mã đã lưu tại bước Thanh toán và Giỏ hàng (Priority: P2)

**Goal**: Tại màn hình Giỏ hàng (`/cart`) và Thanh toán (`/checkout`), người dùng có thể mở modal danh sách ví voucher và chọn trực tiếp mã khả dụng thay vì gõ tay mã code.

**Independent Test**: Thêm sản phẩm vào giỏ hàng, đi tới `/checkout`, nhấn "Chọn từ Ví voucher", chọn mã hợp lệ và kiểm tra mã tự động áp dụng và tính giảm giá chính xác.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create voucher wallet selection modal component in `frontend/features/checkout/components/voucher-wallet-modal.tsx` showing customer's active saved vouchers, auto-highlighting best voucher with "Tốt nhất" badge and placing it on top (FR-010), highlighting eligible vouchers with "Áp dụng" button, and disabling ineligible ones with "Cần mua thêm X đ để áp dụng"
- [x] T022 [US3] Update `frontend/features/checkout/hooks/use-checkout.ts` and checkout summary promo section to include a "Chọn từ Ví voucher" trigger button that opens `voucher-wallet-modal` and auto-applies selected code
- [x] T023 [US3] Add "Chọn từ Ví voucher" button to cart summary promo section in `frontend/features/cart/components/cart-view.tsx` allowing 1-click voucher selection directly in cart

**Checkpoint**: User Story 3 hoàn thành - Khách hàng có thể chọn nhanh voucher từ ví khi mua sắm, giảm tối đa ma sát thanh toán.

---

## Phase 6: User Story 4 - Tự động cập nhật vòng đời và trạng thái voucher trong ví (Priority: P2)

**Goal**: Đảm bảo trạng thái voucher trong ví phản ánh chính xác vòng đời: đặt hàng xong -> chuyển sang "Đã sử dụng", hủy đơn -> hoàn trả về "Có hiệu lực", quá hạn -> chuyển sang "Hết hiệu lực".

**Independent Test**: Đặt đơn hàng với voucher 1 lần, kiểm tra mã chuyển sang tab "Đã sử dụng"; hủy đơn hàng, kiểm tra mã tự động quay lại tab "Có hiệu lực".

### Implementation for User Story 4

- [x] T024 [P] [US4] Verify and ensure order placement in `backend/src/controllers/order.controller.js` creates `PromotionRedemption` with `customerKey = "user:<userId>"` so wallet dynamically displays the voucher under "Đã sử dụng"
- [x] T025 [P] [US4] Verify and ensure order cancellation in `backend/src/controllers/order.controller.js` and `backend/src/controllers/order-status.controller.js` calls `releaseVoucher(orderId)` to release redemption, automatically returning the voucher to "Có hiệu lực" in wallet
- [x] T026 [US4] Add Vitest tests in `backend/tests/customer-vouchers.test.js` verifying lifecycle transitions: `ready` -> `used` upon order placement, and `used` -> `ready` upon order cancellation

**Checkpoint**: User Story 4 hoàn thành - Vòng đời voucher vận hành tự động, chính xác và đồng bộ giữa đơn hàng và ví cá nhân.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hoàn thiện các chi tiết trải nghiệm người dùng, huy hiệu cảnh báo và kiểm tra tương thích toàn diện.

- [x] T027 [P] Add saved voucher badge/counter to header user avatar dropdown in `frontend/features/layout/components/header.tsx`
- [x] T028 [P] Handle UI edge cases in voucher card: display "Sắp hết hạn" warning badge when voucher expires in < 24 hours, and handle disabled/deleted voucher gracefully with informative message
- [x] T029 Execute full test suite and validation scenarios across `backend` and `frontend` according to `docs/specs/save-customer-vouchers/quickstart.md`

---

## Dependencies & Execution Sequence

```mermaid
flowchart TD
    Phase1[Phase 1: Setup - Zod & TS Types] --> Phase2[Phase 2: Foundational - Model, Helpers, Router]
    Phase2 --> Phase3[Phase 3: US1 - Lưu & Bỏ lưu Voucher (MVP)]
    Phase3 --> Phase4[Phase 4: US2 - Trang Ví Voucher & Bộ lọc]
    Phase3 --> Phase5[Phase 5: US3 - Chọn từ Ví tại Checkout / Cart]
    Phase4 --> Phase6[Phase 6: US4 - Vòng đời & Trạng thái Đặt/Hủy đơn]
    Phase5 --> Phase6
    Phase6 --> Phase7[Phase 7: Polish & Cross-Cutting Concerns]
```

### User Story Dependencies:
- **Foundational (Phase 2)**: Chặn tất cả các User Stories.
- **User Story 1 (Phase 3)**: MVP cốt lõi - Độc lập, cung cấp dữ liệu nền cho US2 và US3.
- **User Story 2 (Phase 4)**: Phụ thuộc vào US1 (cần có voucher được lưu trước khi hiển thị trong trang ví).
- **User Story 3 (Phase 5)**: Phụ thuộc vào US1 (cần có voucher trong ví để chọn khi checkout). Có thể chạy song song với US2.
- **User Story 4 (Phase 6)**: Phụ thuộc vào US1 và US2.
- **Polish (Phase 7)**: Hoàn tất sau khi tất cả các User Stories hoàn thành.

---

## Parallel Execution Opportunities

- **Trong Phase 1**: T001 (Backend Validator) và T002 (Frontend Types) hoàn toàn độc lập, chạy song song.
- **Trong Phase 2**: T004 (Model export) và T005 (State helper) có thể phát triển song song sau T003.
- **Trong Phase 3**: T007 + T008 (Backend controller) và T009 + T010 (Frontend service/storage) có thể làm song song.
- **Giữa Phase 4 và Phase 5**: Sau khi hoàn thành US1, lập trình viên có thể phát triển song song US2 (Trang Ví `/account/vouchers`) và US3 (Modal chọn mã tại `/checkout`).

