export function parseInventoryQuery(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize || query.limit, 10) || 6),
  );

  // Xử lý từ khóa tìm kiếm (nhận cả query lẫn search)
  const searchQuery =
    typeof query.query === "string"
      ? query.query.trim()
      : typeof query.search === "string"
        ? query.search.trim()
        : "";

  // Xử lý trạng thái (chuyển đổi từ giao diện sang format DB: 'all', 'available', 'low', 'out')
  let status =
    typeof query.status === "string" ? query.status.toLowerCase() : "all";
  if (status === "tất cả") status = "all";
  if (status === "đủ hàng") status = "available";
  if (status === "sắp hết") status = "low";
  if (status === "hết hàng") status = "out";

  return {
    query: searchQuery,
    status,
    page,
    pageSize,
  };
}
