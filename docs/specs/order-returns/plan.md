# Implementation Plan: Yêu Cầu Hoàn Trả Đơn Hàng & Duyệt Hoàn Đơn (Order Returns)

**Branch**: `feature/order-returns` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/order-returns/spec.md` (bao gồm bổ sung: Gộp lý do hoàn trả & Bổ sung thông tin tài khoản ngân hàng nhận tiền hoàn).

---

## Summary

Triển khai trọn vẹn quy trình **Khách hàng yêu cầu hoàn trả hàng (kèm tài khoản ngân hàng & ảnh Cloudinary)** và **Staff quản lý, xem chi tiết, đối soát tài khoản chuyển tiền, phê duyệt/từ chối yêu cầu hoàn trả**:

1. **Phía Backend (`backend/`)**:
   - Mở rộng `orderStatuses` thêm `"returned"` (`Đã hoàn trả`) và bổ sung subdocument `returnRequestSchema` (kèm index `{ "returnRequest.status": 1, "returnRequest.requestedAt": -1 }`) trên `Order`:
     - `reason`: Hỗ trợ lý do gộp mới `damaged_or_missing` ("Hàng có vấn đề hoặc thiếu hàng") song song tương thích với các mã cũ (`damaged_or_defective`, `missing_items`) và `not_received`.
     - `bankAccount`: Nhúng thông tin tài khoản ngân hàng của khách (`bankName`, `accountNumber`, `accountHolder`) để Staff/kế toán đối soát chuyển khoản hoàn tiền.
   - Chuẩn hóa helper tải ảnh Cloudinary an toàn (`backend/src/common/cloudinary-upload.js`, folder `petjoy/returns`, allowlist `image/jpeg`, `image/png`, `image/webp`, <= 5MB/ảnh, tối đa 5 ảnh) và middleware CSRF cho `multipart/form-data` (`protectMultipartMutation`).
   - Xây dựng validator (`backend/src/validators/order-return.validator.js`) và controller (`backend/src/controllers/order-return.controller.js`) cho cả phía Customer (`POST /orders/:id/return/upload`, `POST /orders/:id/return`) lẫn Staff (`GET /staff/returns`, `GET /staff/returns/:id`, `POST /staff/returns/:id/decision`).
   - Khi Staff **Chấp nhận**: cập nhật nguyên tử `orderStatus: "returned"`, `returnRequest.status: "approved"`, đánh dấu `refundRequired` + `refundStatus: "pending_refund"`, tự động cộng lại `Product.variants.$.stock`, và ghi `AuditLog` (`order.return.approve`).
   - Khi Staff **Từ chối**: bắt buộc `rejectionReason` (5–500 ký tự), cập nhật nguyên tử `returnRequest.status: "rejected"`, ghi `AuditLog` (`order.return.reject`), giữ nguyên đơn `shipping` để khách xem lý do và bấm nhận hàng (`Q3: A`).
   - Đồng bộ đầy đủ các điểm chạm liên quan: `order.router.js`, `workspace.router.js`, `permissions.js`, `order.controller.js` (`getOrderDetail` & `getStaffOrderDetail`), `order-status.controller.js` (`confirmCustomerOrderReceipt`), `order-auto-complete.js` (loại trừ đơn đang chờ/đã hoàn, thêm 24h đệm sau khi bị từ chối), `order-payment.js`, `admin-finance.controller.js`, `admin-inventory-report.controller.js`, `admin/order.controller.js`, và `validators/admin/order.validator.js`.

2. **Phía Frontend (`frontend/`)**:
   - **Customer (`/orders/[id]` & `/orders/[id]/return`)**:
     - Trên `OrderSummarySidebar`: thêm nút **"Hoàn trả hàng"** cạnh **"Đã nhận được hàng"** khi đơn ở trạng thái `shipping` và chưa có `returnRequest`; đồng thời hiển thị thẻ trạng thái yêu cầu hoàn trả (Chờ xử lý / Đã chấp nhận / Từ chối kèm lý do + thông tin tài khoản ngân hàng) và điều phối ẩn/hiện nút bấm chuẩn xác.
     - Tạo trang `/orders/[id]/return` (`app/(customer)/orders/[id]/return/page.tsx`) cùng service/hook/view:
       - Chọn 1 trong 2 lý do: **Hàng có vấn đề hoặc thiếu hàng** (bắt buộc ảnh) hoặc **Chưa nhận được hàng** (tùy chọn ảnh).
       - Nhập thông tin tài khoản ngân hàng nhận tiền hoàn (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản in hoa) với validation đầy đủ.
       - Nhập mô tả (10–1000 ký tự), tải lên Cloudinary (tối đa 5 ảnh), xem trước và gửi yêu cầu.
   - **Staff (`/staff/returns` & `/staff/returns/[id]`)**:
     - Thêm mục **"Yêu cầu hoàn trả"** trên `StaffShell`.
     - Xây dựng giao diện danh sách `/staff/returns` (lọc trạng thái, tìm theo mã đơn/khách hàng, đếm số lượng, cột ảnh & badge `Cần hoàn tiền`) và trang chi tiết `/staff/returns/[id]` (`ReturnDecisionPanel`):
       - Hiển thị khối nổi bật **Thông tin tài khoản ngân hàng nhận tiền hoàn** (Tên ngân hàng, Số tài khoản kèm nút Copy, Chủ tài khoản) để nhân viên dễ dàng chuyển tiền trả lại.
       - Hiển thị lý do gộp chuẩn, mô tả, thư viện ảnh minh chứng kèm phóng to xem ảnh, chi tiết đơn hàng, nút **Chấp nhận hoàn trả** có xác nhận và nút **Từ chối hoàn trả** kèm ô nhập lý do bắt buộc.
     - Đồng bộ nhãn `"Đã hoàn trả"` trong `staff/orders/types.ts`, `orders-list.tsx`, `admin/status.ts` và `frontend/tests/staff-orders.test.mjs`.

---

## Technical Context

- **Backend**: Node.js 24.x (ESM `.js`), Express 5.3.0, Mongoose 9.11.2, Multer 2.5.0 (`memoryStorage`), Cloudinary v2, Zod 4.6.7, Vitest 5.0.5, Supertest 7.3.1.
- **Frontend**: Next.js 16.4.2 (App Router, `cacheComponents: true`), React 19.3.0, TypeScript 5.x, Tailwind CSS 4, `lucide-react`, Node test runner (`node --test`).
- **Storage**: Mở rộng `Order` (nhúng subdocument `returnRequest` + thêm `"returned"` vào `orderStatuses`), cập nhật nguyên tử bằng `Order.updateOne` trên MongoDB standalone; cộng lại tồn kho trực tiếp trên `Product.variants.$.stock` và ghi `AuditLog`.
- **Security & Auth**:
  - Customer endpoints yêu cầu `readCookies`, `requireAuth`, `requireRole("customer")`, `Cache-Control: no-store`, lọc `customerId === request.user._id` (ẩn `404`), và CSRF (`protectMutation` cho JSON / `protectMultipartMutation` cho upload ảnh).
  - Staff endpoints đăng ký trên `workspaceRouter` và `PERMISSIONS` (`permissions.js`), bảo vệ bằng `readCookies`, `requireAuth`, `requireRole("staff")`, `protectMutation` trên `POST /decision`, và `Cache-Control: no-store`.

---

## Constitution & Governance Check

*Kiểm tra tuân thủ `CLAUDE.md` và `frontend/design.md` (Đạt cả trước và sau Phase 1 design):*

- [x] **Layered Architecture & No Duplication**: Logic upload Cloudinary tái sử dụng qua `backend/src/common/cloudinary-upload.js`; nghiệp vụ đọc/kiểm tra `Order.returnRequest` tách riêng vào `order-return.validator.js` & `order-return.controller.js`.
- [x] **Permission Matrix Consistency**: Mọi route `/staff/returns*` được khai báo đồng bộ trong `backend/src/common/permissions.js` và kiểm chứng bởi `admin-permissions.test.js`.
- [x] **CSRF & Multipart Protection**: Bảo vệ upload multipart qua `protectMultipartMutation` (Origin + `multipart/form-data` + `X-CSRF-Token`) và validate URL Cloudinary trả về (`https://res.cloudinary.com/...`) khi lưu vào DB.
- [x] **Atomic Standalone Writes**: Duyệt/từ chối dùng điều kiện `"returnRequest.status": "pending"` trong `Order.updateOne`, bảo đảm hoàn tồn kho chỉ xảy ra tối đa 1 lần dù nhiều Staff bấm đồng thời (`SC-004`).
- [x] **Frontend Isolation & Semantic Tokens**: Customer ở `features/orders/`, Staff ở `features/staff/returns/` (không import chéo); mọi UI sử dụng token từ `app/globals.css`, không gradient/shadow nặng, hỗ trợ `min-h-11` trên nút bấm chính.

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/order-returns/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ (Ready, 16/16 PASS)
├── plan.md                                     # Kế hoạch thiết kế kỹ thuật (tệp tin này)
├── research.md                                 # Khảo sát hiện trạng & 4 quyết định kỹ thuật
├── data-model.md                               # Subdocument returnRequest, enum "returned" & DTOs
├── quickstart.md                               # Hướng dẫn kiểm thử tự động và E2E thủ công
├── contracts/
│   └── order-returns-api.yaml                  # Hợp đồng OpenAPI 3.0 cho API Customer & Staff Returns
└── checklists/
    └── requirements.md                         # Checklist chất lượng đặc tả (16/16 PASS)
