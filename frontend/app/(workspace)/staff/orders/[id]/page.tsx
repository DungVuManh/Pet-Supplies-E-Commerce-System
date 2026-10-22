import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { money } from "@/features/staff/mock-data";
import { Badge, PageHeader, card } from "@/features/staff/components/staff-ui";
import { fetchStaffOrderDetail, StaffOrdersApiError } from "@/features/staff/orders/api";
import {
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
      id
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

  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <PageHeader
        title={`Đơn hàng #${order.orderCode}`}
        subtitle={`Đặt lúc ${formatFullDateTime(order.createdAt)} · Kênh ${
          order.channel === "online" ? "Website" : "Tại quầy (Offline)"
        }${order.createdByStaff ? ` · Tạo bởi: ${order.createdByStaff}` : ""}`}
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
              <span className="text-xs text-muted">
                {order.items.length} dòng · {totalQty} sản phẩm
              </span>
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
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.currentProduct?.variantLabel || "Quy cách chuẩn"} · SKU:{" "}
                      {item.variantSku}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {money(item.unitPrice)} × {item.qty}
                      <span className="ml-3 font-normal">
                        (
                        {item.currentProduct
                          ? `Tồn khả dụng hiện tại: ${item.currentProduct.availableStock}`
                          : "Không còn thông tin tồn kho"}
                        )
                      </span>
                    </p>
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
                  <dt className="text-muted">Giảm giá</dt>
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
                    <span className="text-xs text-muted">
                      {formatFullDateTime(h.at)}
                    </span>
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

          {/* Customer & Address */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">{order.channel === "offline" ? "Khách hàng tại quầy" : "Khách hàng & địa chỉ"}</h2>
            <div className="mt-4 space-y-2">
              <p className="font-semibold">{order.customer.name}</p>
              <p className="text-sm">{order.customer.phone}</p>
              {order.customer.email && (
                <p className="text-sm text-muted">{order.customer.email}</p>
              )}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              {order.channel === "offline" ? <p className="text-sm font-medium">Nhận tại cửa hàng · Không giao hàng</p> : <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Địa chỉ nhận hàng
              </h3>
              <p className="mt-2 text-sm leading-relaxed">
                {order.shippingAddress.street}, {order.shippingAddress.ward},{" "}
                {order.shippingAddress.district}, {order.shippingAddress.province}
              </p>
              </>}
            </div>

            {order.shipping && (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Đơn vị vận chuyển
                </h3>
                <p className="mt-1 text-sm font-medium">{order.shipping.carrier}</p>
                <p className="mt-1 text-xs text-muted">
                  Mã vận đơn: {order.shipping.trackingNumber}
                </p>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Thanh toán</h2>
            <div className="mt-4">
              <Badge tone={paymentStatusTones[order.paymentStatus]}>
                {paymentStatusLabels[order.paymentStatus]}
              </Badge>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <dt className="text-muted">Phương thức</dt>
              <dd className="text-right font-medium">
                {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
              </dd>
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
