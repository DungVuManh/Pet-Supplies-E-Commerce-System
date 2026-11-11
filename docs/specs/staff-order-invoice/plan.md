# Implementation Plan: Staff Xuất Hóa Đơn Đơn Hàng (Staff Order Invoice)

**Branch**: `feature/staff-order-invoice` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/staff-order-invoice/spec.md`

---

## Summary

Xây dựng và tích hợp tính năng **Xuất hóa đơn cho từng đơn hàng dành cho Staff** theo đúng đặc tả đã chốt:
1. **Phía Backend (`backend/`)**:
   - Tạo helper nghiệp vụ thuần `order-invoice.js` xác định tính hợp lệ theo trạng thái đơn hàng (`confirmed`, `processing`, `shipping`, `completed`), tổng hợp dữ liệu hóa đơn từ snapshot bất biến của `Order`, thông tin cửa hàng từ `Setting` (fallback an toàn `"Petjoy"`), tên nhân viên xử lý từ `User`, và số lượt xuất từ `AuditLog`.
   - Cung cấp 2 endpoint mới tại `/api/v1/staff/orders/:id/invoice` (`GET`) và `/api/v1/staff/orders/:id/invoice/exports` (`POST` kèm `protectMutation` để ghi nhật ký kiểm toán `order.invoice.export` không làm biến đổi đơn hàng hay tồn kho).
   - Đăng ký đầy đủ 2 route mới vào `backend/src/common/permissions.js` để giữ nguyên 100% tính đồng bộ của ma trận phân quyền.
2. **Phía Frontend (`frontend/`)**:
   - Thiết kế trang xem trước hóa đơn chuẩn khổ **A4/A5** tại `/staff/orders/[id]/invoice` (Server Component kiểm tra session/role và SSR dữ liệu hóa đơn; Client Component điều khiển nút **"In hóa đơn / Lưu PDF"** gọi API ghi log xuất rồi kích hoạt `window.print()`).
   - Cập nhật `StaffShell` với `print:hidden` trên thanh bên và thanh điều hướng trên, kèm quy tắc `@page` / `@media print` để bản in/PDF sạch hoàn toàn khỏi giao diện quản trị và phân trang bảng sản phẩm đẹp mắt.
   - Bổ sung nút **"Xuất hóa đơn"** ở trang chi tiết đơn hàng `/staff/orders/[id]` (khóa có giải thích rõ ràng khi đơn đang `pending` hoặc `cancelled`) và liên kết nhanh **"Hóa đơn"** ở danh sách đơn `/staff/orders` cho các đơn đủ điều kiện.

---

## Technical Context

- **Backend**: Node.js 24.x (ES Modules, explicit `.js` imports), Express 5.3.0, Mongoose 9.11.2, Zod 4.6.7, Vitest 5.0.5, Supertest 7.3.1.
- **Frontend**: Next.js 16.4.2 (App Router, `cacheComponents`, Server + Client Components), React 19, TypeScript 5.x, Tailwind CSS 4, `lucide-react`, Node test runner (`node --test`).
- **Storage**: MongoDB 7+ qua Mongoose (tái sử dụng `Order`, `Setting`, `User`, `AuditLog` hiện có; tương thích hoàn toàn MongoDB standalone, không tạo collection mới).
- **Security & Auth**: Cookie session Firebase (`readCookies`, `requireAuth`, `requireRole("staff")`), `Cache-Control: no-store`, mutation ghi log xuất bảo vệ bằng `protectMutation` (JSON + Origin + CSRF pair `X-CSRF-Token` / `petly-csrf`), tuyệt đối không cho phép `customer` hoặc `admin` truy cập route `/staff/*` (tuân thủ nguyên tắc không kế thừa quyền trong `CLAUDE.md`).
- **Print & PDF Strategy**: HTML/CSS `@media print` chuẩn khổ A4/A5 tích hợp hộp thoại in / Save as PDF của trình duyệt, đảm bảo chữ vector tiếng Việt sắc nét và độ trễ tải < 2 giây.

---

## Constitution & Governance Check

*Kiểm tra tuân thủ các nguyên tắc kiến trúc của dự án (`CLAUDE.md` & `frontend/design.md`) — Đạt cả trước và sau giai đoạn thiết kế Phase 1:*

- [x] **Layered Architecture (`routers/` -> `controllers/` -> `common/` -> `models/`)**: Tách biệt logic dựng DTO & kiểm tra trạng thái vào `backend/src/common/order-invoice.js`, xử lý HTTP tại `backend/src/controllers/order-invoice.controller.js`, giữ `workspace.router.js` mỏng nhẹ.
- [x] **Isolated `createApp(config)` Testing**: Không thêm side-effect môi trường/DB mới vào controller; toàn bộ test chạy cô lập với `createApp(config)`.
- [x] **Permission Matrix Consistency**: Cả `GET /staff/orders/:id/invoice` và `POST /staff/orders/:id/invoice/exports` đều được khai báo trong `PERMISSIONS` (`backend/src/common/permissions.js`) và chạy test xác nhận bị từ chối `403 FORBIDDEN` với `customer`/`admin`.
- [x] **Immutable Order Snapshot**: Hóa đơn đọc 100% giá, số lượng, giảm giá, phí giao từ `Order`, không đọc giá bán mới từ `Product` và không sửa đổi `Order` hoặc tồn kho khi xuất.
- [x] **Frontend Feature Boundaries**: API calls đặt trong `features/staff/orders/api.ts`, kiểu dữ liệu trong `features/staff/orders/types.ts`, thành phần UI trong `features/staff/components/`, routing SSR trong `app/(workspace)/staff/orders/[id]/invoice/page.tsx`.
- [x] **Semantic Tokens & Accessibility**: Dùng semantic tokens từ `app/globals.css` (`text-ink`, `text-muted`, `border-line`, `bg-surface`, `bg-canvas`, `text-brand`), kích thước nút đạt chuẩn chạm (`min-h-10`/`min-h-11`), giữ ngữ nghĩa bảng (`<caption>`, `<thead>`, `<th scope="col">`).

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/staff-order-invoice/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ (16/16 PASS)
├── plan.md                                     # Kế hoạch triển khai kiến trúc (tệp tin này)
├── research.md                                 # Khảo sát codebase & quyết định kỹ thuật
├── data-model.md                               # Mô hình dữ liệu, kiểm tra trạng thái & DTO
├── quickstart.md                               # Hướng dẫn chạy thử và kịch bản kiểm chứng
├── contracts/
│   └── staff-order-invoice-api.yaml            # Hợp đồng OpenAPI 3.0 cho API xuất hóa đơn
└── checklists/
    └── requirements.md                         # Checklist chất lượng đặc tả (16/16 PASS)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── common/
│   │   ├── order-invoice.js                    # [NEW] Helper kiểm tra điều kiện & build StaffOrderInvoice DTO
│   │   └── permissions.js                      # [UPDATE] Đăng ký 2 route invoice vào ma trận quyền Staff
│   ├── controllers/
│   │   └── order-invoice.controller.js         # [NEW] Handlers getStaffOrderInvoice & recordStaffOrderInvoiceExport
│   └── routers/
│       └── workspace.router.js                 # [UPDATE] Mount GET /staff/orders/:id/invoice & POST .../exports
└── tests/
    └── staff-order-invoice.test.js             # [NEW] Unit + HTTP integration tests (auth, role, eligibility, DTO, audit)

frontend/
├── app/
│   └── (workspace)/
│       └── staff/
│           └── orders/
│               └── [id]/
│                   ├── page.tsx                # [UPDATE] Thêm nút "Xuất hóa đơn" (khóa có giải thích nếu pending/cancelled)
│                   └── invoice/
│                       └── page.tsx            # [NEW] Server Component tải SSR dữ liệu hóa đơn & xử lý lỗi 401/403/404/409
├── features/
│   └── staff/
│       ├── components/
│       │   ├── staff-shell.tsx                 # [UPDATE] Thêm print:hidden cho sidebar & header, mở rộng main khi in
│       │   ├── orders-list.tsx                 # [UPDATE] Thêm link nhanh "Hóa đơn" cho đơn từ confirmed trở lên
│       │   ├── invoice-document.tsx            # [NEW] Mẫu hóa đơn A4/A5 chuẩn in & bảng kê sản phẩm snapshot
│       │   └── invoice-actions.tsx             # [NEW] Thanh công cụ "Quay lại", "In hóa đơn / Lưu PDF" (gọi POST audit + window.print)
│       └── orders/
│           ├── types.ts                        # [UPDATE] Thêm StaffOrderInvoice, INVOICE_ELIGIBLE_STATUSES & helper kiểm tra
│           └── api.ts                          # [UPDATE] Thêm fetchStaffOrderInvoice (SSR) & recordStaffOrderInvoiceExport (CSRF)
└── tests/
    └── staff-order-invoice.test.mjs            # [NEW] Node tests cho parser/helper/CSRF export client của tính năng hóa đơn
```

---

## Phase Breakdown & Ordered Execution Steps

### Giai đoạn 1: Backend Invoice Logic, API & Audit Trail
1. **Xây dựng helper nghiệp vụ (`backend/src/common/order-invoice.js`)**:
   - Định nghĩa `INVOICE_ELIGIBLE_STATUSES = ["confirmed", "processing", "shipping", "completed"]`.
   - Cài đặt `assertInvoiceEligible(order)`: kiểm tra `orderStatus`, ném `AppError(..., 409, "INVOICE_NOT_ELIGIBLE")` với thông điệp rõ ràng riêng cho `pending` và `cancelled`.
   - Cài đặt `buildStaffOrderInvoice({ order, setting, staffNamesById, currentStaffName, exportCount })`: chuẩn hóa thông tin cửa hàng (fallback `"Petjoy"`), địa chỉ nhận hàng vs `"Nhận tại cửa hàng · Không giao hàng"`, từng dòng hàng snapshot (`lineTotal = unitPrice * qty`), tính `paidAmount` và `remainingAmount`.
2. **Xây dựng Controller (`backend/src/controllers/order-invoice.controller.js`)**:
   - `getStaffOrderInvoice`: Validate `id` bằng `parseOrderId`, tải `Order` (ẩn `creationState === "pending"` với `404`), kiểm tra điều kiện trạng thái, tải song song `Setting` (`_id: "global"`), `User` (`createdByStaffId`), và `AuditLog.countDocuments({ "target.collectionName": "orders", "target.id": String(order._id), action: "order.invoice.export", result: "success" })`. Đặt `Cache-Control: no-store`.
   - `recordStaffOrderInvoiceExport`: Validate `id`, tải `Order`, kiểm tra `assertInvoiceEligible(order)`, gọi `recordAudit(request, { action: "order.invoice.export", target: { collectionName: "orders", id: String(order._id) }, after: { orderCode: order.orderCode, orderStatus: order.orderStatus, total: order.total, channel: order.channel }, summary: ... })`, trả về `201` kèm metadata `exportRecord`.
3. **Đăng ký Router & Phân quyền**:
   - Khai báo trong `backend/src/routers/workspace.router.js`:
     - `GET /staff/orders/:id/invoice` với `readCookies, requireAuth, requireRole("staff")`.
     - `POST /staff/orders/:id/invoice/exports` với `readCookies, requireAuth, requireRole("staff"), protectMutation`.
   - Cập nhật `backend/src/common/permissions.js` thêm 2 route trên vào `all-orders` / `process-orders`.
4. **Viết & chạy kiểm thử Backend (`backend/tests/staff-order-invoice.test.js` & `admin-permissions.test.js`)**.

### Giai đoạn 2: Frontend Types, Services & Print Layout Support
1. **Cập nhật Types & Helpers (`frontend/features/staff/orders/types.ts`)**:
   - Bổ sung interface `StaffOrderInvoice` khớp contract OpenAPI và helper `isInvoiceEligibleOrder(status)` (`confirmed | processing | shipping | completed`).
2. **Cập nhật API Service (`frontend/features/staff/orders/api.ts`)**:
   - Thêm `fetchStaffOrderInvoice(origin, cookieHeader, id)` cho Server Component (ánh xạ lỗi `400/401/403/404/409/503`).
   - Thêm `recordStaffOrderInvoiceExport(id)` cho Client Component (lấy CSRF token từ `/api/v1/auth/csrf`, gọi `POST /api/v1/staff/orders/:id/invoice/exports`, trả về bản ghi hoặc xử lý lỗi an toàn để không kẹt thao tác in).
3. **Tối ưu khung in trong `StaffShell` & Global Print Rules**:
   - Thêm `print:hidden` cho sidebar `<aside>` và topbar `<header>` trong `frontend/features/staff/components/staff-shell.tsx`; đặt `print:max-w-none print:p-0 print:space-y-0` cho `<main>`.
   - Thêm quy tắc `@page { size: auto; margin: 12mm; }` hoặc scoping CSS `@media print` cho hóa đơn để trang in A4/A5 không bị cắt lề hoặc in dính header/footer thừa.

### Giai đoạn 3: Giao diện Xem trước Hóa đơn & Tích hợp Luồng Staff
1. **Xây dựng UI Hóa đơn chuẩn A4/A5 (`frontend/features/staff/components/invoice-document.tsx` & `invoice-actions.tsx`)**:
   - Header cửa hàng (Tên cửa hàng, địa chỉ, hotline, email — tự ẩn dòng rỗng) + Tiêu đề **"HÓA ĐƠN BÁN HÀNG"** + Mã đơn `#{orderCode}` + Ngày giờ `Asia/Ho_Chi_Minh`.
   - Khối thông tin 2 cột: Thông tin khách hàng & Địa chỉ giao (hoặc *"Nhận tại cửa hàng · Không giao hàng"*) | Thông tin chứng từ (Kênh bán, Trạng thái đơn, Nhân viên phụ trách/lập đơn). Không có trường MST/VAT công ty (FR-012).
   - Bảng sản phẩm: STT, Sản phẩm (kèm SKU), SL, Đơn giá, Thành tiền (`break-inside-avoid`, `thead` lặp lại khi sang trang).
   - Bảng tổng hợp tài chính: Tạm tính, Giảm giá (`promotionCode`), Phí giao hàng, Tổng cộng, Phương thức & Trạng thái thanh toán, Đã thanh toán, Còn phải thu (kèm ghi chú nếu `needsReview`).
   - Thanh công cụ `print:hidden`: Nút quay lại chi tiết đơn, nút **"In hóa đơn / Lưu PDF"** kích hoạt audit log + `window.print()`.
2. **Tạo Route Trang Hóa đơn (`frontend/app/(workspace)/staff/orders/[id]/invoice/page.tsx`)**:
   - Server Component kiểm tra session cookie, gọi `fetchStaffOrderInvoice`, xử lý riêng trường hợp `409 INVOICE_NOT_ELIGIBLE` bằng màn hình thông báo trạng thái không hợp lệ thân thiện + link quay lại chi tiết đơn.
3. **Gắn nút thao tác vào Chi tiết đơn & Danh sách đơn**:
   - `frontend/app/(workspace)/staff/orders/[id]/page.tsx`: Nút **"Xuất hóa đơn"** ở thanh header/hành động; nếu trạng thái là `pending` hoặc `cancelled`, khóa nút kèm ghi chú giải thích rõ ràng.
   - `frontend/features/staff/components/orders-list.tsx`: Thêm liên kết nhanh **"Hóa đơn"** bên cạnh **"Chi tiết"** đối với các đơn đủ điều kiện.

### Giai đoạn 4: Kiểm thử & Xác minh Toàn hệ thống
- Viết unit test Frontend (`frontend/tests/staff-order-invoice.test.mjs`) cho helper & client API.
- Chạy `npm.cmd --prefix backend test` (trọng tâm `staff-order-invoice.test.js`, `admin-permissions.test.js`, `staff-orders.test.js`).
- Chạy `npm.cmd --prefix frontend test`, `npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`.
- Xác thực thủ công các kịch bản trong `quickstart.md` (in thử ra PDF khổ A4 & A5).

