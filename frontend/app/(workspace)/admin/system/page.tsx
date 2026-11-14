import { redirect } from "next/navigation";

export const instant = false;

export default function AdminSystemPage() {
  redirect("/admin/system/policies");
}
