# Implementation Plan: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến (Resume Online Payment)

**Branch**: `feature/resume-online-payment` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/resume-online-payment/spec.md`

---

## Summary

Triển khai luồng **Tiếp tục thanh toán đơn hàng trực tuyến (ONLINE / VietQR)** cho khách hàng đã đăng nhập khi thoát khỏi màn hình mã QR lúc đặt hàng:

1. **Phía Backend (`backend/`)**:
   - Tạo module dùng chung [`order-payment.js`](../../../backend/src/common/order-payment.js) tính toán thống nhất trạng thái hợp lệ thanh toán lại (`eligible | already_paid | cancelled | not_online`), số tiền đã thanh toán/còn thiếu, thời hạn phiên QR (`paymentExpiredAt ?? createdAt + 15m`) và thông tin VietQR (tái sử dụng `sepay-service.js` + `Setting`).
   - Bổ sung 3 endpoint xác thực chủ sở hữu trên `backend/src/routers/order.router.js`:
     - `GET /api/v1/orders/:id/payment` (`readCookies, requireAuth, requireRole("customer"), Cache-Control: no-store`)
     - `POST /api/v1/orders/:id/payment/renew` (`readCookies, requireAuth, requireRole("customer"), protectMutation`)
     - `POST /api/v1/orders/:id/payment/convert-to-cod` (`readCookies, requireAuth, requireRole("customer"), protectMutation`)
   - Chuẩn hóa lại `GET /api/v1/orders/:id` (`getOrderDetail` trong `order.controller.js`) để trả chính xác `orderStatus`, `paymentMethodLabel`, `paymentStatusCode`, nhãn `paymentStatus` ("Chờ thanh toán" / "Thanh toán một phần" / "Đã thanh toán"), `paidAmount`, `remainingAmount`, `paymentExpiredAt`, và cờ `canResumeOnlinePayment`.
   - Gia cố thêm các kiểm tra `orderStatus === "cancelled"` và `paymentMethod !== "ONLINE"` trong `payment.controller.js` bằng helper chung, bảo toàn tương thích 100% với bộ test SePay hiện tại.

2. **Phía Frontend (`frontend/`)**:
   - Tách thành phần giao diện hiển thị mã VietQR thuần UI ra `frontend/components/payment/vietqr-transfer-panel.tsx` (dùng chung cho cả `features/checkout/components/sepay-transfer-card.tsx` lẫn `features/orders` mà **không import chéo giữa các feature**).
   - Cập nhật `OrderSummarySidebar` (`frontend/features/orders/components/order-summary-sidebar.tsx`) và `OrderDetail` types:
     - Hiển thị đúng tên phương thức ("Chuyển khoản trực tuyến (VietQR)" / "Thanh toán khi nhận hàng (COD)"), badge màu semantic theo trạng thái thực tế (`bg-warning-subtle`, `bg-brand-subtle`, `bg-success-subtle`, `bg-danger-subtle`), chi tiết Đã thanh toán / Còn thiếu khi trả một phần.
     - Hiển thị nút **"Thanh toán ngay"** (hoặc **"Tiếp tục thanh toán"** khi trả một phần) dẫn tới `/orders/[id]/pay` khi `canResumeOnlinePayment === true` (`ONLINE`, chưa `paid`, chưa `cancelled`). Không gắn nút trên bảng `/orders` hoặc `/order-tracking` theo `Q1: A`.
   - Tạo trang mới `/orders/[id]/pay` (`frontend/app/(customer)/orders/[id]/pay/page.tsx`) bọc `<Suspense>` nhất quán với Next.js 16 `cacheComponents`, sử dụng hook `useOrderResumePayment` + service `resume-payment.service.ts` (đầy đủ CSRF cho `renew` / `convert-to-cod`, polling 3 giây, đếm ngược giữ nguyên mốc hết hạn `Q3: A`, và giao diện xử lý trạng thái đã thanh toán / đã hủy / COD / chưa đăng nhập).

---

## Technical Context

- **Backend**: Node.js 24.x (ESM với phần mở rộng `.js`), Express 5.3.0, Mongoose 9.11.2, Firebase Admin, Vitest 5.0.5, Supertest 7.3.1.
- **Frontend**: Next.js 16.4.2 (App Router với `cacheComponents: true` & `partialPrefetching: true`), React 19.3.0, TypeScript 5.x, Tailwind CSS 4, `lucide-react`, Node test runner (`node --test`).
- **Storage**: Tái sử dụng collection `orders` và `settings` hiện có trong MongoDB standalone; sử dụng cập nhật nguyên tử có điều kiện (`Order.updateOne`) cho `renew` và `convert-to-cod` thay vì multi-document transaction.
- **Security & Auth**:
  - `GET /orders/:id/payment`, `POST /orders/:id/payment/renew`, `POST /orders/:id/payment/convert-to-cod` dùng `readCookies`, `requireAuth`, `requireRole("customer")`, `Cache-Control: no-store`, và lọc bắt buộc `customerId === request.user._id` + `creationState !== "pending"`.
  - Mọi mutation (`renew`, `convert-to-cod`) đi qua `protectMutation` (kiểm tra `Origin` + JSON + cặp CSRF `X-CSRF-Token` / `petly-csrf`).

---

## Constitution & Governance Check

*Kiểm tra tuân thủ các quy tắc trong `CLAUDE.md` và `frontend/design.md` (Đạt cả trước và sau Phase 1 design):*

- [x] **Feature Isolation (`CLAUDE.md`)**: Giao diện QR dùng chung đặt tại `frontend/components/payment/vietqr-transfer-panel.tsx`; `features/orders` không import từ `features/checkout`.
- [x] **Frontend Layer Boundaries**: Service gọi API thuần nằm trong `features/orders/services/resume-payment.service.ts`, state/polling/countdown nằm trong `features/orders/hooks/use-order-resume-payment.ts`, JSX nằm trong `features/orders/components/`, route page mỏng tại `app/(customer)/orders/[id]/pay/page.tsx`.
- [x] **Customer Ownership & Mutation Security**: Tất cả route tiếp tục thanh toán trên `/orders/:id/payment*` kiểm tra đúng vai trò `customer`, lọc `customerId`, ẩn đơn của người khác bằng `404 ORDER_NOT_FOUND`, áp dụng `Cache-Control: no-store` và CSRF `protectMutation`.
- [x] **No Duplication**: Trích logic kiểm tra trạng thái & dựng VietQR vào `backend/src/common/order-payment.js` dùng chung giữa `order-payment.controller.js` và `payment.controller.js`; trích UI QR vào `VietQrTransferPanel`.
- [x] **Semantic Tokens & Accessibility (`frontend/design.md`)**: Sử dụng semantic tokens trong `app/globals.css` (`bg-brand`, `hover:bg-brand-hover`, `bg-brand-subtle`, `bg-warning-subtle`, `text-warning`, `bg-success-subtle`, `text-success`, `bg-danger-subtle`, `text-danger`, `border-line`, `bg-surface`), không gradient/shadow nặng, kích thước nút chạm tối thiểu `min-h-11`.
- [x] **Next.js 16 Compatibility**: Trang `/orders/[id]/pay/page.tsx` giữ pattern `<Suspense>` nhất quán với `/orders/[id]/page.tsx` và `/orders/[id]/cancel/page.tsx` để tương thích `cacheComponents: true`.

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/resume-online-payment/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ (Ready, 16/16 PASS)
├── plan.md                                     # Kế hoạch thiết kế kỹ thuật (tệp tin này)
├── research.md                                 # Khảo sát hiện trạng & 4 quyết định kỹ thuật
├── data-model.md                               # Luật hợp lệ, chuyển trạng thái nguyên tử & DTO
├── quickstart.md                               # Hướng dẫn kiểm thử tự động và E2E thủ công
├── contracts/
│   └── resume-online-payment-api.yaml          # Hợp đồng OpenAPI 3.0 cho API thanh toán lại
└── checklists/
    └── requirements.md                         # Checklist chất lượng đặc tả (16/16 PASS)
```

