"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function StorefrontSearch() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  return <StorefrontSearchForm key={query} query={query} />;
}

export function StorefrontSearchForm({ query = "" }: { query?: string }) {
  const router = useRouter();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    router.push(`/${value ? `?${params}` : ""}#featured-products`);
  }

  return (
    <form action="/" method="get" onSubmit={search} role="search" aria-label="Tìm kiếm sản phẩm" className="order-last flex h-12 w-full items-center gap-4 rounded-lg border border-line bg-canvas px-4 md:order-none md:min-w-0 md:flex-1">
      <button type="submit" aria-label="Tìm kiếm" className="flex h-10 w-6 shrink-0 items-center justify-center rounded">
        <Image src="/icons/search.svg" width={20} height={20} alt="" />
      </button>
      <input type="search" name="q" defaultValue={query} maxLength={100} aria-label="Tìm kiếm sản phẩm" placeholder="Tìm thức ăn, đồ chơi, phụ kiện cho thú cưng..." className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted" />
    </form>
  );
}
