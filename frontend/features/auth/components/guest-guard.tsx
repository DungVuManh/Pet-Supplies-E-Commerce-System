"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import { AUTH_USER_KEY } from "@/features/cart/services/cart.service";

function getStoredAuthUser(): boolean {
 if (typeof window === "undefined") return false;
 try {
  return Boolean(localStorage.getItem(AUTH_USER_KEY));
 } catch {
  return false;
 }
}

function subscribeToStorage(callback: () => void) {
 if (typeof window === "undefined") return () => {};
 window.addEventListener("storage", callback);
 return () => window.removeEventListener("storage", callback);
}

export function GuestGuard({ children }: { children: ReactNode }) {
 const router = useRouter();
 const { user, status, refresh } = useAuth();
 const hasStoredUser = useSyncExternalStore(
  subscribeToStorage,
  getStoredAuthUser,
  () => false,
 );

 const isAuthenticated =
  Boolean(user) || (status === "loading" && hasStoredUser);

 useEffect(() => {
  const handlePopState = () => {
   void refresh();
  };
  const handlePageShow = (event: PageTransitionEvent) => {
   if (event.persisted) {
    void refresh();
   }
  };

  window.addEventListener("popstate", handlePopState);
  window.addEventListener("pageshow", handlePageShow);
  return () => {
   window.removeEventListener("popstate", handlePopState);
   window.removeEventListener("pageshow", handlePageShow);
  };
 }, [refresh]);

 useEffect(() => {
  if (status === "ready" && user) {
   let safeRedirect: string | null = null;
   if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect") || params.get("next");
    if (
     redirectParam &&
     redirectParam.startsWith("/") &&
     !redirectParam.startsWith("//")
    ) {
     safeRedirect = redirectParam;
    }
   }

   let target = "/";
   if (user.role === "admin" && safeRedirect && safeRedirect.startsWith("/admin")) {
    target = safeRedirect;
   } else if (user.role === "staff" && safeRedirect && safeRedirect.startsWith("/staff")) {
    target = safeRedirect;
   } else if (
    user.role === "customer" &&
    safeRedirect &&
    !safeRedirect.startsWith("/admin") &&
    !safeRedirect.startsWith("/staff")
   ) {
    target = safeRedirect;
   }

   router.replace(target);
  }
 }, [status, user, router]);

 if (isAuthenticated) {
  return null;
 }

 return <>{children}</>;
}
