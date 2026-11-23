export type AccountTabKey =
  | "profile"
  | "addresses"
  | "pets"
  | "orders"
  | "wishlist"
  | "vouchers"
  | "reviews";

export interface AccountNavItem {
  id: AccountTabKey | "notifications";
  label: string;
  breadcrumbLabel: string;
  href: string;
  matchPrefixes?: string[];
}

export const ACCOUNT_TAB_LABELS: Record<AccountTabKey, string> = {
  profile: "Thông tin cá nhân",
  addresses: "Sổ địa chỉ",
  pets: "Thú cưng của tôi",
  orders: "Đơn hàng của tôi",
  wishlist: "Sản phẩm yêu thích",
  vouchers: "Ví voucher",
  reviews: "Đánh giá của tôi",
};

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  {
    id: "profile",
    label: "Thông tin cá nhân",
    breadcrumbLabel: "Thông tin cá nhân",
    href: "/account/profile",
    matchPrefixes: ["/account", "/account/profile"],
  },
  {
    id: "orders",
    label: "Đơn hàng",
    breadcrumbLabel: "Đơn hàng của tôi",
    href: "/orders",
    matchPrefixes: ["/orders"],
  },
  {
    id: "vouchers",
    label: "Ví voucher",
    breadcrumbLabel: "Ví voucher",
    href: "/account/vouchers",
    matchPrefixes: ["/account/vouchers"],
  },
  {
    id: "reviews",
    label: "Đánh giá",
    breadcrumbLabel: "Đánh giá của tôi",
    href: "/reviews",
    matchPrefixes: ["/reviews"],
  },
  {
    id: "wishlist",
    label: "Sản phẩm yêu thích",
    breadcrumbLabel: "Sản phẩm yêu thích",
    href: "/account/wishlist",
    matchPrefixes: ["/wishlist", "/account/wishlist"],
  },
  {
    id: "addresses",
    label: "Sổ địa chỉ",
    breadcrumbLabel: "Sổ địa chỉ",
    href: "/account/addresses",
    matchPrefixes: ["/account/addresses"],
  },
  {
    id: "pets",
    label: "Thú cưng của tôi",
    breadcrumbLabel: "Thú cưng của tôi",
    href: "/account/pets",
    matchPrefixes: ["/account/pets"],
  },
  {
    id: "notifications",
    label: "Thông báo",
    breadcrumbLabel: "Thông báo",
    href: "#",
  },
];

export function isNavItemActive(
  item: AccountNavItem,
  pathname: string | null,
): boolean {
  if (!pathname || item.href === "#") return false;
  if (item.href === "/account/profile" && pathname === "/account") return true;
  if (item.href === "/account/wishlist" && pathname === "/wishlist") return true;
  if (pathname === item.href) return true;
  if (item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return item.href !== "/" && pathname.startsWith(item.href);
}

