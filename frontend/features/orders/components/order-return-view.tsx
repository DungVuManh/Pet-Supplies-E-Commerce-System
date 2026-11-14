"use client";

// =============================================================
// features/orders/components/order-return-view.tsx
// Màn hình Khách hàng gửi yêu cầu hoàn trả đơn hàng
// =============================================================

import Link from "next/link";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { AccountSidebar } from "./account-sidebar";
import { useOrderDetail } from "../hooks/use-order-detail";
import { useOrderReturn } from "../hooks/use-order-return";
import type { ReturnRequestReason } from "../types";
import { isReturnImageRequired } from "../types";

type OrderReturnViewProps = {
 orderId?: string;
};

const RETURN_REASON_OPTIONS: {
 value: ReturnRequestReason;
 label: string;
 hint: string;
}[] = [
 {
  value: "damaged_or_missing",
  label: "Hàng có vấn đề hoặc thiếu hàng",
  hint:
   "Sản phẩm bị hư hỏng, bể vỡ, bao bì rách, lỗi sản xuất hoặc thiếu sản phẩm, quà tặng kèm (Bắt buộc kèm ảnh).",
 },
 {
  value: "not_received",
  label: "Chưa nhận được hàng",
  hint: "Đơn hàng ở trạng thái đang giao quá hạn nhưng bạn chưa nhận được.",
 },
];

const COMMON_BANKS = [
 "Vietcombank (Ngân hàng Ngoại thương)",
 "Techcombank (Ngân hàng Kỹ thương)",
 "MB Bank (Ngân hàng Quân đội)",
 "VPBank (Ngân hàng VN Thịnh Vượng)",
 "ACB (Ngân hàng Á Châu)",
 "VietinBank (Ngân hàng Công thương)",
 "BIDV (Ngân hàng Đầu tư & Phát triển)",
 "TPBank (Ngân hàng Tiên Phong)",
 "Sacombank (Ngân hàng Sài Gòn Thương Tín)",
 "VIB (Ngân hàng Quốc tế)",
 "SeABank (Ngân hàng Đông Nam Á)",
 "HDBank (Ngân hàng Phát triển TP.HCM)",
 "MSB (Ngân hàng Hàng Hải)",
 "OCB (Ngân hàng Phương Đông)",
 "SHB (Ngân hàng Sài Gòn - Hà Nội)",
];

function formatVND(value: number): string {
 return value.toLocaleString("vi-VN") + " đ";
}

