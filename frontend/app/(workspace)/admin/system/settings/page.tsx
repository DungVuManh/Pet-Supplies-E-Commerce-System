import { redirect } from "next/navigation";

export const instant = false;

export default function AdminSettingsPage() {
  redirect("/admin/system/policies");
}
