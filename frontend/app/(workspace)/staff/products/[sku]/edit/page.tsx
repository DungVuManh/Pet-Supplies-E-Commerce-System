import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/features/staff/components/product-edit-form";
import { PageHeader, secondaryButton } from "@/features/staff/components/staff-ui";
import { getProduct } from "@/features/staff/mock-data";
export default async function EditProductPage({ params }: PageProps<"/staff/products/[sku]/edit">) { const { sku } = await params; const product = getProduct(sku); if (!product) notFound(); return <><PageHeader title="Chỉnh sửa sản phẩm" subtitle={`${product.name} · ${product.sku} · Trần Hoàng Nam`} action={<Link href={`/staff/products/${sku}`} className={secondaryButton}>Xem chi tiết</Link>} /><ProductEditForm product={product} /></>; }
