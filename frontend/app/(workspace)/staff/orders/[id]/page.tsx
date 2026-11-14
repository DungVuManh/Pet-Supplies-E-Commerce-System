import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Printer, AlertCircle } from "lucide-react";
import { money } from "@/features/staff/mock-data";
import {
 Badge,
 PageHeader,
 card,
 primaryLink,
 secondaryButton,
} from "@/features/staff/components/staff-ui";
import {
 fetchStaffOrderDetail,
 StaffOrdersApiError,
} from "@/features/staff/orders/api";
import { OrderStatusAction } from "@/features/staff/components/order-status-action";
import {
 isInvoiceEligibleOrder,
 orderStatusLabels,
 orderStatusTones,
 paymentMethodLabels,
 paymentStatusLabels,
 paymentStatusTones,
} from "@/features/staff/orders/types";

function formatFullDateTime(iso: string): string {
 try {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("vi-VN", {
   timeZone: "Asia/Ho_Chi_Minh",
   dateStyle: "medium",
   timeStyle: "short",
  }).format(d);
 } catch {
  return iso;
 }
}

export default async function OrderDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;

 const sessionName =
  process.env.NODE_ENV === "production"
   ? "__Host-petly-session"
   : "petly-session";
 const cookieStore = await cookies();
 const session = cookieStore.get(sessionName);

 if (!session) {
  redirect("/login");
 }

 const origin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
 let order;

 try {
  order = await fetchStaffOrderDetail(
   origin,
   `${sessionName}=${encodeURIComponent(session.value)}`,
   id,
  );
 } catch (error) {
  if (error instanceof StaffOrdersApiError) {
   if (error.status === 404 || error.status === 400) {
    notFound();
   }
   if (error.status === 401) {
    redirect("/login");
   }
   if (error.status === 403) {
    redirect("/forbidden");
   }
  }
  throw error;
 }

 const canExportInvoice = isInvoiceEligibleOrder(order.orderStatus);

 return (
  <>
   <PageHeader
    title={`Đơn hàng #${order.orderCode}`}
    subtitle={`Đặt lúc ${formatFullDateTime(order.createdAt)} `}
    action={
     canExportInvoice ? (
      <Link
       href={`/staff/orders/${encodeURIComponent(order.id)}/invoice`}
       className={`${primaryLink} gap-2`}
      >
       <Printer className="h-4 w-4" aria-hidden="true" />
       <span>Xuất hóa đơn</span>
      </Link>
     ) : (
      <div className="flex flex-col items-start gap-1 sm:items-end">
       <button
        type="button"
        disabled
        title="Chỉ hỗ trợ xuất hóa đơn cho đơn hàng từ trạng thái Đã xác nhận trở lên."
        className={`${secondaryButton} cursor-not-allowed gap-2 opacity-60 hover:bg-surface`}
       >
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span>Xuất hóa đơn</span>
       </button>
       <span className="text-xs text-muted">
        Chỉ hỗ trợ xuất hóa đơn từ trạng thái Đã xác nhận trở lên.
       </span>
      </div>
     )
    }
   />

   <div className="mb-4">
    <Link
     href="/staff/orders"
     className="inline-flex min-h-10 items-center font-medium text-brand hover:underline"
    >
     ← Danh sách đơn hàng
    </Link>
   </div>

   <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
    <div className="space-y-6">
     {/* Order Items */}
     <section className={`${card} p-6`}>
      <div className="flex items-center justify-between gap-3">
       <h2 className="text-xl font-semibold">Sản phẩm trong đơn</h2>
      </div>

      <ul className="mt-4 divide-y divide-line">
       {order.items.map((item) => (
        <li key={item.variantSku} className="flex items-center gap-4 py-4">
         <Image
          src={
           item.currentProduct?.image ||
           "/images/products/royal-canin-mini-adult.png"
          }
          alt={item.name}
          width={64}
          height={64}
          className="h-16 w-16 rounded-lg bg-canvas object-contain"
         />
         <div className="min-w-0 flex-1">
          <p className="font-semibold">
           {item.name} (x{item.qty})
          </p>
          <p className="mt-1 text-xs text-muted">{item.variantSku}</p>
          <strong className="mt-1 text-sm text-muted">
           {money(item.unitPrice)}
          </strong>
         </div>
         <strong className="tabular-nums">{money(item.lineTotal)}</strong>
        </li>
       ))}
      </ul>

      <dl className="ml-auto mt-6 grid max-w-sm grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
       <dt className="text-muted">Tạm tính</dt>
       <dd className="text-right font-medium">{money(order.subtotal)}</dd>
       {order.discount > 0 && (
        <>
         <dt className="text-muted">
          Giảm giá{order.promotionCode ? ` (${order.promotionCode})` : ""}
         </dt>
         <dd className="text-right font-medium text-success">
          −{money(order.discount)}
         </dd>
        </>
       )}
       <dt className="text-muted">Phí giao hàng</dt>
       <dd className="text-right font-medium">{money(order.shippingFee)}</dd>
       <dt className="text-base font-semibold">Tổng thanh toán</dt>
       <dd className="text-right text-base font-bold text-ink">
        {money(order.total)}
       </dd>
      </dl>
     </section>

     {/* Status History */}
     <section className={`${card} p-6`}>
      <h2 className="text-xl font-semibold">Lịch sử trạng thái</h2>
      {order.statusHistory.length > 0 ? (
       <div className="mt-5 space-y-4">
        {order.statusHistory.map((h, index) => (
         <div
          key={index}
          className="grid gap-2 border-b border-line pb-3 sm:grid-cols-[160px_1fr]"
         >
          <span className="text-xs text-muted">{formatFullDateTime(h.at)}</span>
          <div>
           <p className="font-semibold">
            Trạng thái: {orderStatusLabels[h.to] || h.to}
           </p>
           <p className="mt-1 text-xs text-muted">
            Thực hiện bởi: {h.actorName || "Hệ thống / Không có thông tin"}
           </p>
          </div>
         </div>
        ))}
       </div>
      ) : (
       <p className="mt-4 text-sm text-muted">Chưa có lịch sử trạng thái.</p>
      )}
     </section>
    </div>

    {/* Aside details */}
    <aside className="space-y-6">
     <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-medium text-muted">Trạng thái đơn:</span>
      <Badge tone={orderStatusTones[order.orderStatus]}>
       {orderStatusLabels[order.orderStatus]}
      </Badge>
     </div>

     {order.orderStatus === "cancelled" && (
      <div className="rounded-lg border border-danger/30 bg-danger-subtle p-4 text-danger">
       <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Đơn hàng đã bị hủy</span>
       </div>
       <p className="mt-2 text-sm">
        <strong>Lý do:</strong> {order.cancellationReason || "Không có lý do cụ thể"}
       </p>
       {order.cancellationNote && (
        <p className="mt-1 text-sm text-danger/80">
         <strong>Ghi chú:</strong> {order.cancellationNote}
        </p>
       )}
      </div>
     )}

     {/* Customer & Address */}
     <OrderStatusAction order={order} />
     <section className={`${card} p-6`}>
      <h2 className="text-xl font-semibold">
       {order.channel === "offline"
        ? "Khách hàng tại quầy"
        : "Khách hàng & địa chỉ"}
      </h2>
      <div className="mt-4 space-y-2">
       <p className="font-semibold">{order.customer.name}</p>
       <p className="text-sm">{order.customer.phone}</p>
       {order.customer.email && (
        <p className="text-sm text-muted">{order.customer.email}</p>
       )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
       {order.channel === "offline" ? (
        <p className="text-sm font-medium">
         Nhận tại cửa hàng · Không giao hàng
        </p>
       ) : (
        <>
         <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Địa chỉ nhận hàng
         </h3>
         <p className="mt-2 text-sm leading-relaxed">
          {order.shippingAddress.street}, {order.shippingAddress.ward},{" "}
          {order.shippingAddress.district}, {order.shippingAddress.province}
         </p>
        </>
       )}
      </div>
     </section>

     {/* Payment */}
     <section className={`${card} p-6`}>
      <h2 className="text-xl font-semibold">Thanh toán</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
       <Badge tone={paymentStatusTones[order.paymentStatus]}>
        {paymentStatusLabels[order.paymentStatus]}
       </Badge>
       {order.needsReview && <Badge tone="warning">⚠️ Cần đối soát</Badge>}
      </div>

      {order.needsReview && (
       <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
        Đơn hàng có chênh lệch tiền hoặc chuyển khoản sau khi đổi phương thức.
        Vui lòng đối soát giao dịch ngân hàng.
       </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
       <dt className="text-muted">Phương thức</dt>
       <dd className="text-right font-medium">
        {order.paymentMethod === "ONLINE"
         ? "Chuyển khoản VietQR (SePay)"
         : paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
       </dd>
       {Boolean(order.paidAmount && order.paidAmount > 0) && (
        <>
         <dt className="text-muted">Đã thanh toán</dt>
         <dd className="text-right font-bold text-emerald-600">
          {money(order.paidAmount || 0)}
         </dd>
        </>
       )}
       {order.paymentMethod === "COD" && order.paymentStatus === "unpaid" && (
        <>
         <dt className="text-muted">Cần thu khi giao</dt>
         <dd className="text-right font-bold text-danger">
          {money(order.total)}
         </dd>
        </>
       )}
      </dl>
     </section>

     <div className="rounded-lg bg-brand-subtle p-4 text-xs leading-relaxed text-muted">
      <strong className="block font-semibold text-brand">
       Dữ liệu đơn hàng từ cơ sở dữ liệu
      </strong>
      <p className="mt-1">
       Thông tin sản phẩm và giá cả phản ánh đúng thời điểm đặt hàng (snapshot).
      </p>
     </div>
    </aside>
   </div>
  </>
 );
}
