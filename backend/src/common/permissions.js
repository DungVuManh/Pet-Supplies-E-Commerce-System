const grant = (customer, staff, admin) => ({ customer, staff, admin });

/**
 * The access matrix shown on the Admin roles screen. Authorization itself stays
 * in the routers (`requireAuth`, `requireRole`); this table describes it, and
 * `tests/admin-permissions.test.js` fails if the Staff rows stop agreeing with
 * the routes. `staffRoutes` lists every `/staff/*` route a row grants.
 * Roles do not inherit each other: `/orders/my-orders` is Customer only.
 */
export const PERMISSIONS = [
 { id: "profile", label: "Xem và sửa hồ sơ cá nhân", roles: grant(true, true, true) },
 { id: "own-orders", label: "Mua hàng và xem đơn của mình", roles: grant(true, false, false) },
 {
  id: "all-orders", label: "Xem tất cả đơn hàng", roles: grant(false, true, true),
  staffRoutes: [
   "GET /staff/dashboard", "GET /staff/analytics/sales", "GET /staff/analytics/performance", "GET /staff/analytics/overview",
   "GET /staff/orders", "GET /staff/orders/:id", "GET /staff/orders/creation/:requestId",
  ],
 },
 {
  id: "process-orders", label: "Xử lý đơn và yêu cầu hủy", roles: grant(false, true, true),
  staffRoutes: ["POST /staff/orders", "PATCH /staff/orders/:id/status", "GET /staff/order-customers", "GET /staff/order-products"],
 },
 {
  id: "catalog-stock", label: "Cập nhật sản phẩm và tồn kho", roles: grant(false, true, true),
  staffRoutes: ["GET /staff/products", "GET /staff/products/:sku", "PATCH /staff/products/:sku"],
 },
 { id: "master-data", label: "Quản lý danh mục và dữ liệu nền", roles: grant(false, false, true) },
 { id: "finance", label: "Xem báo cáo tài chính", roles: grant(false, false, true) },
 { id: "users", label: "Quản lý người dùng và phân quyền", roles: grant(false, false, true) },
 { id: "system", label: "Cấu hình và nhật ký hệ thống", roles: grant(false, false, true) },
];
