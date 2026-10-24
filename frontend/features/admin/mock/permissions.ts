export type PermissionRole = "customer" | "staff" | "admin";
export type Permission = { id: string; label: string; roles: Record<PermissionRole, boolean> };

const grant = (customer: boolean, staff: boolean): Record<PermissionRole, boolean> => ({ customer, staff, admin: true });

/** Default access matrix from the roles design; Admin always keeps every permission. */
export const defaultPermissions: Permission[] = [
  { id: "profile", label: "Xem và sửa hồ sơ cá nhân", roles: grant(true, true) },
  { id: "own-orders", label: "Mua hàng và xem đơn của mình", roles: grant(true, true) },
  { id: "all-orders", label: "Xem tất cả đơn hàng", roles: grant(false, true) },
  { id: "process-orders", label: "Xử lý đơn và yêu cầu hủy", roles: grant(false, true) },
  { id: "catalog-stock", label: "Cập nhật sản phẩm và tồn kho", roles: grant(false, true) },
  { id: "master-data", label: "Quản lý danh mục và dữ liệu nền", roles: grant(false, false) },
  { id: "finance", label: "Xem báo cáo tài chính", roles: grant(false, false) },
  { id: "users", label: "Quản lý người dùng và phân quyền", roles: grant(false, false) },
  { id: "system", label: "Cấu hình và nhật ký hệ thống", roles: grant(false, false) },
];

export function togglePermission(permissions: Permission[], id: string, role: PermissionRole): Permission[] {
  if (role === "admin") return permissions;
  return permissions.map((item) => item.id === id ? { ...item, roles: { ...item.roles, [role]: !item.roles[role] } } : item);
}
