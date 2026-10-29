"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, XCircle } from "lucide-react";
import { AdminPageHeader, StatusBadge, Stack, Td, Th } from "./admin-ui";
import {
  ActionLink,
  Badge,
  ListState,
  listStatePill,
  Pagination,
  TabNav,
  card,
  control,
} from "@/components/workspace/workspace-ui";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { useListState } from "@/components/workspace/use-list-state";

type InventoryTab = "all" | "low" | "history";

interface InventoryItem {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  available: number;
  threshold?: number;
  unit?: string;
  status?: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function InventoryView() {
  const router = useRouter();
  const forcedState = useListState();

  const [activeTab, setActiveTab] = useState<InventoryTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // State phân trang (mỗi trang 6 sản phẩm)
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 6,
    total: 0,
    totalPages: 0,
  });

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gọi API thực tế từ Backend
  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("query", search);

      let apiStatus = "all";
      if (statusFilter === "Đủ hàng") apiStatus = "available";
      if (statusFilter === "Sắp hết" || activeTab === "low") apiStatus = "low";
      if (statusFilter === "Hết hàng") apiStatus = "out";

      if (apiStatus !== "all") {
        queryParams.set("status", apiStatus);
      }

      queryParams.set("page", page.toString());
      queryParams.set("pageSize", pageSize.toString());

      const res = await fetch(
        `/api/v1/admin/inventory?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Không thể tải dữ liệu từ máy chủ");
      }

      const json = await res.json();
      setItems(json.data?.items || []);
      if (json.data?.pagination) {
        setPagination(json.data.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, activeTab, page, pageSize, router]);

  // Debounce gọi API khi nhập từ khóa tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventoryData();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchInventoryData]);

  // Đổi bộ lọc luôn quay về trang 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Chọn Tab
  const handleTabSelect = (tab: InventoryTab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === "low") {
      setStatusFilter("Sắp hết");
    } else if (statusFilter === "Sắp hết" && tab === "all") {
      setStatusFilter("Tất cả");
    }
  };

  // Chọn Dropdown trạng thái
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
    if (val === "Sắp hết" && activeTab !== "history") {
      setActiveTab("low");
    } else if (val === "Tất cả" && activeTab === "low") {
      setActiveTab("all");
    }
  };

  // Reset bộ lọc
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("Tất cả");
    setActiveTab("all");
    setPage(1);
  };

  // Helper hiển thị nhãn cảnh báo dựa trên status do Backend tính
  const getStockWarningStatus = (item: InventoryItem) => {
    if (item.status === "out" || (item.available ?? 0) <= 0) return "Hết hàng";
    if (item.status === "low") return "Sắp hết";
    if (item.status === "available") return "Đủ hàng";

    const available = item.available ?? 0;
    const threshold = item.threshold ?? 20;
    if (available <= threshold) return "Sắp hết";
    return "Đủ hàng";
  };

  const isCurrentLoading = forcedState === "loading" || loading;
  const isCurrentError = forcedState === "error" || !!error;
  const isEmpty =
    forcedState === "empty" || (!isCurrentLoading && items.length === 0);

  const tabs = [
    {
      label: "Tất cả sản phẩm",
      active: activeTab === "all",
      onSelect: () => handleTabSelect("all"),
    },
    {
      label: "Sắp hết hàng",
      active: activeTab === "low",
      onSelect: () => handleTabSelect("low"),
    },
    {
      label: "Lịch sử nhập xuất",
      active: activeTab === "history",
      onSelect: () => handleTabSelect("history"),
    },
  ];

  const exportAction = isCurrentLoading ? (
    <button
      type="button"
      disabled
      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white opacity-40"
    >
      + Tạo phiếu nhập
    </button>
  ) : (
    <DemoNotice
      label="+ Tạo phiếu nhập"
      variant="primary"
      message="Chức năng tạo phiếu nhập kho chưa kết nối backend."
    />
  );

  const fromIndex = pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, pagination.total);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Kho hàng", "Danh sách tồn kho"]}
        title="Danh sách tồn kho"
        subtitle="Kho TP. Hồ Chí Minh · Quản lý số lượng và ngưỡng cảnh báo."
        actions={exportAction}
      />

      <TabNav items={tabs} label="Chế độ xem kho hàng" />

      {/* Main card */}
      <section className={`${card} min-w-0 overflow-hidden`}>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-6">
          <h2 className="text-xl font-semibold">Quản lý tồn kho</h2>
          <div>
            {forcedState ? (
              <Badge tone={listStatePill[forcedState].tone}>
                {listStatePill[forcedState].label}
              </Badge>
            ) : isEmpty ? (
              <Badge tone="neutral">Rỗng</Badge>
            ) : null}
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid gap-4 border-b border-line p-6 sm:grid-cols-2 lg:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inventory-search" className="font-medium">
              Tìm kiếm
            </label>
            <input
              id="inventory-search"
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm (SKU, Tên sản phẩm...)"
              disabled={isCurrentLoading}
              className={control}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="inventory-status" className="font-medium">
              Trạng thái
            </label>
            <select
              id="inventory-status"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isCurrentLoading}
              className={control}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Đủ hàng">Đủ hàng</option>
              <option value="Sắp hết">Sắp hết</option>
              <option value="Hết hàng">Hết hàng</option>
            </select>
          </div>
        </div>

        {/* Card Body */}
        {isCurrentLoading ? (
          <>
            <div className="p-6">
              <ListState
                kind="loading"
                title="Đang tải dữ liệu tồn kho..."
                columns={5}
                rows={4}
              />
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              Đang đồng bộ từ máy chủ · Vui lòng chờ trong giây lát
            </div>
          </>
        ) : isCurrentError ? (
          <>
            <div className="p-6">
              <ListState
                kind="error"
                icon={<XCircle className="h-12 w-12 text-danger stroke-1" />}
                title="Không thể tải dữ liệu tồn kho"
                description={
                  error || "Kết nối đến hệ thống bị gián đoạn. Thử lại sau."
                }
                action={
                  <button
                    type="button"
                    onClick={fetchInventoryData}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover"
                  >
                    Thử lại
                  </button>
                }
              />
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              Chưa có dữ liệu mới · Không thay đổi trạng thái đơn hoặc tồn kho
            </div>
          </>
        ) : isEmpty ? (
          <>
            <div className="p-6">
              <ListState
                kind="empty"
                icon={<Package className="h-12 w-12 text-muted stroke-1" />}
                title="Không tìm thấy sản phẩm"
                description={
                  search
                    ? `Không có sản phẩm khớp từ khóa "${search}". Xóa bộ lọc để xem toàn bộ.`
                    : "Không có sản phẩm nào khớp với điều kiện lọc."
                }
                action={
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover"
                  >
                    Xóa bộ lọc
                  </button>
                }
              />
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              0 kết quả · Bộ lọc hiện tại được giữ nguyên
            </div>
          </>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  Danh sách tồn kho sản phẩm
                </caption>
                <thead className="bg-canvas text-xs uppercase text-muted">
                  <tr>
                    <Th className="w-44">SKU / Ngưỡng</Th>
                    <Th>Sản phẩm</Th>
                    <Th className="w-36">Khả dụng</Th>
                    <Th className="w-36">Cảnh báo</Th>
                    <Th className="w-32">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const threshold = item.threshold ?? 20;
                    const available = item.available ?? 0;

                    const isLowStock = item.status === "low";
                    const isOutOfStock =
                      item.status === "out" || available <= 0;

                    return (
                      <tr key={item.sku} className="hover:bg-canvas/50">
                        <Td>
                          <Link
                            href={`/admin/products/${item.sku}`}
                            className="font-semibold text-brand hover:underline"
                          >
                            {item.sku}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            Tối thiểu: {threshold}
                          </p>
                        </Td>

                        <Td>
                          <Stack
                            primary={item.name}
                            secondary={`${item.category || "---"} · ${item.brand || "---"}`}
                          />
                        </Td>

                        <Td className="font-semibold tabular-nums">
                          <span
                            className={
                              isOutOfStock
                                ? "text-danger"
                                : isLowStock
                                  ? "text-warning"
                                  : "text-ink"
                            }
                          >
                            {Math.max(0, available)} {item.unit || "cái"}
                          </span>
                        </Td>

                        <Td>
                          <StatusBadge status={getStockWarningStatus(item)} />
                        </Td>

                        <Td>
                          <ActionLink href={`/admin/products/${item.sku}`}>
                            Chi tiết
                          </ActionLink>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              from={fromIndex}
              to={toIndex}
              total={pagination.total}
              page={page}
              pages={pagination.totalPages}
              onPage={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </section>

      <footer className="text-xs text-muted">
        {isCurrentLoading
          ? "Đang đối chiếu dữ liệu nhập – xuất – tồn. Vui lòng không đóng trang."
          : isCurrentError
            ? "Không có thay đổi số lượng tồn kho. Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra."
            : isEmpty
              ? "Không có kết quả cho bộ lọc hiện tại. Dữ liệu tồn kho vẫn được giữ nguyên."
              : "Kho TP. Hồ Chí Minh · Cập nhật theo thời gian thực mỗi khi có đơn xuất hoặc phiếu nhập."}
      </footer>
    </div>
  );
}
