import { Suspense } from "react";
import { UserEditForm } from "@/features/admin/components/user-edit-form";
import { getUser } from "@/features/admin/services/users.server";

type Params = PageProps<"/admin/users/[id]/edit">["params"];

async function EditUser({ params }: { params: Params }) {
  return <UserEditForm user={await getUser((await params).id)} />;
}

export default function AdminUserEditPage({ params }: PageProps<"/admin/users/[id]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditUser params={params} /></Suspense>;
}
