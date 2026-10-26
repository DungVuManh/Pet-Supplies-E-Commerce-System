"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { AnalyticsApiError, fetchReport } from "../services/analytics.service";
import type { Reports } from "../types";

type Result<T> = { key: string; data?: T; error?: Error };
export function useStaffAnalytics<K extends keyof Reports>(kind: K) {
  const { user, status } = useAuth();
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const query = params.toString();
  const authorized = status === "ready" && user?.role === "staff";
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<Reports[K]>>({ key: "" });
  const key = `${kind}:${query}:${user?.id}:${revision}`;
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    if (!authorized) return;
    const controller = new AbortController();
    void fetchReport(kind, query, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      const reportActor = "actor" in data ? data.actor.id : "personal" in data ? data.personal.actor.id : user?.id;
      if (reportActor !== user?.id) throw new AnalyticsApiError(403, "FORBIDDEN", "Phiên đăng nhập đã thay đổi.");
      setResult({ key, data });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const failure = error instanceof Error ? error : new Error("Chưa thể tải báo cáo.");
      setResult({ key, error: failure });
      if (failure instanceof AnalyticsApiError) {
        if (failure.status === 401 || failure.code === "PROFILE_INCOMPLETE") router.replace("/login");
        if (failure.status === 403) router.replace("/forbidden");
      }
    });
    return () => controller.abort();
  }, [authorized, key, kind, query, router, user?.id]);
  useEffect(() => {
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [refresh]);
  useEffect(() => {
    if (status === "ready" && !user) router.replace("/login");
    if (status === "ready" && user && user.role !== "staff") router.replace("/forbidden");
  }, [status, user, router]);
  const current = authorized && result.key === key ? result : null;
  return { data: current?.data, error: status === "error" ? new Error("Chưa xác minh được phiên đăng nhập. Hãy tải lại trang.") : current?.error,
    loading: !current && status !== "error", refresh, user, query,
    navigate: (nextQuery: string) => router.push(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false }) };
}
