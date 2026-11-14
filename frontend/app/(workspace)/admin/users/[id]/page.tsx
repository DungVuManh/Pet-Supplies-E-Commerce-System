import { Suspense } from "react";
import { UserDetailView } from "@/features/admin/components/user-detail-view";
import { getUser } from "@/features/admin/services/users.server";

type Params = PageProps<"/admin/users/[id]">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function UserDetail({ params }: { params: Params }) {
  return <UserDetailView user={await getUser((await params).id)} />;
}

export default function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  return <Suspense fallback={<p role="status">Đang tải thông tin người dùng…</p>}><UserDetail params={params} /></Suspense>;
}
