"use client";

import { PageHeader, secondaryButton } from "@/features/staff/components/staff-ui";

export default function ProductError({ retry }: { retry: () => void }) {
  return <>
    <PageHeader title="Chưa thể tải sản phẩm" />
    <p role="alert" className="rounded-lg bg-danger-subtle p-4 text-danger">Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.</p>
    <button type="button" className={secondaryButton} onClick={() => retry()}>Thử lại</button>
  </>;
}
