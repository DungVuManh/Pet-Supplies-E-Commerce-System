import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ReturnDecisionPanel } from "@/features/staff/components/return-decision-panel";
import {
  fetchStaffReturnDetailServer,
  StaffReturnApiError,
} from "@/features/staff/returns/api";

export const metadata = {
  title: "Chi tiết yêu cầu hoàn trả | Staff Petjoy",
  description: "Xem chi tiết và xử lý phê duyệt hoặc từ chối yêu cầu hoàn trả đơn hàng.",
};

async function StaffReturnDetailContent({ id }: { id: string }) {
  const sessionName =
    process.env.NODE_ENV === "production"
      ? "__Host-petly-session"
      : "petly-session";
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionName);

  if (!session) {
    redirect("/login");
  }

  const origin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
  let detail;

  try {
    detail = await fetchStaffReturnDetailServer(
      origin,
      `${sessionName}=${encodeURIComponent(session.value)}`,
      id
    );
  } catch (error) {
    if (error instanceof StaffReturnApiError) {
      if (error.status === 404 || error.status === 400) {
        notFound();
      }
      if (error.status === 401) {
        redirect("/login");
      }
      if (error.status === 403) {
        redirect("/forbidden");
      }
    }
    throw error;
  }

  return <ReturnDecisionPanel detail={detail} />;
}

export default async function StaffReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-ink-muted">
          Đang tải chi tiết yêu cầu hoàn trả…
        </div>
      }
    >
      <StaffReturnDetailContent id={id} />
    </Suspense>
  );
}

