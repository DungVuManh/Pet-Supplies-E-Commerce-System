import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryEditForm } from "@/features/admin/components/category-edit-form";
import { getCategory } from "@/features/admin/mock/categories";
import { categoryDeleteBlocker, categoryProductCount } from "@/features/admin/mock/products";

type Params = PageProps<"/admin/categories/[code]/edit">["params"];

// URL params are read below a Suspense boundary so navigating from the tree stays instant.
async function EditCategory({ params }: { params: Params }) {
  const { code } = await params;
  const category = getCategory(code);
  if (!category) notFound();
  return <CategoryEditForm category={category} linkedProducts={categoryProductCount(code)} blocker={categoryDeleteBlocker(code)} />;
}

export default function AdminCategoryEditPage({ params }: PageProps<"/admin/categories/[code]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditCategory params={params} /></Suspense>;
}