### Source Code Layout

```text
backend/
├── src/
│   ├── common/
│   │   ├── order-payment.js                    # [NEW] Helper thuần: điều kiện hợp lệ, số tiền thiếu, config ngân hàng, build VietQR & session DTO
│   │   └── sepay-service.js                    # [REUSE] formatTransferMemo, generateVietQrUrl, generateVietQrPayload
│   ├── controllers/
│   │   ├── order.controller.js                 # [MODIFY] Mở rộng getOrderDetail: trả paymentStatusCode, paidAmount, remainingAmount, canResumeOnlinePayment
│   │   ├── order-payment.controller.js         # [NEW] getCustomerOrderPayment, renewCustomerOrderPayment, convertCustomerOrderToCod
│   │   └── payment.controller.js               # [MODIFY] Tái sử dụng order-payment.js, chặn cancelled / non-ONLINE ở luồng public
│   └── routers/
│       └── order.router.js                     # [MODIFY] Gắn GET /:id/payment, POST /:id/payment/renew, POST /:id/payment/convert-to-cod
└── tests/
    └── resume-online-payment.test.js           # [NEW] Bộ kiểm thử unit & HTTP integration (auth, ownership, CSRF, eligibility, partial, atomic race)

frontend/
├── app/
│   └── (customer)/
│       └── orders/
│           └── [id]/
│               └── pay/
│                   └── page.tsx                # [NEW] Route trang tiếp tục thanh toán VietQR (/orders/[id]/pay) bọc <Suspense>
├── components/
│   └── payment/
│       └── vietqr-transfer-panel.tsx           # [NEW] UI thuần hiển thị VietQR, đếm ngược, hết hạn & sao chép dùng chung
├── features/
│   ├── checkout/
│   │   └── components/
│   │       └── sepay-transfer-card.tsx         # [MODIFY] Tái sử dụng VietQrTransferPanel để không trùng lặp UI QR
│   └── orders/
│       ├── types.ts                            # [MODIFY] Mở rộng OrderDetail & thêm CustomerOrderPaymentSession types
│       ├── index.tsx                           # [MODIFY] Export OrderResumePaymentView
│       ├── services/
│       │   └── resume-payment.service.ts       # [NEW] API client + helper CSRF cho getPaymentSession, renewPaymentSession, convertToCod
│       ├── hooks/
│       │   └── use-order-resume-payment.ts     # [NEW] Hook state, countdown (Q3:A), polling 3s, manual check, renew & convert COD
│       └── components/
│           ├── order-summary-sidebar.tsx       # [MODIFY] Hiển thị đúng phương thức/trạng thái, đã trả/còn thiếu, nút "Thanh toán ngay" -> /orders/[id]/pay
│           └── order-resume-payment-view.tsx   # [NEW] Giao diện hoàn chỉnh màn hình /orders/[id]/pay (pending, paid, cod, cancelled, auth)
└── tests/
    └── resume-online-payment.test.mjs          # [NEW] Unit test kiểm tra helper điều kiện, service API & CSRF
```

