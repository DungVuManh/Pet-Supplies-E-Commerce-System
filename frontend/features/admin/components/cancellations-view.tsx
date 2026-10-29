"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Package, XCircle, CheckCircle2 } from "lucide-react";
import { AdminPageHeader, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { Badge, ListState, listStatePill, Pagination, TabNav, card, control } from "@/components/workspace/workspace-ui";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { useListState } from "@/components/workspace/use-list-state";
import {
  initialCancellations,
  filterCancellations,
  type CancellationRequest,
  type CancellationStatus,
} from "../mock/cancellations";

const TABS: readonly CancellationStatus[] = ["Chờ duyệt", "Đã chấp nhận", "Đã từ chối"];

const vnd = (val: number) => `${val.toLocaleString("vi-VN")} ₫`;

export function CancellationsView() {
  const router = useRouter();
  const forcedState = useListState();
  const [requests, setRequests] = useState<CancellationRequest[]>(initialCancellations);
  const [activeTab, setActiveTab] = useState<CancellationStatus | "Tất cả">("Chờ duyệt");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Chờ duyệt");
  const [notice, setNotice] = useState<string | null>(null);

  // Tab click handler
  const handleTabSelect = (tab: CancellationStatus) => {
    setActiveTab(tab);
    setStatusFilter(tab);
    setNotice(null);
  };

  // Status dropdown change
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    if (val === "Tất cả") {
      setActiveTab("Tất cả");
    } else {
      setActiveTab(val as CancellationStatus);
    }
  };

  // Clear filters
  const resetFilters = () => {
    setSearch("");
    setActiveTab("Tất cả");
    setStatusFilter("Tất cả");
    setNotice(null);
  };

  // Approve action
  const handleApprove = (item: CancellationRequest) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === item.id ? { ...r, status: "Đã chấp nhận", note: "Đã chấp nhận và hoàn tiền" } : r
      )
    );
    setNotice(`Đã chấp nhận yêu cầu ${item.id} cho đơn hàng #${item.orderId}. Yêu cầu đã chuyển sang “Đã chấp nhận”.`);
  };

  // Reject action
  const handleReject = (item: CancellationRequest) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === item.id ? { ...r, status: "Đã từ chối", note: "Từ chối hủy do đơn đã xuất kho" } : r
      )
    );
    setNotice(`Đã từ chối yêu cầu ${item.id} cho đơn hàng #${item.orderId}. Yêu cầu đã chuyển sang “Đã từ chối”.`);
  };

  // Filtered rows
  const filteredList = useMemo(() => {
    return filterCancellations(requests, {
      search,
      status: statusFilter,
    });
  }, [requests, search, statusFilter]);

  // Tab items for TabNav
  const tabItems = TABS.map((tab) => ({
    label: tab,
    active: activeTab === tab,
    onSelect: () => handleTabSelect(tab),
  }));

  // Header export action
  const exportAction = forcedState === "loading" ? (
    <button
      type="button"
      disabled
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-white opacity-40"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Xuất yêu cầu
    </button>
  ) : (
    <DemoNotice
      label="Xuất yêu cầu"
      icon={<Download className="h-4 w-4" aria-hidden="true" />}
      message="Chức năng xuất danh sách yêu cầu chưa kết nối backend."
    />
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Yêu cầu hủy", "Yêu cầu hủy đơn"]}
        title="Yêu cầu hủy đơn"
        subtitle="Duyệt yêu cầu hủy trước khi đơn được bàn giao vận chuyển."
        actions={exportAction}
      />

      <TabNav items={tabItems} label="Trạng thái yêu cầu hủy" />

      {/* Main card */}
      <section className={`${card} min-w-0 overflow-hidden`}>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-6">
          <h2 className="text-xl font-semibold">Yêu cầu hủy đơn hàng</h2>
          <div>
            {forcedState ? (
              <Badge tone={listStatePill[forcedState].tone}>{listStatePill[forcedState].label}</Badge>
            ) : filteredList.length === 0 ? (
              <Badge tone="neutral">Rỗng</Badge>
            ) : null}
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid gap-4 border-b border-line p-6 sm:grid-cols-2 lg:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="cancellation-search" className="font-medium">
              Tìm kiếm
            </label>
            <input
              id="cancellation-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={forcedState === "loading" ? "Nhập từ khóa tìm kiếm" : "Mã yêu cầu, mã đơn hoặc khách hàng"}
              disabled={forcedState === "loading"}
              className={control}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="cancellation-status" className="font-medium">
              Trạng thái
            </label>
            <select
              id="cancellation-status"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={forcedState === "loading"}
              className={control}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Đã chấp nhận">Đã chấp nhận</option>
              <option value="Đã từ chối">Đã từ chối</option>
            </select>
          </div>
        </div>

        {/* Action feedback notice */}
        {notice && !forcedState && (
          <div className="flex items-center justify-between gap-3 border-b border-brand/20 bg-brand-subtle px-6 py-3 text-sm font-medium text-brand">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded p-1 hover:bg-brand/10 text-xs text-muted hover:text-ink"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Card Body depending on forced state or real state */}
        {forcedState === "loading" ? (
          <>
            <div className="p-6">
              <ListState
                kind="loading"
                title="Đang tải yêu cầu hủy..."
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
                title="Không thể tải yêu cầu hủy"
                description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử lại."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/admin/cancellations");
                    }}
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
        ) : forcedState === "empty" || filteredList.length === 0 ? (
          <>
            <div className="p-6">
              <ListState
                kind="empty"
                icon={<Package className="h-12 w-12 text-muted stroke-1" />}
                title={
                  activeTab === "Chờ duyệt" && !search
                    ? "Chưa có yêu cầu chờ duyệt"
                    : "Không tìm thấy yêu cầu hủy"
                }
                description={
                  activeTab === "Chờ duyệt" && !search
                    ? "Tất cả yêu cầu trong kỳ đã được xử lý. Bạn có thể xem lịch sử duyệt và từ chối trong danh sách đầy đủ."
                    : "Không có yêu cầu hủy nào khớp với điều kiện lọc hiện tại. Thử chọn trạng thái khác hoặc xóa tìm kiếm."
                }
                action={
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover"
                  >
                    Xem tất cả yêu cầu
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
            {/* Populated table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">Danh sách yêu cầu hủy đơn</caption>
                <thead className="bg-canvas text-xs uppercase text-muted">
                  <tr>
                    <Th className="w-44">Yêu cầu</Th>
                    <Th>Đơn hàng / Lý do</Th>
                    <Th className="w-36">Giá trị</Th>
                    <Th className="w-48">Người yêu cầu</Th>
                    <Th className="w-48 text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((row) => (
                    <tr key={row.id} className="hover:bg-canvas/50">
                      <Td>
                        <Stack primary={row.id} secondary={row.createdAt} strong />
                      </Td>
                      <Td>
                        <div className="min-w-0">
                          <Link href={`/admin/orders?q=${row.orderId}`} className="font-semibold text-brand hover:underline">
                            #{row.orderId}
                          </Link>
                          <p className="mt-1 text-xs text-muted line-clamp-2">
                            {row.reason}
                          </p>
                        </div>
                      </Td>
                      <Td className="font-semibold tabular-nums">
                        {vnd(row.value)}
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          <Stack primary={row.customer} secondary={row.requesterRole} />
                          <div>
                            <StatusBadge status={row.status} />
                          </div>
                        </div>
                      </Td>
                      <Td className="text-right">
                        {row.status === "Chờ duyệt" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(row)}
                              className="inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover"
                            >
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(row)}
                              className="inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-danger hover:bg-danger-subtle"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-muted">
                            {row.status === "Đã chấp nhận" ? (
                              <span className="font-medium text-success">Đã duyệt</span>
                            ) : (
                              <span className="font-medium text-danger">Đã từ chối</span>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              from={1}
              to={filteredList.length}
              total={filteredList.length}
            />
          </>
        )}
      </section>

      {/* Footnote below card as designed in Order.png */}
      <footer className="text-xs text-muted">
        {forcedState === "loading" ? (
          "Đang tải yêu cầu mới nhất. Các thao tác duyệt sẽ sẵn sàng sau khi hoàn tất."
        ) : forcedState === "error" ? (
          "Chưa có yêu cầu nào bị thay đổi. Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra."
        ) : (
          "Yêu cầu đã duyệt được lưu trong lịch sử. Tồn kho chỉ hoàn lại sau khi chấp nhận hủy."
        )}
      </footer>
    </div>
  );
}
