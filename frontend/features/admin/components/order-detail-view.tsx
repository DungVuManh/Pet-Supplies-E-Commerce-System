import Link from "next/link";
import { Star } from "lucide-react";
import { DetailList, InfoCallout, card, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDateTime, formatPhone, formatVnd } from "@/lib/format";
import { orderStatusLabels, paymentMethodLabels, paymentStatusLabels } from "../status";
import type { AdminOrderDetail } from "../types";
import { AdminPageHeader, DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const channelLabels = { online: "Trực tuyến", offline: "Tại cửa hàng" } as const;

function addressText(address: NonNullable<AdminOrderDetail["shippingAddress"]>) {
  return [address.street, address.ward, address.district, address.province].filter(Boolean).join(", ") || "Chưa có địa chỉ";
}

/** Read-only: Staff process orders, and cancellation requests have their own screen. */
export function OrderDetailView({ order }: { order: AdminOrderDetail }) {
  const { customer, shippingAddress: address } = order;
  const amounts = [
    { label: "Tạm tính", value: formatVnd(order.subtotal) },
    ...(order.discount > 0 ? [{ label: order.promotionCode ? `Giảm giá (${order.promotionCode})` : "Giảm giá", value: `−${formatVnd(order.discount)}` }] : []),
    ...(order.shippingFee !== null ? [{ label: "Phí giao hàng", value: formatVnd(order.shippingFee) }] : []),
    { label: "Tổng tiền", value: <span className="text-lg font-semibold">{formatVnd(order.total)}</span> },
  ];

  return <>
    <AdminPageHeader breadcrumbs={["Đơn hàng", `#${order.orderCode}`]} title={`Đơn #${order.orderCode}`}
      subtitle={`${channelLabels[order.channel]} · Tạo lúc ${formatDateTime(order.createdAt)}`}
      actions={<Link href="/admin/orders" className={`${secondaryButton} min-h-12`}>Quay lại danh sách</Link>} />
    {order.needsReview && <p role="status" className="rounded-lg bg-warning-subtle px-4 py-3 text-sm text-warning">Thanh toán của đơn này cần đối soát lại: số tiền nhận được khác với tổng đơn.</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <DataTable caption="Sản phẩm trong đơn" head={<><Th>Sản phẩm</Th><Th className="w-32">Đơn giá</Th><Th className="w-24">SL</Th><Th className="w-36">Thành tiền</Th></>}>
          {order.items.map((item) => <tr key={`${item.sku}-${item.unitPrice}`}>
            <Td><Stack primary={item.productExists
              ? <Link href={`/admin/products/${encodeURIComponent(item.sku)}`} className="font-semibold hover:text-brand hover:underline">{item.name}</Link>
              : item.name} secondary={`SKU ${item.sku}${item.productExists ? "" : " · đã xóa khỏi danh mục"}`} /></Td>
            <Td className="tabular-nums">{formatVnd(item.unitPrice)}</Td>
            <Td className="tabular-nums">{item.qty.toLocaleString("vi-VN")}</Td>
            <Td className="font-semibold tabular-nums">{formatVnd(item.lineTotal)}</Td>
          </tr>)}
        </DataTable>

        <section aria-labelledby="order-history" className={`${card} p-6`}>
          <h2 id="order-history" className="text-xl font-semibold">Lịch sử trạng thái</h2>
          {order.statusHistory.length === 0
            ? <p className="mt-4 text-sm text-muted">Chưa có thay đổi trạng thái nào được ghi lại.</p>
            : <ol className="mt-4 space-y-4">{order.statusHistory.map((entry) => <li key={`${entry.at}-${entry.to}`} className="border-l-2 border-line pl-4">
              <p className="font-semibold">{entry.from ? `${orderStatusLabels[entry.from] ?? entry.from} → ` : ""}{orderStatusLabels[entry.to] ?? entry.to}</p>
              <p className="mt-1 text-xs text-muted">{formatDateTime(entry.at)} · {entry.actorName ?? "Hệ thống"}</p>
            </li>)}</ol>}
        </section>
      </div>

      <aside className="min-w-0 space-y-6" aria-label="Thông tin đơn hàng">
        <section aria-labelledby="order-status" className={`${card} p-6`}>
          <h2 id="order-status" className="text-xl font-semibold">Trạng thái</h2>
          <div className="mt-4"><StatusBadge status={orderStatusLabels[order.status]} /></div>
          <div className="mt-2"><DetailList items={[
            { label: "Thanh toán", value: paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod },
            { label: "Tình trạng thanh toán", value: order.paymentStatus ? paymentStatusLabels[order.paymentStatus] : "Chưa có thông tin" },
            ...(order.paidAmount ? [{ label: "Đã nhận", value: formatVnd(order.paidAmount) }] : []),
            ...(order.createdByStaff ? [{ label: "Nhân viên bán", value: order.createdByStaff }] : []),
          ]} /></div>
        </section>
        <section aria-labelledby="order-amounts" className={`${card} p-6`}>
          <h2 id="order-amounts" className="text-xl font-semibold">Thanh toán</h2>
          <div className="mt-2"><DetailList items={amounts} /></div>
        </section>
        <section aria-labelledby="order-customer" className={`${card} p-6`}>
          <h2 id="order-customer" className="text-xl font-semibold">Khách hàng</h2>
          <div className="mt-2"><DetailList items={[
            { label: "Họ tên", value: customer.accountId
              ? <Link href={`/admin/users/${customer.accountId}`} className="text-brand hover:underline">{customer.name}</Link>
              : customer.name },
            { label: "Loại", value: customer.isGuest ? (order.channel === "offline" ? "Khách tại cửa hàng" : "Khách vãng lai") : "Có tài khoản" },
            { label: "Điện thoại", value: customer.phone ? formatPhone(customer.phone) : "Chưa có" },
            ...(customer.email ? [{ label: "Email", value: customer.email }] : []),
          ]} /></div>
        </section>
        {(address || order.shipping) && <section aria-labelledby="order-delivery" className={`${card} p-6`}>
          <h2 id="order-delivery" className="text-xl font-semibold">Giao hàng</h2>
          <div className="mt-2"><DetailList items={[
            ...(address ? [
              { label: "Người nhận", value: [address.recipientName, address.phone && formatPhone(address.phone)].filter(Boolean).join(" · ") || "Chưa có" },
              { label: "Địa chỉ", value: addressText(address) },
            ] : []),
            ...(order.shipping ? [
              { label: "Đơn vị vận chuyển", value: order.shipping.carrier || "Chưa có" },
              { label: "Mã vận đơn", value: order.shipping.trackingNumber || "Chưa có" },
            ] : []),
          ]} /></div>
        </section>}
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Chỉ xem">
          Nhân viên xử lý và cập nhật trạng thái đơn tại không gian vận hành. Yêu cầu hủy được duyệt ở mục Yêu cầu hủy.
        </InfoCallout>
      </aside>
    </div>
  </>;
}
