import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { fetchStaffProduct, StaffProductsApiError } from "./api";

export async function getStaffProduct(sku: string) {
  const name = process.env.NODE_ENV === "production" ? "__Host-petly-session" : "petly-session";
  const session = (await cookies()).get(name);
  if (!session) redirect("/login");
  try {
    return await fetchStaffProduct(process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001",
      `${name}=${encodeURIComponent(session.value)}`, sku);
  } catch (error) {
    if (error instanceof StaffProductsApiError) {
      if (error.status === 404 || error.status === 400) notFound();
      if (error.status === 401) redirect("/login");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  }
}
