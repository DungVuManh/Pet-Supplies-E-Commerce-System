"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, XCircle } from "lucide-react";
import { AdminPageHeader, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { ActionLink, Badge, ListState, listStatePill, Pagination, TabNav, card, control } from "@/features/workspace/components/workspace-ui";
import { DemoNotice } from "@/features/workspace/components/demo-notice";
import { useListState } from "@/features/workspace/components/use-list-state";
import {
  filterStockHistory,
  filterStockLevels,
  getStockWarning,
  isLowStock,
  stockHistory,
  stockLevels,
} from "../mock/inventory";


type InventoryTab = "all" | "low" | "history";

export function InventoryView() {
  const router = useRouter();
  const forcedState = useListState();

  const [activeTab, setActiveTab] = useState<InventoryTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Tab change
  const handleTabSelect = (tab: InventoryTab) => {
    setActiveTab(tab);
    if (tab === "low") {
      setStatusFilter("Sắp hết");
    } else if (statusFilter === "Sắp hết" && tab === "all") {
      setStatusFilter("Tất cả");
    }
  };

  // Status dropdown change
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    if (val === "Sắp hết" && activeTab !== "history") {
      setActiveTab("low");
    } else if (val === "Tất cả" && activeTab === "low") {
      setActiveTab("all");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("Tất cả");
    setActiveTab("all");
  };

  // Filtered stock list
  const filteredStock = useMemo(() => {
    return filterStockLevels(stockLevels, {
      search,
      status: statusFilter,
      lowStockOnly: activeTab === "low",
    });
  }, [search, statusFilter, activeTab]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return filterStockHistory(stockHistory, search);
  }, [search]);

  const isEmpty = forcedState === "empty" || (activeTab === "history" ? filteredHistory.length === 0 : filteredStock.length === 0);

  const tabs = [
    { label: "Tất cả sản phẩm", active: activeTab === "all", onSelect: () => handleTabSelect("all") },
    { label: "Sắp hết hàng", active: activeTab === "low", onSelect: () => handleTabSelect("low") },
    { label: "Lịch sử nhập xuất", active: activeTab === "history", onSelect: () => handleTabSelect("history") },
  ];

  const exportAction = forcedState === "loading" ? (
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
              <Badge tone={listStatePill[forcedState].tone}>{listStatePill[forcedState].label}</Badge>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm"
              disabled={forcedState === "loading"}
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
              disabled={forcedState === "loading"}
              className={control}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Đủ hàng">Đủ hàng</option>
              <option value="Sắp hết">Sắp hết</option>
              <option value="Hết hàng">Hết hàng</option>
            </select>
          </div>
        </div>

        {/* Card Body depending on forcedState / real data */}
        {forcedState === "loading" ? (
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
              Đang đồng bộ · Vui lòng chờ trong giây lát
            </div>
          </>
        ) : forcedState === "error" ? (
          <>
            <div className="p-6">
              <ListState
                kind="error"
                icon={<XCircle className="h-12 w-12 text-danger stroke-1" />}
                title="Không thể tải dữ liệu tồn kho"
                description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử lại."
                action={
                  <button
                    type="button"
                    onClick={() => router.push("/admin/inventory")}
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
                    ? `Không có sản phẩm khớp SKU "${search}" tại kho TP. Hồ Chí Minh. Xóa bộ lọc để xem toàn bộ tồn kho.`
                    : "Không có sản phẩm nào khớp với điều kiện lọc tại kho TP. Hồ Chí Minh. Xóa bộ lọc để xem toàn bộ tồn kho."
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
        ) : activeTab === "history" ? (
          <>
            {/* History Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">Lịch sử nhập xuất kho hàng</caption>
                <thead className="bg-canvas text-xs uppercase text-muted">
                  <tr>
                    <Th className="w-48">Mã phiếu / Thời gian</Th>
                    <Th>Sản phẩm</Th>
                    <Th className="w-36">Loại phiếu</Th>
                    <Th className="w-32">Số lượng</Th>
                    <Th>Ghi chú / Người thực hiện</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-canvas/50">
                      <Td>
                        <Stack primary={entry.id} secondary={entry.date} strong />
                      </Td>
                      <Td>
                        <Stack primary={entry.productName} secondary={`SKU: ${entry.sku}`} />
                      </Td>
                      <Td>
                        <Badge tone={entry.type === "Nhập kho" ? "info" : "warning"}>
                          {entry.type}
                        </Badge>
                      </Td>
                      <Td className="font-semibold tabular-nums">
                        <span className={entry.quantity > 0 ? "text-success" : "text-ink"}>
                          {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                        </span>
                      </Td>
                      <Td>
                        <Stack primary={entry.note} secondary={entry.performer} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              from={1}
              to={filteredHistory.length}
              total={filteredHistory.length}
            />
          </>
        ) : (
          <>
            {/* Populated Stock Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">Danh sách tồn kho sản phẩm</caption>
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
                  {filteredStock.map((item) => (
                    <tr key={item.sku} className="hover:bg-canvas/50">
                      <Td>
                        <Link
                          href={`/admin/products/${item.sku}`}
                          className="font-semibold text-brand hover:underline"
                        >
                          {item.sku}
                        </Link>
                        <p className="mt-1 text-xs text-muted">Tối thiểu: {item.threshold}</p>
                      </Td>
                      <Td>
                        <Stack primary={item.name} secondary={`${item.category} · ${item.brand}`} />
                      </Td>
                      <Td className="font-semibold tabular-nums">
                        <span className={isLowStock(item) ? "text-warning" : ""}>
                          {item.available} {item.unit}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={getStockWarning(item)} />
                      </Td>
                      <Td>
                        <ActionLink href={`/admin/products/${item.sku}`}>Chi tiết</ActionLink>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              from={1}
              to={filteredStock.length}
              total={filteredStock.length}
            />
          </>
        )}
      </section>

      {/* Page Footnote matching Inventory.png */}
      <footer className="text-xs text-muted">
        {forcedState === "loading" ? (
          "Đang đối chiếu dữ liệu nhập – xuất – tồn. Vui lòng không đóng trang."
        ) : forcedState === "error" ? (
          "Không có thay đổi số lượng tồn kho. Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra."
        ) : isEmpty ? (
          "Không có kết quả cho bộ lọc hiện tại. Dữ liệu tồn kho vẫn được giữ nguyên."
        ) : (
          "Kho TP. Hồ Chí Minh · Cập nhật theo thời gian thực mỗi khi có đơn xuất hoặc phiếu nhập."
        )}
      </footer>
    </div>
  );
}