---

## Phased Delivery Strategy

1. **Phase 1 — Shared Payment Domain & Contracts**:
   - Xây dựng `backend/src/common/order-payment.js`, mở rộng DTO trong `frontend/features/orders/types.ts`, tách UI dùng chung `frontend/components/payment/vietqr-transfer-panel.tsx`.
2. **Phase 2 — Authenticated Backend APIs & Guards**:
   - Tạo `backend/src/controllers/order-payment.controller.js`, gắn route vào `backend/src/routers/order.router.js`, cập nhật `getOrderDetail` và gia cố `payment.controller.js`.
3. **Phase 3 — Customer Entry Point (`/orders/[id]`) & Payment Page (`/orders/[id]/pay`)**:
   - Tích hợp nút **"Thanh toán ngay / Tiếp tục thanh toán"** và hiển thị thanh toán chuẩn xác tại `OrderSummarySidebar`; tạo `resume-payment.service.ts`, `use-order-resume-payment.ts`, `order-resume-payment-view.tsx` và trang `app/(customer)/orders/[id]/pay/page.tsx`; đồng bộ `SepayTransferCard` sử dụng `VietQrTransferPanel`.
4. **Phase 4 — Automated Tests & Build Verification**:
   - Viết test Backend (`resume-online-payment.test.js`) và Frontend (`resume-online-payment.test.mjs`), chạy hồi quy SePay / đơn hàng và kiểm tra `next build`.

