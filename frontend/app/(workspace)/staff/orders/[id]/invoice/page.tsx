import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { InvoiceActions } from "@/features/staff/components/invoice-actions";
import { InvoiceDocument } from "@/features/staff/components/invoice-document";
import { card, primaryLink, secondaryButton } from "@/features/staff/components/staff-ui";
import {
  fetchStaffOrderInvoice,
  StaffOrdersApiError,
} from "@/features/staff/orders/api";

export default async function StaffOrderInvoicePage({
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
  let invoice = null;
  let ineligibleMessage: string | null = null;

  try {
    invoice = await fetchStaffOrderInvoice(
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
      if (error.status === 409 && error.code === "INVOICE_NOT_ELIGIBLE") {
        ineligibleMessage = error.message;
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (ineligibleMessage || !invoice) {
    return (
      <section
        role="alert"
        className={`${card} mx-auto max-w-xl p-6 sm:p-8`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink">
              Đơn hàng chưa đủ điều kiện xuất hóa đơn
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {ineligibleMessage ||
                "Chỉ hỗ trợ xuất hóa đơn cho đơn hàng từ trạng thái Đã xác nhận trở lên."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/staff/orders/${encodeURIComponent(id)}`}
                className={`${primaryLink} gap-2`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Quay lại chi tiết đơn hàng</span>
              </Link>
              <Link href="/staff/orders" className={secondaryButton}>
                Danh sách đơn hàng
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="py-2 print:py-0">
      <InvoiceActions
        orderId={invoice.order.id}
        orderCode={invoice.order.orderCode}
        initialExportCount={invoice.invoiceMeta.exportCount}
      />
      <InvoiceDocument invoice={invoice} />
    </div>
  );
}

