"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import { authApi } from "../api";
import { authErrorMessage } from "../errors";

export function AccountMenu() {
  const { user, status, acceptUser, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const locked = useRef(false);
  const router = useRouter();

  async function logout() {
    if (locked.current) return;
    locked.current = true; setPending(true); setFailure("");
    try { await authApi.logout(); acceptUser(null); router.replace("/"); router.refresh(); }
    catch (error) { setFailure(authErrorMessage(error)); }
    finally { locked.current = false; setPending(false); }
  }

  if (status === "loading") return <span role="status" className="text-xs text-muted">Tài khoản…</span>;
  if (status === "error") return <details className="relative text-sm">
    <summary className="cursor-pointer font-semibold text-muted">Tài khoản</summary>
    <div className="absolute right-0 top-full z-20 mt-3 w-64 whitespace-normal rounded-lg border border-line bg-surface p-4 shadow-lg">
      <p role="status" className="text-sm text-muted">Chưa thể kiểm tra phiên đăng nhập.</p>
      <button type="button" className="mt-2 min-h-11 font-semibold text-brand hover:underline" onClick={() => { void refresh(); }}>Thử lại</button>
      <Link href="/login" className="ml-4 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Đăng nhập</Link>
    </div>
  </details>;
  if (!user) return <Link href="/login" className="font-semibold hover:text-brand">Đăng nhập</Link>;
  return <details className="relative text-sm">
    <summary className="max-w-28 cursor-pointer list-none truncate font-semibold hover:text-brand [&::-webkit-details-marker]:hidden sm:max-w-40" aria-label={`Tài khoản ${user.fullName}`}>{user.fullName}</summary>
    <div className="absolute right-0 top-full z-20 mt-3 w-64 max-w-[calc(100vw-3rem)] whitespace-normal rounded-lg border border-line bg-surface p-4 shadow-lg">
      <p className="break-words font-semibold">{user.fullName}</p>
      <p className="mt-1 break-all text-xs text-muted">{user.email}</p>
      {user.role !== "customer" && <Link href={`/${user.role}/dashboard`} prefetch={false}
        className="mt-3 flex min-h-11 items-center font-semibold text-brand hover:underline">
        {user.role === "staff" ? "Dashboard nhân viên" : "Dashboard quản trị"}
      </Link>}
      <Link
        href="/orders"
        className="mt-3 flex min-h-11 items-center font-semibold  hover:underline"
      >
        Đơn hàng
      </Link>
      <button type="button" disabled={pending} className="mt-3 min-h-11 text-sm font-semibold text-brand hover:underline disabled:opacity-50" onClick={() => { void logout(); }}>{pending ? "Đang đăng xuất…" : "Đăng xuất"}</button>
      {failure && <p role="alert" className="mt-2 text-xs text-danger">{failure}</p>}
    </div>

  </details>;
}
