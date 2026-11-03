import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { VouchersList } from "@/features/admin/components/vouchers-list";
import { primaryLink } from "@/components/workspace/workspace-ui";

export const metadata = { title: "Quản Lí Voucher" };

export default function AdminVouchersPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Voucher", "Quản Lí Voucher"]} title="Quản Lí Voucher" subtitle="Tạo, bật tắt và theo dõi các mã giảm giá của cửa hàng."
      actions={<Link href="/admin/vouchers/new" className={`${primaryLink} min-h-12 gap-2`}><Plus className="h-4 w-4" aria-hidden="true" />Thêm voucher</Link>} />
    <Suspense fallback={<p role="status">Đang tải danh sách voucher…</p>}><VouchersList /></Suspense>
  </>;
}