export function OrderReturnView({ orderId = "" }: OrderReturnViewProps) {
 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const {
  order,
  isLoading: isOrderLoading,
  error: orderError,
 } = useOrderDetail(orderId);

 const {
  reason,
  bankName,
  accountNumber,
  accountHolder,
  description,
  files,
  previewUrls,
  fieldErrors,
  isUploading,
  isSubmitting,
  isSuccess,
  handleReasonChange,
  handleBankNameChange,
  handleAccountNumberChange,
  handleAccountHolderChange,
  handleDescriptionChange,
  handleFileSelect,
  handleRemoveFile,
  submitReturn,
 } = useOrderReturn(orderId);

 const [agreedPrivacy, setAgreedPrivacy] = useState(true);

 if (isOrderLoading) {
  return (
   <div className="container py-16 text-center text-sm text-ink-muted">
    Đang tải thông tin đơn hàng...
   </div>
  );
 }

 if (orderError || !order) {
  return (
   <div className="container py-16 text-center">
    <p className="text-sm text-rose-600 font-medium mb-4">
     {orderError || "Không tìm thấy đơn hàng."}
    </p>
    <Link
     href="/orders"
     className="inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-brand text-on-brand text-sm font-semibold hover:opacity-90 transition-opacity"
    >
     Quay lại danh sách đơn hàng
    </Link>
   </div>
  );
 }

 // Chặn nếu đơn không thỏa mãn điều kiện gửi hoàn trả
 const hasExistingReturn = Boolean(
  order.returnRequest?.status && order.returnRequest.status !== "cancelled",
 );
 const canReturn =
  typeof order.canRequestReturn === "boolean"
   ? order.canRequestReturn
   : order.channel !== "offline" &&
     (order.orderStatus === "shipping" || order.orderStatus === "completed") &&
     !hasExistingReturn;

 if (hasExistingReturn || !canReturn) {
  return (
   <div className="min-h-screen bg-canvas py-8">
    <div className="container mx-auto px-4 max-w-6xl">
     <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
       <AccountSidebar />
      </div>
      <div className="lg:col-span-3">
       <div className="bg-surface rounded-xl border border-line p-8 text-center">
        <span className="text-3xl mb-3 block">ℹ️</span>
        <h2 className="text-lg font-bold text-ink mb-2">
         {hasExistingReturn
          ? "Đơn hàng đã có yêu cầu hoàn trả"
          : "Không thể yêu cầu hoàn trả"}
        </h2>
        <p className="text-sm text-ink-muted mb-6 max-w-md mx-auto">
         {hasExistingReturn
          ? "Yêu cầu hoàn trả cho đơn hàng này đã được gửi trước đó. Bạn có thể theo dõi tiến độ xử lý tại trang Chi tiết đơn hàng."
          : "Chức năng hoàn trả hàng chỉ áp dụng cho đơn hàng đang giao hoặc trong vòng 7 ngày kể từ khi nhận hàng."}
        </p>
        <Link
         href={`/orders/${order.id}`}
         className="inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-brand text-on-brand text-sm font-semibold hover:opacity-90 transition-opacity"
        >
         Xem chi tiết đơn hàng
        </Link>
       </div>
      </div>
     </div>
    </div>
   </div>
  );
 }

 if (isSuccess) {
  return (
   <div className="min-h-screen bg-canvas py-8">
    <div className="container mx-auto px-4 max-w-6xl">
     <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
       <AccountSidebar />
      </div>
      <div className="lg:col-span-3">
       <div className="bg-surface rounded-xl border border-line p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
         ✓
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">
         Đã gửi yêu cầu hoàn trả thành công!
        </h2>
        <p className="text-sm text-ink-muted mb-6 max-w-lg mx-auto">
         Yêu cầu của bạn cho đơn hàng{" "}
         <strong className="text-ink">#{order.orderCode}</strong> đã được tiếp
         nhận. Đội ngũ nhân viên sẽ kiểm tra lý do, thông tin chuyển khoản và
         hình ảnh minh chứng để phản hồi sớm nhất.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
         <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-brand text-on-brand text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
         >
          Xem tiến độ tại Chi tiết đơn
         </Link>
         <Link
          href="/orders"
          className="inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-line bg-surface text-ink text-sm font-medium hover:bg-canvas transition-colors w-full sm:w-auto"
         >
          Về danh sách đơn hàng
         </Link>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  );
 }

 const imageRequired = Boolean(reason && isReturnImageRequired(reason));

 return (
  <div className="min-h-screen bg-canvas py-8">
   <div className="container mx-auto px-4 max-w-6xl">
    {/* Breadcrumb */}
    <nav className="flex items-center gap-2 text-sm text-ink-muted mb-6">
     <Link href="/orders" className="hover:text-brand transition-colors">
      Đơn hàng của tôi
     </Link>
     <span>/</span>
     <Link
      href={`/orders/${order.id}`}
      className="hover:text-brand transition-colors"
     >
      Đơn #{order.orderCode}
     </Link>
     <span>/</span>
     <span className="text-ink font-medium">Yêu cầu hoàn trả</span>
    </nav>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
     {/* Sidebar */}
     <div className="lg:col-span-1">
      <AccountSidebar />
     </div>

     {/* Main Content */}
     <div className="lg:col-span-3 space-y-6">
      {/* Header Card */}
      <div className="bg-surface rounded-xl border border-line p-6">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
         <h1 className="text-xl font-bold text-ink">
          Yêu cầu hoàn trả đơn hàng
         </h1>
         <p className="text-xs text-ink-muted mt-1">
          Đơn hàng #{order.orderCode} · Đặt ngày {order.orderDate}
         </p>
        </div>
        <div className="text-right">
         <span className="text-xs text-ink-muted">Tổng tiền đơn</span>
         <p className="text-base font-bold text-brand">
          {formatVND(order.totalAmount)}
         </p>
        </div>
       </div>

       {/* Thông tin sản phẩm trong đơn */}
       <div className="mt-4">
        <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
         Sản phẩm trong đơn ({order.items.length})
        </h3>
        <div className="divide-y divide-line">
         {order.items.map((item) => (
          <div
           key={item.id}
           className="py-2 flex items-center justify-between text-sm"
          >
           <div className="flex items-center gap-3">
            {item.image ? (
             <div className="w-10 h-10 rounded border border-line overflow-hidden relative flex-shrink-0">
              <Image
               src={item.image}
               alt={item.name}
               fill
               sizes="40px"
               className="object-cover"
              />
             </div>
            ) : (
             <div className="w-10 h-10 rounded bg-canvas border border-line flex items-center justify-center text-xs text-ink-muted">
              Ảnh
             </div>
            )}
            <div>
             <p className="font-medium text-ink line-clamp-1">{item.name}</p>
             <p className="text-xs text-ink-muted">
              SKU: {item.sku} · SL: {item.quantity}
             </p>
            </div>
           </div>
           <span className="font-medium text-ink flex-shrink-0">
            {formatVND(item.price * item.quantity)}
           </span>
          </div>
         ))}
        </div>
       </div>
      </div>

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-line p-6 space-y-6">
       {/* Error banner */}
       {fieldErrors.general && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
         {fieldErrors.general}
        </div>
       )}

       {/* 1. Chọn lý do */}
       <div>
        <label className="block text-sm font-bold text-ink mb-2">
         1. Chọn lý do hoàn trả <span className="text-rose-500">*</span>
        </label>
        <div className="space-y-3">
         {(order.orderStatus === "completed" || order.status === "completed"
          ? RETURN_REASON_OPTIONS.filter((opt) => opt.value !== "not_received")
          : RETURN_REASON_OPTIONS
         ).map((opt) => (
          <label
           key={opt.value}
           className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
            reason === opt.value
             ? "border-brand bg-brand/5 ring-1 ring-brand"
             : "border-line hover:border-ink-muted"
           }`}
          >
           <input
            type="radio"
            name="returnReason"
            value={opt.value}
            checked={reason === opt.value}
            onChange={() => handleReasonChange(opt.value)}
            className="mt-1 h-4 w-4 text-brand focus:ring-brand border-line"
           />
           <div className="flex-1">
            <div className="flex items-center gap-2">
             <span className="text-sm font-semibold text-ink">{opt.label}</span>
             {opt.value !== "not_received" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
               Cần ảnh
              </span>
             )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{opt.hint}</p>
           </div>
          </label>
         ))}
        </div>
        {fieldErrors.reason && (
         <p className="text-xs text-rose-600 mt-1.5 font-medium">
          {fieldErrors.reason}
         </p>
        )}
       </div>

       {/* 2. Nhập thông tin tài khoản ngân hàng */}
       <div className="rounded-xl border border-line bg-canvas/40 p-4 space-y-4">
        <div>
         <label className="block text-sm font-bold text-ink">
          2. Thông tin tài khoản ngân hàng nhận tiền hoàn{" "}
          <span className="text-rose-500">*</span>
         </label>
         <p className="text-xs text-ink-muted mt-0.5">
          Nhân viên sẽ sử dụng tài khoản này để chuyển tiền hoàn trả khi yêu cầu
          được duyệt.
         </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         {/* Tên ngân hàng */}
         <div className="sm:col-span-2">
          <label
           htmlFor="bankName"
           className="block text-xs font-semibold text-ink mb-1"
          >
           Tên ngân hàng <span className="text-rose-500">*</span>
          </label>
          <input
           id="bankName"
           list="banks-list"
           type="text"
           value={bankName}
           onChange={(e) => handleBankNameChange(e.target.value)}
           placeholder="Chọn hoặc nhập tên ngân hàng (Ví dụ: Vietcombank, Techcombank, MB Bank...)"
           className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand ${
            fieldErrors.bankName
             ? "border-rose-400 bg-rose-50/30"
             : "border-line bg-surface"
           }`}
          />
          <datalist id="banks-list">
           {COMMON_BANKS.map((b) => (
            <option key={b} value={b} />
           ))}
          </datalist>
          {fieldErrors.bankName && (
           <p className="text-xs text-rose-600 mt-1 font-medium">
            {fieldErrors.bankName}
           </p>
          )}
         </div>

         {/* Số tài khoản */}
         <div>
          <label
           htmlFor="accountNumber"
           className="block text-xs font-semibold text-ink mb-1"
          >
           Số tài khoản <span className="text-rose-500">*</span>
          </label>
          <input
           id="accountNumber"
           type="text"
           value={accountNumber}
           onChange={(e) => handleAccountNumberChange(e.target.value)}
           placeholder="Nhập số tài khoản ngân hàng"
           className={`w-full rounded-lg border px-3 py-2 text-sm text-ink font-mono placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand ${
            fieldErrors.accountNumber
             ? "border-rose-400 bg-rose-50/30"
             : "border-line bg-surface"
           }`}
          />
          {fieldErrors.accountNumber && (
           <p className="text-xs text-rose-600 mt-1 font-medium">
            {fieldErrors.accountNumber}
           </p>
          )}
         </div>

         {/* Tên chủ tài khoản */}
         <div>
          <label
           htmlFor="accountHolder"
           className="block text-xs font-semibold text-ink mb-1"
          >
           Tên chủ tài khoản <span className="text-rose-500">*</span>
          </label>
          <input
           id="accountHolder"
           type="text"
           value={accountHolder}
           onChange={(e) => handleAccountHolderChange(e.target.value)}
           placeholder="Ví dụ: NGUYEN VAN A"
           className={`w-full rounded-lg border px-3 py-2 text-sm text-ink uppercase placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand ${
            fieldErrors.accountHolder
             ? "border-rose-400 bg-rose-50/30"
             : "border-line bg-surface"
           }`}
          />
          {fieldErrors.accountHolder && (
           <p className="text-xs text-rose-600 mt-1 font-medium">
            {fieldErrors.accountHolder}
           </p>
          )}
         </div>
        </div>

        {/* Đồng ý chia sẻ dữ liệu cá nhân theo Luật số 91/2025/QH15 */}
        <div className="pt-3 pb-1 border-t border-line">
         <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer select-none">
          <input
           type="checkbox"
           checked={agreedPrivacy}
           onChange={(e) => setAgreedPrivacy(e.target.checked)}
           className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <span className="leading-relaxed">
           Tôi đồng ý chia sẻ dữ liệu cá nhân với cửa hàng theo{" "}
           <Link
            href="/policy/dieu-khoan-bao-ve-du-lieu-ca-nhan"
            target="_blank"
            className="text-brand font-semibold underline hover:text-brand-hover inline-flex items-center gap-0.5"
           >
            Điều khoản bảo vệ dữ liệu cá nhân
           </Link>{" "}
           (Luật số 91/2025/QH15).
          </span>
         </label>
        </div>
       </div>

       {/* 3. Nhập mô tả */}
       <div>
        <div className="flex items-center justify-between mb-2">
         <label htmlFor="description" className="text-sm font-bold text-ink">
          3. Mô tả chi tiết vấn đề <span className="text-rose-500">*</span>
         </label>
         <span className="text-xs text-ink-muted">
          {description.trim().length} / 1000 ký tự (tối thiểu 10)
         </span>
        </div>
        <textarea
         id="description"
         rows={4}
         value={description}
         onChange={(e) => handleDescriptionChange(e.target.value)}
         placeholder="Vui lòng mô tả cụ thể tình trạng hàng hóa, vị trí hư hỏng hoặc chi tiết hàng còn thiếu..."
         className={`w-full rounded-lg border p-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand ${
          fieldErrors.description
           ? "border-rose-400 bg-rose-50/30"
           : "border-line bg-surface"
         }`}
        />
        {fieldErrors.description && (
         <p className="text-xs text-rose-600 mt-1.5 font-medium">
          {fieldErrors.description}
         </p>
        )}
       </div>

       {/* 4. Tải ảnh minh chứng */}
       <div>
        <div className="flex items-center justify-between mb-2">
         <label className="text-sm font-bold text-ink">
          4. Hình ảnh minh chứng{" "}
          {imageRequired && <span className="text-rose-500">*</span>}
         </label>
         <span className="text-xs text-ink-muted">
          {files.length} / 5 ảnh{" "}
          {imageRequired ? "(Bắt buộc ≥ 1)" : "(Tùy chọn)"}
         </span>
        </div>
        <p className="text-xs text-ink-muted mb-3">
         Định dạng: JPG, PNG, WEBP. Dung lượng tối đa: 5MB/ảnh. Ảnh sẽ được lưu
         trữ an toàn trên Cloudinary.
        </p>

        {/* Previews grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
         {previewUrls.map((url, index) => (
          <div
           key={url}
           className="relative aspect-square rounded-lg border border-line overflow-hidden group bg-canvas"
          >
           <Image
            src={url}
            alt={`Ảnh minh chứng ${index + 1}`}
            fill
            sizes="120px"
            className="object-cover"
           />
           <button
            type="button"
            onClick={() => handleRemoveFile(index)}
            disabled={isSubmitting}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/75 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
            aria-label="Xóa ảnh"
           >
            ✕
           </button>
          </div>
         ))}

         {/* Add button */}
         {files.length < 5 && (
          <button
           type="button"
           onClick={() => fileInputRef.current?.click()}
           disabled={isSubmitting}
           className="aspect-square rounded-lg border-2 border-dashed border-line hover:border-brand flex flex-col items-center justify-center text-ink-muted hover:text-brand transition-colors p-2 text-center cursor-pointer"
          >
           <svg
            className="w-6 h-6 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
           >
            <path
             strokeLinecap="round"
             strokeLinejoin="round"
             strokeWidth={2}
             d="M12 4v16m8-8H4"
            />
           </svg>
           <span className="text-xs font-medium">Thêm ảnh</span>
          </button>
         )}
        </div>

        <input
         ref={fileInputRef}
         type="file"
         multiple
         accept="image/jpeg,image/png,image/webp"
         onChange={(e) => {
          if (e.target.files) handleFileSelect(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
         }}
         className="hidden"
        />

        {fieldErrors.images && (
         <p className="text-xs text-rose-600 mt-1.5 font-medium">
          {fieldErrors.images}
         </p>
        )}
       </div>

       {/* Actions */}
       <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-end gap-3">
        <Link
         href={`/orders/${order.id}`}
         className="w-full sm:w-auto inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-line bg-surface text-ink text-sm font-semibold hover:bg-canvas transition-colors"
        >
         Hủy bỏ
        </Link>
        <button
         type="button"
         onClick={submitReturn}
         disabled={isSubmitting || !agreedPrivacy}
         className="w-full sm:w-auto inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-brand text-on-brand text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
        >
         {isUploading ? (
          <span className="flex items-center gap-2">
           <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
           Đang tải ảnh lên Cloudinary...
          </span>
         ) : isSubmitting ? (
          <span className="flex items-center gap-2">
           <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
           Đang gửi yêu cầu...
          </span>
         ) : (
          "Gửi yêu cầu hoàn trả"
         )}
        </button>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
