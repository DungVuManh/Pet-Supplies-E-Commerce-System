"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money } from "../mock-data";
import {
 ActionLink,
 Badge,
 PageHeader,
 TableFrame,
 TableHead,
 Td,
 Th,
 control,
 secondaryButton,
} from "./staff-ui";
import { fetchStaffOrders, StaffOrdersApiError } from "../orders/api";
import {
 type OrderStatus,
 type SortOption,
 type StaffOrdersFilterState,
 type StaffOrdersListResponse,
 orderStatusLabels,
 orderStatusTones,
 sortOptions,
} from "../orders/types";

const ALL_STATUSES: OrderStatus[] = [
 "pending",
 "confirmed",
 "processing",
 "shipping",
 "completed",
 "cancelled",
];

function formatOrderDateTime(isoString: string): string {
 try {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} · ${hours}:${minutes}`;
 } catch {
  return isoString;
 }
}

export function OrdersList() {
 const router = useRouter();
 const searchParams = useSearchParams();

 // Read URL filter state
 const urlQuery = searchParams.get("query") || "";
 const urlStatusParam = searchParams.get("status");
 const urlStatus: OrderStatus | "all" =
  urlStatusParam && ALL_STATUSES.includes(urlStatusParam as OrderStatus)
   ? (urlStatusParam as OrderStatus)
   : "all";
 const urlDateFrom = searchParams.get("dateFrom") || "";
 const urlDateTo = searchParams.get("dateTo") || "";
 const urlSortParam = searchParams.get("sort");
 const urlSort: SortOption =
  urlSortParam &&
  ["createdAt_desc", "createdAt_asc", "total_desc", "total_asc"].includes(
   urlSortParam,
  )
   ? (urlSortParam as SortOption)
   : "createdAt_desc";
 const urlPage = parseInt(searchParams.get("page") || "1", 10) || 1;

 // Local query state for immediate input feedback & debounce
 const [searchInput, setSearchInput] = useState(urlQuery);
 const [previousQuery, setPreviousQuery] = useState(urlQuery);
 const [data, setData] = useState<StaffOrdersListResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
 if (urlQuery !== prevUrlQuery) {
  setPrevUrlQuery(urlQuery);
  setSearchInput(urlQuery);
 }

 // Active filter state derived from URL
 const activeFilter: StaffOrdersFilterState = useMemo(
  () => ({
   query: urlQuery,
   status: urlStatus,
   dateFrom: urlDateFrom,
   dateTo: urlDateTo,
   sort: urlSort,
   page: urlPage,
  }),
  [urlQuery, urlStatus, urlDateFrom, urlDateTo, urlSort, urlPage],
 );

 // Update URL helper
 const updateUrl = useCallback(
  (newParams: Partial<StaffOrdersFilterState>, replaceHistory = false) => {
   const next = new URLSearchParams();
   const merged = { ...activeFilter, ...newParams };

   if (merged.query && merged.query.trim()) {
    next.set("query", merged.query.trim());
   }
   if (merged.status && merged.status !== "all") {
    next.set("status", merged.status);
   }
   if (merged.dateFrom && merged.dateFrom.trim()) {
    next.set("dateFrom", merged.dateFrom.trim());
   }
   if (merged.dateTo && merged.dateTo.trim()) {
    next.set("dateTo", merged.dateTo.trim());
   }
   if (merged.sort && merged.sort !== "createdAt_desc") {
    next.set("sort", merged.sort);
   }
   if (merged.page && merged.page > 1) {
    next.set("page", String(merged.page));
   }

   const queryString = next.toString();
   const targetUrl = `/staff/orders${queryString ? `?${queryString}` : ""}`;

   if (replaceHistory) {
    router.replace(targetUrl, { scroll: false });
   } else {
    router.push(targetUrl, { scroll: false });
   }
  },
  [activeFilter, router],
 );

 // Fetch data when activeFilter changes
 useEffect(() => {
  const controller = new AbortController();

  async function loadOrders() {
   setLoading(true);
   setError(null);

   try {
    const responseData = await fetchStaffOrders(
     activeFilter,
     controller.signal,
    );
    setData(responseData);

    // Check if page exceeds totalPages
    if (
     responseData.pagination.totalPages > 0 &&
     activeFilter.page > responseData.pagination.totalPages
    ) {
     updateUrl({ page: responseData.pagination.totalPages }, true);
    }
   } catch (err: unknown) {
    if (controller.signal.aborted) return;
    if (err instanceof StaffOrdersApiError) {
     if (err.status === 401) {
      router.push("/login");
      return;
     }
     if (err.status === 403) {
      router.push("/forbidden");
      return;
     }
     setError(err.message || "Không thể tải danh sách đơn hàng.");
    } else {
     setError("Chưa thể kết nối tới máy chủ. Vui lòng thử lại.");
    }
   } finally {
    if (!controller.signal.aborted) {
     setLoading(false);
    }
   }
  }

  loadOrders();

  return () => {
   controller.abort();
  };
 }, [activeFilter, router, updateUrl]);

 // Debounced search
 const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
 const handleSearchChange = (value: string) => {
  setSearchInput(value);
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  debounceTimerRef.current = setTimeout(() => {
   updateUrl({ query: value, page: 1 }, true);
  }, 300);
 };

 const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
   if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
   updateUrl({ query: searchInput, page: 1 }, true);
  }
 };

 const handleStatusTab = (status: OrderStatus | "all") => {
  updateUrl({ status, page: 1 });
 };

 const handleResetFilters = () => {
  setSearchInput("");
  router.push("/staff/orders", { scroll: false });
 };

 // Build summary subtitle
 const totalMatching = data?.pagination.total ?? 0;
 const subtitle = `${totalMatching} đơn hàng phù hợp${
  activeFilter.dateFrom || activeFilter.dateTo ? " theo khoảng ngày" : ""
 }`;

 const tabs: { value: OrderStatus | "all"; label: string; count: number }[] =
  useMemo(() => {
   const counts = data?.summary.statusCounts || {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0,
   };
   return [
    { value: "all", label: "Tất cả", count: data?.summary.all ?? 0 },
    ...ALL_STATUSES.map((statusKey) => ({
     value: statusKey,
     label: orderStatusLabels[statusKey],
     count: counts[statusKey] ?? 0,
    })),
   ];
  }, [data]);

 return (
  <>
   <PageHeader
    title="Danh sách đơn hàng"
    subtitle={subtitle}
    action={
     <Link className={secondaryButton} href="/staff/orders/new">
      Tạo đơn hộ khách
     </Link>
    }
   />

   {error && (
    <div
     role="alert"
     className="rounded-lg border border-line bg-canvas p-4 text-ink"
    >
     <p className="font-semibold text-danger">{error}</p>
     <div className="mt-2 flex gap-3">
      <button
       onClick={() => updateUrl({})}
       className="text-xs font-semibold text-brand hover:underline"
      >
       Tải lại
      </button>
      <button
       onClick={handleResetFilters}
       className="text-xs font-semibold text-muted hover:underline"
      >
       Xóa bộ lọc
      </button>
     </div>
    </div>
   )}

   {/* Quick Status Tabs */}
   <div
    className="flex gap-2 overflow-x-auto border-b border-line"
    aria-label="Lọc nhanh theo trạng thái"
   >
    {tabs.map((tab) => {
     const isActive = activeFilter.status === tab.value;
     return (
      <button
       key={tab.value}
       onClick={() => handleStatusTab(tab.value)}
       className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors ${
        isActive
         ? "border-brand text-brand"
         : "border-transparent text-muted hover:text-ink"
       }`}
      >
       {tab.label} ({tab.count})
      </button>
     );
    })}
   </div>

   {/* Controls Grid */}
   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <label className="grid gap-2 font-medium">
     Tìm kiếm đơn hàng
     <input
      value={searchInput}
      onChange={(e) => handleSearchChange(e.target.value)}
      onKeyDown={handleSearchKeyDown}
      className={control}
      placeholder="Mã đơn, tên hoặc số điện thoại"
     />
    </label>

    <label className="grid gap-2 font-medium">
     Trạng thái
     <select
      value={activeFilter.status}
      onChange={(e) =>
       updateUrl({ status: e.target.value as OrderStatus | "all", page: 1 })
      }
      className={control}
     >
      <option value="all">Tất cả trạng thái</option>
      {ALL_STATUSES.map((statusKey) => (
       <option value={statusKey} key={statusKey}>
        {orderStatusLabels[statusKey]}
       </option>
      ))}
     </select>
    </label>

    <div className="grid grid-cols-2 gap-2">
     <label className="grid gap-2 font-medium">
      Từ ngày
      <input
       type="date"
       className={control}
       value={activeFilter.dateFrom}
       onChange={(e) => updateUrl({ dateFrom: e.target.value, page: 1 })}
      />
     </label>
     <label className="grid gap-2 font-medium">
      Đến ngày
      <input
       type="date"
       className={control}
       value={activeFilter.dateTo}
       onChange={(e) => updateUrl({ dateTo: e.target.value, page: 1 })}
      />
     </label>
    </div>

    <label className="grid gap-2 font-medium">
     Sắp xếp
     <select
      value={activeFilter.sort}
      onChange={(e) =>
       updateUrl({ sort: e.target.value as SortOption, page: 1 })
      }
      className={control}
     >
      {sortOptions.map((opt) => (
       <option value={opt.value} key={opt.value}>
        {opt.label}
       </option>
      ))}
     </select>
    </label>
   </div>

   <div className="flex flex-wrap justify-between gap-4 text-xs text-muted">
    <p></p>
    <button
     className="min-h-10 font-semibold text-brand hover:underline"
     onClick={handleResetFilters}
    >
     Xóa bộ lọc
    </button>
   </div>

   {/* Orders Table */}
   <div className="min-w-0 whitespace-nowrap [&_table]:min-w-0 [&_table]:table-fixed [&_th]:overflow-hidden [&_th]:px-2 [&_th]:text-ellipsis [&_td]:overflow-hidden [&_td]:px-2 [&_td]:text-ellipsis">
    <TableFrame>
     <colgroup>
      <col className="w-[22%]" />
      <col className="w-[13%]" />
      <col className="w-[17%]" />
      <col className="w-[10%]" />
      <col className="w-[14%]" />
      <col className="w-[15%]" />
      <col className="w-[9%]" />
     </colgroup>
     <TableHead>
      <Th>Mã đơn</Th>
      <Th>Ngày đặt</Th>
      <Th>Khách hàng</Th>
      <Th right>Số sản phẩm</Th>
      <Th right>Tổng tiền</Th>
      <Th>Trạng thái</Th>
      <Th>Thao tác</Th>
     </TableHead>
     <tbody>
      {loading ? (
       <tr>
        <td colSpan={7} className="p-8 text-center text-muted">
         Đang tải danh sách đơn hàng...
        </td>
       </tr>
      ) : data?.items && data.items.length > 0 ? (
       data.items.map((order) => (
        <tr key={order.id}>
         <Td>
          <strong title={order.orderCode}>#{order.orderCode}</strong>
         </Td>
         <Td>
          <span
           title={formatOrderDateTime(order.createdAt)}
           className="text-xs text-muted"
          >
           {formatOrderDateTime(order.createdAt)}
          </span>
         </Td>
         <Td>
          <span title={order.customer.name || "Khách vãng lai"}>
           {order.customer.name || "Khách vãng lai"}
          </span>
         </Td>
         <Td right>{order.itemCount}</Td>
         <Td right>
          <strong title={money(order.total)}>{money(order.total)}</strong>
         </Td>
         <Td>
          <span
           title={orderStatusLabels[order.orderStatus]}
           className="block truncate [&>span]:max-w-full [&>span]:px-2"
          >
           <Badge tone={orderStatusTones[order.orderStatus]}>
            <span className="truncate">
             {orderStatusLabels[order.orderStatus]}
            </span>
           </Badge>
          </span>
         </Td>
         <Td>
          <ActionLink href={`/staff/orders/${order.id}`}>Chi tiết</ActionLink>
         </Td>
        </tr>
       ))
      ) : (
       <tr>
        <td colSpan={7} className="p-8 text-center text-muted">
         Không có đơn hàng phù hợp.
        </td>
       </tr>
      )}
     </tbody>
    </TableFrame>
   </div>

   {/* Pagination Footer */}
   {data && data.pagination.totalPages > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
     <p>
      Hiển thị {data.items.length} trong {data.pagination.total} đơn hàng ·{" "}
      {data.pagination.pageSize} đơn / trang
     </p>
     <div className="flex items-center gap-3">
      <button
       onClick={() => updateUrl({ page: activeFilter.page - 1 })}
       disabled={activeFilter.page <= 1}
       className={`rounded px-3 py-1 font-semibold ${
        activeFilter.page <= 1
         ? "cursor-not-allowed opacity-40"
         : "text-brand hover:underline"
       }`}
      >
       ‹ Trước
      </button>
      <strong className="rounded-full bg-brand-subtle px-4 py-2 text-brand">
       Trang {activeFilter.page} / {data.pagination.totalPages}
      </strong>
      <button
       onClick={() => updateUrl({ page: activeFilter.page + 1 })}
       disabled={activeFilter.page >= data.pagination.totalPages}
       className={`rounded px-3 py-1 font-semibold ${
        activeFilter.page >= data.pagination.totalPages
         ? "cursor-not-allowed opacity-40"
         : "text-brand hover:underline"
       }`}
      >
       Tiếp ›
      </button>
     </div>
    </div>
   )}
  </>
 );
}
