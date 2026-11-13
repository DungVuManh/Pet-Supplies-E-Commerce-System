# Implementation Plan: Quy Trình Hoàn Trả Đơn Hàng Nhiều Bước & UI Timeline (Order Returns Workflow)

**Branch**: `feature/order-returns` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/order-returns/spec.md` (bao gồm: Chu trình hoàn đơn 4 giai đoạn Khách gửi yêu cầu -> Staff duyệt & Khách gửi hàng -> Staff nhận hàng & kiểm tra -> Quyết định hoàn tiền & Hoàn tất; cùng thanh UI Timeline 4 mốc trực quan).

---

## Summary

Nâng cấp và tinh chỉnh toàn diện quy trình hoàn đơn hàng theo chu trình 4 giai đoạn tương tác tuần tự giữa Khách hàng (Customer) và Nhân viên (Staff):

1. **Phía Backend (`backend/`)**:
   - **Mô hình dữ liệu (`backend/src/models/order.model.js`)**:
     - Mở rộng `returnRequest.status`: `["pending", "approved", "customer_shipped", "received", "completed", "rejected"]`.
     - Thêm các mốc thời gian: `approvedAt`, `customerShippedAt`, `receivedAt`, `completedAt`.
     - Lưu cờ và trạng thái hoàn tiền: `refundDecision`, `refundStatus: ["none", "pending_refund", "refunded"]`.
   - **Tách bạch 2 cấp độ xử lý của Staff**:
     - *Cấp 1 - Duyệt yêu cầu hoàn đơn ban đầu*: Staff duyệt chấp nhận (cho phép khách gửi hàng) hoặc từ chối yêu cầu ban đầu (chặn lạm dụng/khiếu nại vô lý).
     - *Cấp 2 - Xác nhận nhận hàng*: Khi hàng gửi về shop, Staff bấm "Đã nhận được hàng" (`received`).
     - *Cấp 3 - Quyết định hoàn tiền (Refund)*: Sau khi kiểm tra hàng thực tế đạt yêu cầu, Staff bấm xác nhận hoàn tiền -> tự động hoàn kho `Product.variants.$.stock`, chuyển `orderStatus = "returned"`, `returnRequest.status = "completed"`.
   - **Customer API mới**:
     - `POST /api/v1/orders/:id/return/confirm-shipped`: Khách hàng bấm "Xác nhận đã gửi trả hàng" sau khi đã gửi bưu kiện về shop.
   - **Đồng bộ Order Timeline API (`order.controller.js` & `lookupOrder`)**:
     - Khi đơn có yêu cầu hoàn trả, backend tạo tự động 4 bước timeline:
       1. `Yêu cầu hoàn đơn` (`completed`)
       2. `Chờ xác nhận` (`active` nếu chờ duyệt/chờ khách gửi, `completed` khi khách đã gửi)
       3. `Nhân viên kiểm tra` (`active` khi shop đã nhận hàng và đang kiểm tra, `completed` khi xong)
       4. `Hoàn thành công` (`completed` khi hoàn tất hoàn tiền)

2. **Phía Frontend (`frontend/`)**:
   - **Khách hàng (`features/orders/`)**:
     - Thanh `OrderTimeline` tại `order-detail-view.tsx` và `order-tracking-view.tsx` hiển thị chuẩn hóa 4 mốc: **Yêu cầu hoàn đơn** -> **Chờ xác nhận** -> **Nhân viên kiểm tra** -> **Hoàn thành công**.
     - Tại `order-summary-sidebar.tsx`:
       - Hiển thị thông báo trạng thái tương ứng với từng giai đoạn.
       - Khi yêu cầu được duyệt (`approved`): Hiển thị hướng dẫn gửi hàng kèm nút **"Xác nhận đã gửi trả hàng"** (có modal xác nhận).
       - Khi đã gửi hàng (`customer_shipped`): Hiển thị thông báo đang chuyển hàng về cửa hàng.
       - Khi nhân viên đã nhận (`received`): Hiển thị thông báo nhân viên đang kiểm tra chất lượng sản phẩm.
       - Khi hoàn tất (`completed`): Hiển thị thông báo hoàn tiền & hoàn tất thành công.
   - **Nhân viên (`features/staff/returns/`)**:
     - Cập nhật `return-decision-panel.tsx` theo từng trạng thái:
       - `pending`: Nút "Chấp nhận yêu cầu" & "Từ chối yêu cầu".
       - `approved`: Badge "Chờ khách gửi hàng".
       - `customer_shipped`: Nút **"Đã nhận được hàng"** để nhân viên xác nhận tiếp nhận kiện hàng.
       - `received`: Nút **"Xác nhận hoàn tiền & Hoàn tất"** & "Từ chối hoàn tiền".
       - `completed`: Badge "Hoàn trả thành công".
     - `returns-list.tsx`: Bổ sung các trạng thái lọc tương ứng.

---

## Technical Context

- **Backend**: Node.js 24.x (ESM `.js`), Express 5.3.0, Mongoose 9.11.2, Zod 4.6.7, Vitest 5.0.5.
- **Frontend**: Next.js 16.4.2 (App Router), React 19.3.0, TypeScript 5.x, Tailwind CSS 4, `lucide-react`.
- **Database**: Collection `orders`, nhúng subdocument `returnRequest`, cập nhật nguyên tử theo từng giai đoạn chuyển giao trạng thái.
- **Security & Authorization**:
  - Customer: Xác thực qua HttpOnly cookie, chỉ chủ sở hữu đơn mới được xác nhận đã gửi hàng (`customerId === req.user._id`), bảo vệ mutation bằng CSRF token.
  - Staff: Phân quyền `staff` thông qua `permissions.js`, kiểm tra điều kiện trạng thái trước khi nhận hàng và hoàn tiền (ngăn chặn thao tác vượt cấp hoặc trùng lặp).

---

## Constitution & Governance Check

- [x] **Layered Architecture & Separation of Concerns**: Logic cập nhật trạng thái nằm tại `order-return.controller.js`, validation tại `order-return.validator.js`, UI state và handlers tại hook `use-order-return.ts` và `use-staff-return-decision.ts`.
- [x] **State Transition Integrity**: Đảm bảo quy trình diễn ra tuần tự: `pending` -> `approved` -> `customer_shipped` -> `received` -> `completed`. Không thể nhảy cóc từ `pending` sang `completed` hay hoàn kho khi chưa nhận được hàng.
- [x] **Atomic Stock Restoration**: Tồn kho sản phẩm chỉ được hoàn lại duy nhất một lần tại bước cuối cùng khi Staff kiểm tra hàng đạt yêu cầu và bấm xác nhận hoàn tiền (`SC-003`).
- [x] **Semantic Tokens & UX Compliance**: Sử dụng các token màu chuẩn (`amber` cho chờ duyệt, `blue`/`sky` cho vận chuyển/gửi hàng, `purple` cho kiểm tra hoàn trả, `emerald` cho hoàn thành công).

---

## Phased Implementation Plan

### Phase 1: Data Model & Validator Updates
1. Cập nhật `backend/src/models/order.model.js`:
   - Mở rộng enum `returnStatuses`: `["pending", "approved", "customer_shipped", "received", "completed", "rejected"]`.
   - Thêm các trường ngày: `approvedAt`, `customerShippedAt`, `receivedAt`, `completedAt`.
2. Cập nhật `backend/src/validators/order-return.validator.js`:
   - Thêm schema xác thực cho hành động khách gửi hàng (`confirmCustomerShippedSchema`).
   - Mở rộng schema quyết định của staff: `receiveStaffReturnSchema`, `decisionStaffReturnSchema` (hỗ trợ `approve_request`, `reject_request`, `complete_refund`, `reject_refund`).

### Phase 2: Backend Controller & Routing
1. Cập nhật `backend/src/controllers/order-return.controller.js`:
   - Bổ sung `confirmCustomerReturnShipped`: Cập nhật `returnRequest.status = "customer_shipped"`, ghi nhận `customerShippedAt`.
   - Bổ sung `receiveStaffReturn`: Staff xác nhận đã nhận hàng -> chuyển sang `received`, ghi nhận `receivedAt`.
   - Cập nhật `decideStaffReturn`:
     - Khi `action === "approve_request"`: chuyển sang `approved`, ghi nhận `approvedAt`.
     - Khi `action === "complete_refund"`: chỉ cho phép khi status là `received`, tự động cộng lại tồn kho, chuyển `orderStatus = "returned"`, `returnRequest.status = "completed"`, `refundStatus = "refunded"`.
2. Cập nhật `backend/src/controllers/order.controller.js`:
   - Tại `getOrderDetail` và `lookupOrder`: Khi đơn có `returnRequest`, dựng `timelineSteps` 4 giai đoạn chuẩn hóa:
     - Mốc 1: `Yêu cầu hoàn đơn`
     - Mốc 2: `Chờ xác nhận`
     - Mốc 3: `Nhân viên kiểm tra`
     - Mốc 4: `Hoàn thành công`
3. Đăng ký router trong `backend/src/routers/order.router.js` và `backend/src/routers/workspace.router.js`.

### Phase 3: Frontend Customer Experience
1. `frontend/features/orders/types.ts`: Cập nhật kiểu `CustomerOrderReturnRequest` và `ReturnRequestStatus`.
2. `frontend/features/orders/services/order-return.service.ts`: Thêm `confirmCustomerReturnShippedApi(orderId)`.
3. `frontend/features/orders/components/order-summary-sidebar.tsx`:
   - Bổ sung nút **"Xác nhận đã gửi trả hàng"** khi `status === "approved"`.
   - Hiển thị các thông điệp tiến trình trực quan theo từng giai đoạn.
4. `frontend/features/orders/components/order-timeline.tsx`: Đảm bảo hiển thị đẹp mắt, rõ ràng cho quy trình 4 mốc.

### Phase 4: Frontend Staff Return Operations
1. `frontend/features/staff/returns/types.ts`: Đồng bộ các trạng thái và action mới.
2. `frontend/features/staff/returns/api.ts`: Bổ sung API `receiveStaffReturnApi` và cập nhật payload quyết định.
3. `frontend/features/staff/components/return-decision-panel.tsx`:
   - Trạng thái `pending`: Hiển thị "Chấp nhận yêu cầu" và "Từ chối".
   - Trạng thái `customer_shipped`: Hiển thị nút **"Đã nhận được hàng"**.
   - Trạng thái `received`: Hiển thị nút **"Xác nhận hoàn tiền & Hoàn tất"** và "Từ chối hoàn tiền".
4. `frontend/features/staff/components/returns-list.tsx`: Bổ sung filter / badge trạng thái phù hợp.

### Phase 5: Verification & Tests
1. Chạy test backend `npm --prefix backend test -- tests/order-returns.test.js`.
2. Chạy test frontend `node --test frontend/tests/order-returns.test.mjs`.
3. Kiểm tra TypeScript build: `cmd /c "npm --prefix frontend run build"`.
