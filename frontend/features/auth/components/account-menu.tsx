"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import { authApi } from "../api";
import { authErrorMessage } from "../errors";

export function AccountMenu() {
  const { user, status, acceptUser, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const locked = useRef(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  function closeMenu() {
    if (detailsRef.current?.open) {
      detailsRef.current.open = false;
    }
  }

  // Tự động đóng dropdown khi chuyển trang (pathname thay đổi)
  useEffect(() => {
    if (detailsRef.current?.open) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        detailsRef.current?.open &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        detailsRef.current.open = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function logout() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setFailure("");
    try {
      await authApi.logout();
      acceptUser(null);
      closeMenu();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setFailure(authErrorMessage(error));
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  if (status === "loading") {
    return <span role="status" className="text-xs text-muted">Tài khoản…</span>;
  }

  if (status === "error") {
    return (
      <details className="relative text-sm">
        <summary className="cursor-pointer font-semibold text-muted">Tài khoản</summary>
        <div className="absolute right-0 top-full z-20 mt-3 w-64 whitespace-normal rounded-lg border border-line bg-surface p-4 shadow-lg">
          <p role="status" className="text-sm text-muted">Chưa thể kiểm tra phiên đăng nhập.</p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-brand hover:underline"
            onClick={() => { void refresh(); }}
          >
            Thử lại
          </button>
          <Link
            href="/login"
            className="ml-4 inline-flex min-h-11 items-center font-semibold text-brand hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </details>
    );
  }

  if (!user) {
    return <Link href="/login" className="font-semibold hover:text-brand">Đăng nhập</Link>;
  }

  return (
    <details ref={detailsRef} className="relative text-sm">
      <summary
        className="inline-flex max-w-44 cursor-pointer list-none items-center gap-2 truncate font-semibold hover:text-brand [&::-webkit-details-marker]:hidden sm:max-w-56"
        aria-label={`Tài khoản ${user.fullName}`}
      >
        <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
          <Image
            src={user.avatarUrl || "/images/customer-avatar.jpg"}
            alt={user.fullName}
            width={24}
            height={24}
            unoptimized
            className="h-full w-full object-cover"
          />
        </span>
        <span className="truncate">{user.fullName}</span>
      </summary>
      <div className="absolute right-0 top-full z-20 mt-3 w-64 max-w-[calc(100vw-3rem)] whitespace-normal rounded-lg border border-line bg-surface p-4 shadow-lg">
        <div className="flex items-center gap-3 border-b border-line/60 pb-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
            <Image
              src={user.avatarUrl || "/images/customer-avatar.jpg"}
              alt={user.fullName}
              width={40}
              height={40}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>

        {user.role !== "customer" ? (
          <Link
            href={`/${user.role}/dashboard`}
            prefetch={false}
            onClick={closeMenu}
            className="mt-3 flex min-h-11 items-center font-semibold text-brand hover:underline"
          >
            {user.role === "staff" ? "Dashboard nhân viên" : "Dashboard quản trị"}
          </Link>
        ) : (
          <div className="mt-3 flex flex-col border-t border-line/60 pt-2 text-xs">
            <Link
              href="/account/profile"
              onClick={closeMenu}
              className="flex min-h-9 items-center font-medium text-ink hover:text-brand"
            >
              👤 Thông tin tài khoản
            </Link>
            <Link
              href="/account/pets"
              onClick={closeMenu}
              className="flex min-h-9 items-center font-medium text-ink hover:text-brand"
            >
              🐾 Thú cưng của tôi
            </Link>
            <Link
              href="/account/addresses"
              onClick={closeMenu}
              className="flex min-h-9 items-center font-medium text-ink hover:text-brand"
            >
              📍 Sổ địa chỉ nhận hàng
            </Link>
          </div>
        )}

        <button
          type="button"
          disabled={pending}
          className="mt-3 min-h-11 text-sm font-semibold text-brand hover:underline disabled:opacity-50"
          onClick={() => { void logout(); }}
        >
          {pending ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
        {failure && <p role="alert" className="mt-2 text-xs text-danger">{failure}</p>}
      </div>
    </details>
  );
}
