import { Suspense } from "react";
import { VoucherForm } from "@/features/admin/components/voucher-form";
import { getVoucher } from "@/features/admin/services/vouchers.server";

type Params = PageProps<"/admin/vouchers/[code]/edit">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function EditVoucher({ params }: { params: Params }) {
  return <VoucherForm voucher={await getVoucher((await params).code)} />;
}

export default function AdminVoucherEditPage({ params }: PageProps<"/admin/vouchers/[code]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditVoucher params={params} /></Suspense>;
}
