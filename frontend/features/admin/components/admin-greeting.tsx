"use client";

import { useAuth } from "@/features/auth/auth-provider";

/** Vietnamese names put the given name last ("Lê Hoàng Nam" → "Nam"). */
export function AdminGreeting({ suffix }: { suffix: string }) {
  const { user } = useAuth();
  const name = user?.fullName.trim().split(/\s+/).at(-1);
  return <>{name ? `Chào ${name}, ${suffix}` : `Xin chào, ${suffix}`}</>;
}