```

### Source Code Layout

```text
backend/
├── src/
│   ├── common/
│   │   ├── cloudinary-upload.js                # [NEW] Helper upload Buffer ảnh hợp lệ lên Cloudinary
│   │   ├── order-auto-complete.js              # [MODIFY] Loại trừ đơn có returnRequest pending/approved; đệm 24h nếu rejected
│   │   ├── order-payment.js                    # [MODIFY] Loại trừ trạng thái "returned" khỏi tiếp tục thanh toán
│   │   └── permissions.js                      # [MODIFY] Đăng ký GET/POST /staff/returns* trong PERMISSIONS
│   ├── controllers/
│   │   ├── auth.controller.js                  # [MODIFY] Thêm protectMultipartMutation dùng chung CSRF verification
│   │   ├── order-return.controller.js          # [NEW] uploadReturnImages, submitCustomerReturnRequest, listStaffReturns, getStaffReturnDetail, decideStaffReturn
│   │   ├── order-status.controller.js          # [MODIFY] Chặn confirmCustomerOrderReceipt khi returnRequest là pending/approved
│   │   ├── order.controller.js                 # [MODIFY] Gắn returnRequest & canRequestReturn/canConfirmReceipt vào getOrderDetail; hỗ trợ "returned" ở Staff
│   │   ├── admin-finance.controller.js         # [MODIFY] Tính đơn "returned" đã paid vào nhóm refunds (không tính doanh thu completed)
│   │   ├── admin-inventory-report.controller.js# [MODIFY] Loại trừ "returned" khỏi sản lượng bán ròng
│   │   └── admin/order.controller.js           # [MODIFY] Hỗ trợ trạng thái "returned" trên bộ lọc/bảng Admin
│   ├── models/
│   │   ├── shared.schema.js                    # [MODIFY] Thêm "returned" vào orderStatuses
│   │   └── order.model.js                      # [MODIFY] Thêm returnRequestSchema và index returnRequest.status + requestedAt
│   ├── routers/
│   │   ├── order.router.js                     # [MODIFY] Gắn POST /:id/return/upload & POST /:id/return
│   │   └── workspace.router.js                 # [MODIFY] Gắn GET /staff/returns, GET /staff/returns/:id, POST /staff/returns/:id/decision
│   └── validators/
│       ├── order-return.validator.js           # [NEW] Zod schemas & parser cho customer submit, staff query, staff decision
│       ├── order.validator.js                  # [MODIFY] Thêm "returned" vào staffOrderStatuses & staffOrderTransitions (returned: [])
│       └── admin/order.validator.js            # [MODIFY] Chấp nhận "returned" trong bộ lọc Admin Orders
└── tests/
    └── order-returns.test.js                   # [NEW] Tests đầy đủ upload MIME/size/CSRF, submit, approve (restock + refund), reject, race, auto-complete skip

