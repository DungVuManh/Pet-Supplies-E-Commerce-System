import { Suspense } from "react";
import { notFound } from "next/navigation";
import { UserDetailView } from "@/features/admin/components/user-detail-view";
import { getUserDetail } from "@/features/admin/mock/users";

type Params = PageProps<"/admin/users/[id]">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function UserDetail({ params }: { params: Params }) {
  const user = getUserDetail((await params).id);
  if (!user) notFound();
  return <UserDetailView user={user} />;
}

export default function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  return <Suspense fallback={<p role="status">Đang tải thông tin người dùng…</p>}><UserDetail params={params} /></Suspense>;
}
