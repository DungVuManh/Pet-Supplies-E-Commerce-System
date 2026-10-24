import Image from "next/image";
import Link from "next/link";
import { money } from "@/features/staff/mock-data";
import {
 Badge,
 PageHeader,
 card,
 primaryLink,
} from "@/features/staff/components/staff-ui";
import { getStaffProduct } from "@/features/staff/products/server";

export default async function ProductDetailPage({
 params,
}: {
 params: Promise<{ sku: string }>;
}) {
 const { sku } = await params;
 const p = await getStaffProduct(sku);
 const available = p.availableStock;

 return (
  <>
   <PageHeader
    title={p.name}
    subtitle={`SKU ${p.sku} · ${p.category} · Cập nhật ${p.updated}`}
    action={
     <Link
      className={primaryLink}
      href={`/staff/products/${encodeURIComponent(p.sku)}/edit`}
     >
      Chỉnh sửa sản phẩm
     </Link>
    }
   />

   <div className="grid gap-6 lg:grid-cols-[392px_minmax(0,1fr)]">
    <section className={`${card} p-6`}>
     <Image
      src={p.image || "/images/products/royal-canin-mini-adult.png"}
      alt={p.name}
      width={344}
      height={272}
      className="mt-4 h-72 w-full rounded-lg bg-canvas object-contain"
     />
     <div className="mt-4">
      <Badge tone={p.status === "active" ? "success" : "neutral"}>
       {p.status === "active" ? "Đang bán" : "Tạm ẩn"}
      </Badge>
     </div>
    </section>

    <div className="space-y-6">
     <section className={`${card} p-6`}>
      <h2 className="text-xl font-semibold">Thông tin sản phẩm</h2>
      <dl className="mt-5 grid grid-cols-2 gap-5">
       <dt className="text-muted">Thương hiệu</dt>
       <dd className="text-right">{p.brand}</dd>
       <dt className="text-muted">Danh mục</dt>
       <dd className="text-right">{p.category}</dd>
       <dt className="text-muted">Quy cách / Khối lượng</dt>
       <dd className="text-right">{p.weight}</dd>
       <dt className="text-muted">Giá bán </dt>
       <dd className="text-right font-semibold">{money(p.price)}</dd>
      </dl>
     </section>

     <section className={`${card} p-6`}>
      <h2 className="text-xl font-semibold">Tồn kho </h2>
      <dl className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
       <div>
        <dt className="text-xs text-muted">Thực tế</dt>
        <dd className="mt-2 text-[32px] font-semibold">{p.physical}</dd>
       </div>
       <div>
        <dt className="text-xs text-muted">Giữ chỗ</dt>
        <dd className="mt-2 text-[32px] font-semibold">{p.reserved}</dd>
       </div>
       <div>
        <dt className="text-xs text-muted">Khả dụng</dt>
        <dd className="mt-2 text-[32px] font-semibold">{available}</dd>
       </div>
       <div>
        <dt className="text-xs text-muted">Ngưỡng báo</dt>
        <dd className="mt-2 text-[32px] font-semibold">{p.threshold}</dd>
       </div>
      </dl>
     </section>
    </div>
   </div>

   <section className={`${card} p-6`}>
    <h2 className="text-xl font-semibold">Mô tả sản phẩm</h2>
    <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">
     {p.description || "Chưa có mô tả."}
    </p>
   </section>
  </>
 );
}