frontend/
├── app/
│   ├── (customer)/orders/[id]/return/page.tsx  # [NEW] Trang gửi yêu cầu hoàn trả hàng cho Customer (<Suspense>)
│   └── (workspace)/staff/returns/
│       ├── page.tsx                            # [NEW] SSR danh sách yêu cầu hoàn trả cho Staff
│       └── [id]/page.tsx                       # [NEW] SSR chi tiết yêu cầu hoàn trả & duyệt/từ chối cho Staff
├── features/
│   ├── admin/
│   │   ├── status.ts                           # [MODIFY] Thêm label "Đã hoàn trả"
│   │   └── types.ts                            # [MODIFY] Thêm "returned" nếu OrderStatus liệt kê tĩnh
│   ├── orders/
│   │   ├── types.ts                            # [MODIFY] ReturnRequestReason, CustomerOrderReturnRequest, canRequestReturn, canConfirmReceipt
│   │   ├── index.tsx                           # [MODIFY] Export OrderReturnView
│   │   ├── services/order-return.service.ts    # [NEW] uploadReturnImagesApi, submitOrderReturnApi (CSRF multipart & JSON)
│   │   ├── hooks/use-order-return.ts           # [NEW] Form state, validation theo lý do (Q1:A), upload ảnh & submit
│   │   └── components/
│   │       ├── order-summary-sidebar.tsx       # [MODIFY] Nút "Hoàn trả hàng", hiển thị trạng thái hoàn trả & lý do từ chối
│   │       └── order-return-view.tsx           # [NEW] Biểu mẫu hoàn trả hàng kèm chọn lý do, mô tả, preview & upload ảnh
│   └── staff/
│       ├── orders/types.ts                     # [MODIFY] Thêm "returned" vào OrderStatus, orderStatusLabels, orderStatusTones
│       ├── returns/
│       │   ├── types.ts                        # [NEW] StaffReturnStatus, StaffReturnListResponse, StaffReturnDetail
│       │   └── api.ts                          # [NEW] fetchStaffReturns, fetchStaffReturnDetail, submitStaffReturnDecision (CSRF)
│       └── components/
│           ├── staff-shell.tsx                 # [MODIFY] Thêm mục điều hướng "Yêu cầu hoàn trả" (/staff/returns)
│           ├── orders-list.tsx                 # [MODIFY] Hỗ trợ tab trạng thái "Đã hoàn trả" nếu cần hoặc đồng bộ ALL_STATUSES
│           ├── returns-list.tsx                # [NEW] Bảng danh sách & lọc yêu cầu hoàn trả cho Staff
│           └── return-decision-panel.tsx       # [NEW] Gallery phóng to ảnh Cloudinary, nút Chấp nhận (confirm) & Từ chối (lý do bắt buộc)
└── tests/
    ├── order-returns.test.mjs                  # [NEW] Unit test client validation & service upload/submit/decision CSRF
    └── staff-orders.test.mjs                   # [MODIFY] Đồng bộ test mapping với trạng thái "returned" mới
