// =============================================================
// features/orders/hooks/use-orders-page.ts
// Hook xử lý logic cho trang "Đơn hàng của tôi"
// - Gọi API lấy danh sách đơn hàng từ backend (useEffect)
// - Lọc theo tab trạng thái và từ khóa tìm kiếm
// - Phân trang 10 đơn hàng / trang
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { getMyOrdersApi } from "../services/order.service";
import type { CustomerOrder, CustomerOrderStatus } from "../types";

export const ORDERS_PAGE_SIZE = 10;

export function useOrdersPage() {
  // Danh sách đơn hàng thực từ API
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái tab đang chọn và từ khóa tìm kiếm
  const [activeStatus, setActiveStatus] = useState<CustomerOrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = ORDERS_PAGE_SIZE;

  // Tự động chuyển về trang 1 khi đổi tab hoặc đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, searchQuery]);

  // Gọi API khi vào trang lần đầu
  useEffect(() => {
    async function loadOrders() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await getMyOrdersApi();
        // res.data.orders là mảng đơn hàng trả về từ backend
        setOrders(res.data?.orders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải đơn hàng.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, []); // [] = chỉ chạy 1 lần khi component mount

  // Đếm số đơn theo từng trạng thái để hiển thị trên tab
  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      shipping: orders.filter((o) => o.status === "shipping").length,
      completed: orders.filter((o) => o.status === "completed").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      returned: orders.filter((o) => o.status === "returned").length,
    };
  }, [orders]);

  // Lọc đơn hàng theo tab + từ khóa tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lọc theo tab trạng thái
      const matchStatus = activeStatus === "all" || order.status === activeStatus;

      // Lọc theo từ khóa (mã đơn hoặc tên sản phẩm)
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        order.orderCode.toLowerCase().includes(query) ||
        order.productsSummary.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [orders, activeStatus, searchQuery]);

  // Tổng số đơn sau lọc & tổng số trang
  const totalFilteredOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / pageSize));

  // Đảm bảo currentPage không vượt quá totalPages nếu danh sách bị thu hẹp
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Cắt danh sách đơn hàng hiển thị theo trang
  const paginatedOrders = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, safeCurrentPage, pageSize]);

  const goToPage = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
  };

  return {
    isLoading,
    error,
    orders: paginatedOrders,
    filteredOrders,
    paginatedOrders,
    counts,
    activeStatus,
    setActiveStatus,
    searchQuery,
    setSearchQuery,
    totalOrders: orders.length,
    totalFilteredOrders,
    currentPage: safeCurrentPage,
    totalPages,
    pageSize,
    goToPage,
  };
}
