import { permanentRedirect } from "next/navigation";

// The master data screen was replaced by the brand page; old links and bookmarks land there.
export default function AdminMasterDataPage() {
  permanentRedirect("/admin/brands");
}
