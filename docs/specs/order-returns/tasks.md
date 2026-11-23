# Tasks: Quy Trình Hoàn Trả Đơn Hàng Nhiều Bước & UI Timeline (Order Returns Workflow)

**Input**: Design documents from `docs/specs/order-returns/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/order-returns-api.yaml`, `quickstart.md`)

**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/order-returns-api.yaml`

**Tests**: Bao gồm kiểm thử tự động Backend (`backend/tests/order-returns.test.js`) và Frontend (`frontend/tests/order-returns.test.mjs`), xác minh TypeScript compilation và Next.js production build.

**Organization**: Các tác vụ được tổ chức theo Setup, Foundational, User Stories (`US1`, `US2`, `US3`) và Polish/Verification.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Tác vụ có thể chạy song song (khác tệp, không phụ thuộc tác vụ trước)
- **[Story]**: Gán nhãn cho User Story tương ứng (`[US1]`, `[US2]`, `[US3]`)

---

## Phase 1: Setup & Data Model Extension

**Purpose**: Mở rộng các trạng thái của `returnRequest` và bổ sung các trường thời gian theo chu trình 4 giai đoạn.

- [ ] T001 Update `returnStatuses` enum (`["pending", "approved", "customer_shipped", "received", "completed", "rejected"]`) and add timestamp fields (`approvedAt`, `customerShippedAt`, `receivedAt`, `completedAt`) in `returnRequestSchema` in `backend/src/models/order.model.js`
- [ ] T002 [P] Create validation schemas `confirmCustomerShippedSchema`, `receiveStaffReturnSchema`, and update `staffReturnDecisionSchema` (supporting `approve_request`, `reject_request`, `complete_refund`, `reject_refund`) in `backend/src/validators/order-return.validator.js`

---

## Phase 2: Foundational Routing & Permissions

**Purpose**: Đăng ký các endpoints mới cho Customer xác nhận gửi hàng và Staff xác nhận nhận hàng, đồng bộ phân quyền.

- [ ] T003 Register `"POST /staff/returns/:id/receive"` under `"process-orders"` permission in `backend/src/common/permissions.js`
- [ ] T004 Mount route `POST /:id/return/confirm-shipped` in `backend/src/routers/order.router.js` and `POST /:id/receive` in `backend/src/routers/workspace.router.js`

---

## Phase 3: User Story 1 - Khách hàng xác nhận gửi hàng & Theo dõi Timeline 4 mốc (Priority: P1) 🎯 MVP

**Goal**: Khách hàng sau khi được duyệt hoàn đơn có thể bấm "Xác nhận đã gửi trả hàng", đồng thời theo dõi tiến trình trực quan qua 4 mốc Timeline: Yêu cầu hoàn đơn -> Chờ xác nhận -> Nhân viên kiểm tra -> Hoàn thành công.

**Independent Test**: Khách hàng tạo yêu cầu hoàn đơn -> kiểm tra Timeline hiển thị 4 mốc (mốc 1 completed, mốc 2 active) -> sau khi staff duyệt, kiểm tra nút "Xác nhận đã gửi trả hàng" xuất hiện -> bấm nút và xác minh mốc 2 hoàn thành.

### Implementation for User Story 1

- [ ] T005 [US1] Implement `confirmCustomerReturnShipped` controller method in `backend/src/controllers/order-return.controller.js` updating `returnRequest.status = "customer_shipped"` and `customerShippedAt = new Date()` atomically
- [ ] T006 [US1] Update `getOrderDetail` and `lookupOrder` in `backend/src/controllers/order.controller.js` to generate 4-step return timeline (`step-return-request`, `step-return-approve`, `step-return-inspect`, `step-return-complete`) with accurate `completed`/`active`/`pending` status when order has `returnRequest`
- [ ] T007 [P] [US1] Update `frontend/features/orders/types.ts` to include new `ReturnRequestStatus` values (`customer_shipped`, `received`, `completed`) and update `OrderTimelineStep` mappings
- [ ] T008 [P] [US1] Implement `confirmReturnShippedApi(orderId)` in `frontend/features/orders/services/order-return.service.ts` with CSRF protection and credentials
- [ ] T009 [US1] Update `OrderSummarySidebar` in `frontend/features/orders/components/order-summary-sidebar.tsx` to render **"Xác nhận đã gửi trả hàng"** button when `returnRequest.status === "approved"`, and display informative progress messages for `customer_shipped`, `received`, and `completed`
- [ ] T010 [US1] Enhance `OrderTimeline` in `frontend/features/orders/components/order-timeline.tsx` and `frontend/features/orders/components/order-detail-view.tsx` to beautifully render the 4 return phases with icons and active status colors

---

## Phase 4: User Story 2 - Nhân viên (Staff) xác nhận nhận hàng, kiểm tra & quyết định hoàn tiền (Priority: P1)

**Goal**: Staff kiểm soát toàn diện quy trình xử lý: duyệt yêu cầu ban đầu -> bấm "Đã nhận được hàng" khi kiện hàng về tới shop -> kiểm tra hàng -> duyệt hoàn tiền (Refund) và hoàn kho.

**Independent Test**: Staff duyệt yêu cầu ban đầu -> khách xác nhận gửi -> Staff bấm "Đã nhận được hàng" -> Staff bấm "Xác nhận hoàn tiền & Hoàn tất" -> xác minh tồn kho được cộng lại, đơn chuyển sang `returned`, và mốc thứ 4 trên timeline chuyển sang hoàn tất.

### Implementation for User Story 2

- [ ] T011 [US2] Implement `receiveStaffReturn` controller method in `backend/src/controllers/order-return.controller.js` updating `returnRequest.status = "received"` and `receivedAt = new Date()`
- [ ] T012 [US2] Update `decideStaffReturn` in `backend/src/controllers/order-return.controller.js` to handle separated phases: `approve_request` (moves to `approved`), `reject_request` (moves to `rejected`), `complete_refund` (requires `status === "received"`, restores `Product.variants.$.stock`, updates `orderStatus: "returned"` and `returnRequest.status: "completed"`, marks `refundStatus: "refunded"`), and `reject_refund` (marks `rejected` with explanation)
- [ ] T013 [P] [US2] Update `frontend/features/staff/returns/types.ts` and add `receiveStaffReturnApi(orderId)` plus update decision payload in `frontend/features/staff/returns/api.ts`
- [ ] T014 [US2] Update `ReturnDecisionPanel` in `frontend/features/staff/components/return-decision-panel.tsx` with dynamic action controls: initial approval buttons for `pending`, **"Đã nhận được hàng"** button for `customer_shipped`, **"Xác nhận hoàn tiền & Hoàn tất"** button for `received`, and completed badge for `completed`
- [ ] T015 [P] [US2] Update `ReturnsList` in `frontend/features/staff/components/returns-list.tsx` to support badges and filters for all 4 return phases (`Chờ duyệt`, `Chờ khách gửi`, `Đã gửi hàng`, `Đang kiểm tra`, `Hoàn thành`, `Đã từ chối`)

---

## Phase 5: User Story 3 - Kiểm tra an toàn, bảo vệ tồn kho & kiểm thử hồi quy (Priority: P2)

**Goal**: Đảm bảo tồn kho chỉ được hoàn lại 1 lần duy nhất ở bước kiểm tra hàng, và hệ thống tự động hoàn thành sau 3 ngày bỏ qua đơn đang hoàn trả.

- [ ] T016 [P] [US3] Ensure `autoCompleteOverdueShippingOrders` in `backend/src/common/order-auto-complete.js` skips orders with `returnRequest.status` in `["pending", "approved", "customer_shipped", "received", "completed"]`
- [ ] T017 [US3] Update backend integration test suite `backend/tests/order-returns.test.js` to verify the complete 4-stage lifecycle: customer submit -> staff approve -> customer ship -> staff receive -> staff complete refund & stock restore
- [ ] T018 [P] [US3] Update frontend test suite `frontend/tests/order-returns.test.mjs` to verify new API service calls and status transitions

---

## Phase 6: Polish & Verification

**Purpose**: Chạy toàn bộ kiểm thử và kiểm tra build hoàn chỉnh.

- [ ] T019 Run backend test suite `npm --prefix backend test -- tests/order-returns.test.js tests/admin-permissions.test.js`
- [ ] T020 Run frontend tests and verify build with `cmd /c "npm --prefix frontend run build"`
