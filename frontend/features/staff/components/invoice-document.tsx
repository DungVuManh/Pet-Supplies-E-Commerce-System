import { money } from "@/features/staff/mock-data";
import {
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  type StaffOrderInvoice,
} from "@/features/staff/orders/types";

function formatInvoiceDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatShippingAddress(invoice: StaffOrderInvoice): string {
  if (invoice.order.channel === "offline" || !invoice.order.shippingAddress) {
    return "Nhận tại cửa hàng · Không giao hàng";
  }
  const { street, ward, district, province } = invoice.order.shippingAddress;
  const parts = [street, ward, district, province].filter((part) => Boolean(part && part.trim()));
  return parts.length > 0 ? parts.join(", ") : "Không có thông tin địa chỉ giao hàng";
}

export function InvoiceDocument({ invoice }: { invoice: StaffOrderInvoice }) {
  const { store, order, invoiceMeta } = invoice;
  const shippingText = formatShippingAddress(invoice);
  const paymentMethodLabel =
    order.paymentMethod === "ONLINE"
      ? "Chuyển khoản VietQR (SePay)"
      : paymentMethodLabels[order.paymentMethod] || order.paymentMethod;
  const contactLines = [
    store.address ? `Địa chỉ: ${store.address}` : "",
    store.hotline ? `Hotline: ${store.hotline}` : "",
    store.email ? `Email: ${store.email}` : "",
  ].filter(Boolean);

  return (
    <article
      aria-label={`Hóa đơn đơn hàng ${order.orderCode}`}
      className="mx-auto w-full max-w-[794px] rounded-xl border border-line bg-surface p-6 text-ink shadow-xs sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      {/* Phần đầu chứng từ: Thông tin cửa hàng & Thông tin mã hóa đơn */}
      <header className="flex flex-col justify-between gap-6 border-b border-line pb-6 sm:flex-row sm:items-start print:flex-row">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xl font-bold tracking-tight text-brand">{store.name}</p>
          {contactLines.map((line) => (
            <p key={line} className="text-xs leading-relaxed text-muted">
              {line}
            </p>
          ))}
        </div>

        <div className="shrink-0 text-left sm:text-right print:text-right">
          <h1 className="text-xl font-bold uppercase tracking-wide text-ink">
            Hóa đơn bán hàng
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-ink tabular-nums">
            Mã đơn: #{order.orderCode}
          </p>
          <p className="mt-1 text-xs text-muted">
            Ngày lập đơn: {formatInvoiceDateTime(order.createdAt)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Kênh bán: {order.channel === "offline" ? "Tại quầy" : "Trực tuyến"}
          </p>
        </div>
      </header>

      {/* Thông tin khách hàng & Thông tin chứng từ */}
      <section
        aria-label="Thông tin khách hàng và thanh toán"
        className="mt-6 grid gap-6 border-b border-line pb-6 sm:grid-cols-2 print:grid-cols-2"
      >
        <div className="min-w-0 space-y-1.5 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Khách hàng &amp; Giao nhận
          </h2>
          <p className="font-semibold text-ink">{order.customer.name}</p>
          {order.customer.phone && (
            <p className="text-xs text-muted">SĐT: {order.customer.phone}</p>
          )}
          {order.customer.email && (
            <p className="break-all text-xs text-muted">Email: {order.customer.email}</p>
          )}
          <p className="pt-1 text-xs leading-relaxed text-ink">
            <span className="font-medium text-muted">Hình thức nhận hàng: </span>
            {shippingText}
          </p>
        </div>

        <div className="min-w-0 space-y-1.5 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Thông tin giao dịch
          </h2>
          <p className="text-xs">
            <span className="text-muted">Trạng thái đơn: </span>
            <strong className="font-semibold text-ink">
              {orderStatusLabels[order.orderStatus] || order.orderStatus}
            </strong>
          </p>
          <p className="text-xs">
            <span className="text-muted">Thanh toán: </span>
            <span className="font-medium text-ink">
              {paymentMethodLabel} ({paymentStatusLabels[order.paymentStatus] || order.paymentStatus})
            </span>
          </p>
          {order.createdByStaff && (
            <p className="text-xs">
              <span className="text-muted">Nhân viên tạo đơn: </span>
              <span className="font-medium text-ink">{order.createdByStaff}</span>
            </p>
          )}
          <p className="text-xs">
            <span className="text-muted">Nhân viên xuất hóa đơn: </span>
            <span className="font-medium text-ink">{invoiceMeta.generatedBy}</span>
          </p>
        </div>
      </section>

      {order.needsReview && (
        <div
          role="note"
          className="mt-4 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-2.5 text-xs font-medium text-warning"
        >
          Lưu ý đối soát: Giao dịch thanh toán của đơn hàng có chênh lệch số tiền hoặc đổi phương thức. Số liệu thực thu bên dưới phản ánh đúng dữ liệu hệ thống đang ghi nhận.
        </div>
      )}

      {/* Bảng chi tiết sản phẩm snapshot */}
      <section className="mt-6">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Chi tiết sản phẩm của đơn hàng {order.orderCode}
            </caption>
            <thead>
              <tr className="border-b border-t border-line bg-canvas text-xs font-semibold uppercase tracking-wider text-muted">
                <th scope="col" className="w-10 px-3 py-2.5 text-left">
                  STT
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  Sản phẩm
                </th>
                <th scope="col" className="w-16 px-3 py-2.5 text-right">
                  SL
                </th>
                <th scope="col" className="w-28 px-3 py-2.5 text-right">
                  Đơn giá
                </th>
                <th scope="col" className="w-32 px-3 py-2.5 text-right">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item, index) => (
                <tr key={`${item.variantSku}-${index}`} className="align-top">
                  <td className="px-3 py-3 text-xs text-muted tabular-nums">
                    {index + 1}
                  </td>
                  <td className="min-w-0 px-3 py-3">
                    <p className="break-words font-medium text-ink">{item.name}</p>
                    <p className="mt-0.5 break-all text-xs text-muted">
                      SKU: {item.variantSku}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">
                    {item.qty}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-muted tabular-nums">
                    {money(item.unitPrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-ink tabular-nums">
                    {money(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tổng kết tài chính */}
      <section className="mt-6 flex justify-end border-t border-line pt-5">
        <dl className="w-full max-w-xs space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Tạm tính</dt>
            <dd className="font-medium tabular-nums">{money(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                Giảm giá{order.promotionCode ? ` (${order.promotionCode})` : ""}
              </dt>
              <dd className="font-medium text-success tabular-nums">
                −{money(order.discount)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Phí giao hàng</dt>
            <dd className="font-medium tabular-nums">{money(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2.5 text-base font-bold">
            <dt className="text-ink">Tổng thanh toán</dt>
            <dd className="text-brand tabular-nums">{money(order.total)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-dashed border-line pt-2.5 text-xs">
            <dt className="text-muted">Đã thanh toán</dt>
            <dd className="font-semibold text-success tabular-nums">
              {money(order.paidAmount)}
            </dd>
          </div>
          {order.remainingAmount > 0 && (
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-muted">Còn phải thu</dt>
              <dd className="font-bold text-danger tabular-nums">
                {money(order.remainingAmount)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Chân trang hóa đơn */}
      <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">
        <p className="font-medium text-ink">
          Cảm ơn quý khách đã tin tưởng mua sắm tại {store.name}!
        </p>
        <p className="mt-1">
          Chứng từ được xuất lúc {formatInvoiceDateTime(invoiceMeta.generatedAt)} · Giá trị hàng hóa tính bằng VND.
        </p>
      </footer>
    </article>
  );
}