```

---

## Phased Delivery Strategy

1. **Phase 1 — Schema, Bank Account, Cloudinary Upload & Validators**:
   - Cập nhật `order.model.js` (thêm `bankAccount` vào `returnRequestSchema`, enum `damaged_or_missing`).
   - Cập nhật `order-return.validator.js` (xác thực `bankAccount`: `bankName`, `accountNumber`, `accountHolder`, và enum `reason`).
2. **Phase 2 — Return APIs, Controller & Cross-Module Sync**:
   - Cập nhật `order-return.controller.js` (`submitCustomerReturnRequest` lưu `bankAccount`, `getStaffReturnDetail` trả `bankAccount`).
   - Cập nhật `order.controller.js` (`getOrderDetail` trả `bankAccount` cho khách hàng).
3. **Phase 3 — Customer Return Flow (`/orders/[id]` & `/orders/[id]/return`)**:
   - Cập nhật `features/orders/types.ts` (`ReturnBankAccount`, enum `ReturnRequestReason`).
   - Cập nhật `order-return-view.tsx`: Gộp 2 lý do thành "Hàng có vấn đề hoặc thiếu hàng" (bắt buộc ảnh) và "Chưa nhận được hàng" (tùy chọn ảnh).
   - Thêm section nhập thông tin tài khoản ngân hàng nhận hoàn tiền (Tên ngân hàng, Số tài khoản, Chủ tài khoản) và validate chặt chẽ trước khi gửi.
   - Cập nhật `order-summary-sidebar.tsx`: Hiển thị tóm tắt tài khoản ngân hàng trong trạng thái yêu cầu hoàn trả.
4. **Phase 4 — Staff Return Management (`/staff/returns` & `/staff/returns/[id]`)**:
   - Cập nhật `features/staff/returns/types.ts` (thêm `bankAccount`).
   - Cập nhật `return-decision-panel.tsx`: Hiển thị khối "Tài khoản ngân hàng nhận tiền hoàn" (kèm nút sao chép) trong phần thông tin thanh toán/hoàn tiền.
5. **Phase 5 — Verification & Build**:
   - Chạy test Backend `order-returns.test.js`, Frontend `order-returns.test.mjs`, TypeScript typecheck `tsc --noEmit` và `npm run build`.

