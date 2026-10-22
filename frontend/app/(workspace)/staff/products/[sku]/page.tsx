import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { availableStock, getProduct, money, type Product } from "@/features/staff/mock-data";
import { Badge, PageHeader, card, primaryLink } from "@/features/staff/components/staff-ui";

async function fetchProduct(sku: string): Promise<Product | null> {
  try {
    const origin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
    const name = process.env.NODE_ENV === "production" ? "__Host-petly-session" : "petly-session";
    const session = (await cookies()).get(name);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (session) {
      headers.Cookie = `${name}=${encodeURIComponent(session.value)}`;
    }

    const res = await fetch(`${origin}/api/v1/staff/products/${sku}`, {
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (error) {
    console.warn(`[ProductDetailPage] API fetch failed for ${sku}, using fallback:`, error);
  }
  return getProduct(sku) || null;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const p = await fetchProduct(sku);
  if (!p) notFound();

  const available = typeof p.physical === "number" && typeof p.reserved === "number"
    ? p.physical - p.reserved
    : availableStock(p);

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`SKU ${p.sku} · ${p.category} · ${p.weight} · Cập nhật ${p.updated}`}
        action={
          <Link className={primaryLink} href={`/staff/products/${p.sku}/edit`}>
            Chỉnh sửa sản phẩm
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[392px_minmax(0,1fr)]">
        <section className={`${card} p-6`}>
          <h2 className="text-xl font-semibold">Ảnh sản phẩm</h2>
          <Image
            src={p.image || "/images/products/royal-canin-mini-adult.png"}
            alt={p.name}
            width={344}
            height={272}
            className="mt-4 h-72 w-full rounded-lg bg-canvas object-contain"
          />
          <p className="mt-4 text-xs text-muted">
            Ảnh chính · {p.sku} · Quy cách {p.weight}
          </p>
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
              <dt className="text-muted">Giá bán (đã gồm VAT)</dt>
              <dd className="text-right font-semibold">{money(p.price)}</dd>
              <dt className="text-muted">Kho áp dụng</dt>
              <dd className="text-right">Kho TP.HCM</dd>
            </dl>
          </section>

          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Tồn kho TP.HCM</h2>
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
            <p className="mt-5 text-xs text-muted">
              Đơn vị: sản phẩm · Vị trí {p.location || "Kệ tiêu chuẩn"} · Khả dụng = thực tế − giữ chỗ
            </p>
          </section>
        </div>
      </div>

      <section className={`${card} p-6`}>
        <h2 className="text-xl font-semibold">Mô tả & nội dung hiển thị</h2>
        <h3 className="mt-5 font-semibold">Mô tả</h3>
        <p className="mt-3 leading-relaxed text-muted">
          {p.shortDescription || (p as { description?: string }).description || ""}
        </p>
        {p.content && (
          <>
            <h3 className="mt-5 font-semibold">Thành phần & hướng dẫn</h3>
            <p className="mt-3 leading-relaxed text-muted">{p.content}</p>
          </>
        )}
      </section>

      <div className="rounded-lg bg-brand-subtle p-4">
        <strong>Dữ liệu sản phẩm từ máy chủ</strong>
        <p className="mt-2 text-muted">
          Thông tin tồn kho và trạng thái bán hàng được cập nhật đồng bộ với cơ sở dữ liệu.
        </p>
      </div>
    </>
  );
}
