import { Suspense } from "react";
import { notFound } from "next/navigation";
import { UserEditForm } from "@/features/admin/components/user-edit-form";
import { getUserDetail } from "@/features/admin/mock/users";

type Params = PageProps<"/admin/users/[id]/edit">["params"];

async function EditUser({ params }: { params: Params }) {
  const user = getUserDetail((await params).id);
  if (!user) notFound();
  return <UserEditForm user={user} />;
}

export default function AdminUserEditPage({ params }: PageProps<"/admin/users/[id]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditUser params={params} /></Suspense>;
}
