import Link from "next/link";
import { ProductEditForm } from "@/features/staff/components/product-edit-form";
import { PageHeader, secondaryButton } from "@/features/staff/components/staff-ui";
import { getStaffProduct } from "@/features/staff/products/server";

export default async function EditProductPage({ params }: PageProps<"/staff/products/[sku]/edit">) {
  const { sku } = await params;
  const product = await getStaffProduct(sku);
  return <>
    <PageHeader title="Chỉnh sửa sản phẩm" subtitle={`${product.name} · ${product.sku}`}
      action={<Link href={`/staff/products/${encodeURIComponent(sku)}`} className={secondaryButton}>Xem chi tiết</Link>} />
    <ProductEditForm key={product.sku} product={product} />
  </>;
}
