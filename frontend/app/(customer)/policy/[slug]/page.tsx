// =============================================================
// app/(customer)/chinh-sach/[slug]/page.tsx
// Trang hiển thị chi tiết Chính sách theo slug
// =============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllPolicies,
  getMenuPolicies,
  getPolicyBySlug,
  PolicyView,
} from "@/features/policy";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);

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

export async function generateStaticParams() {
  const policies = getAllPolicies();
  return policies.map((p) => ({
    slug: p.slug,
  }));
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const currentPolicy = getPolicyBySlug(slug);

  // Nếu slug không tồn tại trong hệ thống
  if (!currentPolicy) {
    notFound();
  }

  const menuPolicies = getMenuPolicies();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-8 outline-none sm:px-6 xl:px-16"
    >
      <PolicyView
        menuPolicies={menuPolicies}
        currentPolicy={currentPolicy}
        activeSlug={slug}
      />
    </main>
  );
}

