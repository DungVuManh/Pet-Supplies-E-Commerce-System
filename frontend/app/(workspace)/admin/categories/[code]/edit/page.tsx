import { Suspense } from "react";
import { CategoryEditForm } from "@/features/admin/components/category-edit-form";
import { getCategory } from "@/features/admin/services/categories.server";

type Params = PageProps<"/admin/categories/[code]/edit">["params"];

// URL params are read below a Suspense boundary so navigating from the tree stays instant.
async function EditCategory({ params }: { params: Params }) {
  return <CategoryEditForm category={await getCategory((await params).code)} />;
}

export default function AdminCategoryEditPage({ params }: PageProps<"/admin/categories/[code]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditCategory params={params} /></Suspense>;
}
