

import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getAllPolicies,
  getMenuPolicies,
  getPolicyBySlug,
  PolicyView,
} from "@/features/policy";

// Cho phép route hoạt động trơn tru với Partial Prerendering / Instant Navigation trong Next.js 16
export const instant = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = await getPolicyBySlug(slug);

  if (!policy) {
    return {
      title: "Chính sách | Petjoy",
    };
  }

  return {
    title: `${policy.title} | Petjoy`,
    description: policy.intro || `Thông tin chi tiết về ${policy.title} tại Petjoy.`,
  };
}


async function PolicyDetailContent({ params }: PageProps) {
  const { slug } = await params;
  const currentPolicy = await getPolicyBySlug(slug);

  // Nếu slug không tồn tại trong hệ thống
  if (!currentPolicy) {
    notFound();
  }

  const menuPolicies = await getMenuPolicies();

  return (
    <PolicyView
      menuPolicies={menuPolicies}
      currentPolicy={currentPolicy}
      activeSlug={slug}
    />
  );
}

export default function PolicyDetailPage({ params }: PageProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-8 outline-none sm:px-6 xl:px-16"
    >
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Đang tải nội dung chính sách...</div>}>
        <PolicyDetailContent params={params} />
      </Suspense>
    </main>
  );
}
