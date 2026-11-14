import { Suspense } from "react";
import { BrandForm } from "@/features/admin/components/brand-form";
import { getBrand } from "@/features/admin/services/brands.server";

type Params = PageProps<"/admin/brands/[code]/edit">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function EditBrand({ params }: { params: Params }) {
  return <BrandForm brand={await getBrand((await params).code)} />;
}

export default function AdminBrandEditPage({ params }: PageProps<"/admin/brands/[code]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditBrand params={params} /></Suspense>;
}
