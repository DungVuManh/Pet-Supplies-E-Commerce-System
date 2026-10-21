"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authApi, AuthApiError } from "./api";
import type { AuthUser } from "./types";

type AuthState = { status: "loading" | "ready" | "error"; user: AuthUser | null };
type AuthContextValue = AuthState & { refresh: () => Promise<void>; acceptUser: (user: AuthUser | null) => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: AuthUser }) {
  const [state, setState] = useState<AuthState>({ status: initialUser ? "ready" : "loading", user: initialUser ?? null });
  const revision = useRef(0);

  const acceptUser = useCallback((user: AuthUser | null) => {
    revision.current++;
    setState({ status: "ready", user });
  }, []);

  const refresh = useCallback(() => {
    const current = ++revision.current;
    return authApi.me().then((user) => {
      if (current === revision.current) setState({ status: "ready", user });
    }, (error: unknown) => {
      if (current !== revision.current) return;
      const guest = error instanceof AuthApiError && error.status === 401;
      setState((previous) => ({ status: guest ? "ready" : "error", user: guest ? null : previous.user }));
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
