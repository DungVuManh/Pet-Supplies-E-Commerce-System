"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authApi, AuthApiError } from "./api";
import type { AuthUser } from "./types";

import { AUTH_USER_KEY, syncGuestCartToBackend } from "@/features/cart/services/cart.service";

type AuthState = { status: "loading" | "ready" | "error"; user: AuthUser | null };
type AuthContextValue = AuthState & { refresh: () => Promise<void>; acceptUser: (user: AuthUser | null) => void };
const AuthContext = createContext<AuthContextValue | null>(null);

function syncAuthStorage(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {}
}

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: AuthUser }) {
  const [state, setState] = useState<AuthState>(() => {
    if (initialUser) {
      syncAuthStorage(initialUser);
      return { status: "ready", user: initialUser };
    }
    return { status: "loading", user: null };
  });
  const revision = useRef(0);

  const acceptUser = useCallback((user: AuthUser | null) => {
    revision.current++;
    setState({ status: "ready", user });
    syncAuthStorage(user);
    if (user) {
      void syncGuestCartToBackend();
    }
  }, []);

  const refresh = useCallback(() => {
    const current = ++revision.current;
    return authApi.me().then((user) => {
      if (current === revision.current) {
        setState({ status: "ready", user });
        syncAuthStorage(user);
        if (user) {
          void syncGuestCartToBackend();
        }
      }
    }, (error: unknown) => {
      if (current !== revision.current) return;
      const guest = error instanceof AuthApiError && error.status === 401;
      setState((previous) => ({ status: guest ? "ready" : "error", user: guest ? null : previous.user }));
      if (guest) {
        syncAuthStorage(null);
      }
    });
  }, []);

  useEffect(() => {
    const counter = revision;
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { counter.current++; window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  return <AuthContext.Provider value={{ ...state, refresh, acceptUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
