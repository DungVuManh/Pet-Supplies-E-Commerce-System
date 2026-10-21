import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthApiError, fetchDashboardUser } from "./api";
import type { Role } from "./types";

export async function requireDashboardUser(role: Exclude<Role, "customer">) {
  const name = process.env.NODE_ENV === "production" ? "__Host-petly-session" : "petly-session";
  const session = (await cookies()).get(name);
  if (!session) redirect("/login");
  try {
    return await fetchDashboardUser(process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001",
      `${name}=${encodeURIComponent(session.value)}`, role);
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403) redirect("/forbidden");
      if (error.code === "PROFILE_INCOMPLETE") redirect("/login");
    }
    throw error;
  }
}
