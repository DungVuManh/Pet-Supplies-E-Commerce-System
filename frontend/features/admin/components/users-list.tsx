"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleX, Package } from "lucide-react";
import { ActionLink, Field, ListState, Pagination, TabNav, control, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { useListState } from "@/features/workspace/components/use-list-state";
import { countUsers, filterUsers, roleLabels, type UserFilter, type UserRole, type UserStatus } from "../mock/users";
import { DataTable, StatusBadge, Stack, Td, Th } from "./admin-ui";

const PAGE_SIZE = 6;
const initial: UserFilter = { tab: "all", query: "", role: "all", status: "all" };
const tabs: { value: UserFilter["tab"]; label: string }[] = [
  { value: "all", label: "Tất cả" }, { value: "customer", label: "Customer" }, { value: "staff", label: "Staff" },
];

export function UsersList() {
  const pathname = usePathname();
  const reviewState = useListState();
  const [filter, setFilter] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [page, setPage] = useState(1);

  const rows = filterUsers(filter);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const state = reviewState ?? (rows.length === 0 ? "empty" : null);

  function apply(next: UserFilter) { setFilter(next); setDraft(next); setPage(1); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ ...draft, tab: filter.tab }); }

  return <>
    <TabNav label="Lọc theo vai trò" items={tabs.map((tab) => ({ label: `${tab.label} (${countUsers(tab.value)})`, active: filter.tab === tab.value, onSelect: () => apply({ ...filter, tab: tab.value }) }))} />

    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_232px_232px_auto]" aria-label="Bộ lọc người dùng">
      <Field label="Tìm kiếm" htmlFor="user-query"><input id="user-query" type="search" className={control} placeholder="Tên, email hoặc số điện thoại" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></Field>
      <Field label="Vai trò" htmlFor="user-role"><select id="user-role" className={control} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole | "all" })}>
        <option value="all">Tất cả vai trò</option><option value="customer">Customer</option><option value="staff">Staff</option>
      </select></Field>
      <Field label="Trạng thái" htmlFor="user-status"><select id="user-status" className={control} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as UserStatus | "all" })}>
        <option value="all">Tất cả trạng thái</option><option value="Hoạt động">Hoạt động</option><option value="Đã khóa">Đã khóa</option>
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>

    <DataTable caption="Danh sách người dùng"
      head={<><Th className="w-44">Mã tài khoản</Th><Th>Họ tên / Liên hệ</Th><Th>Vai trò</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}
      footer={state ? undefined : <Pagination from={(page - 1) * PAGE_SIZE + 1} to={(page - 1) * PAGE_SIZE + visible.length} total={rows.length} page={page} pages={pages} onPage={setPage} />}>
      {state ? <tr><td colSpan={5} className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy người dùng"
          description="Không có tài khoản khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ người dùng."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={() => apply(initial)}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" title="Đang tải danh sách người dùng..." />}
        {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách người dùng"
          description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."
          action={<Link href={pathname} className={`${primaryLink} min-h-10`}>Thử lại</Link>} />}
      </td></tr> : visible.map((user) => <tr key={user.id}>
        <Td><Stack primary={user.id} secondary={`Tham gia ${user.joinedAt}`} strong /></Td>
        <Td><Stack primary={user.fullName} secondary={`${user.email} · ${user.phone}`} /></Td>
        <Td className="font-semibold">{roleLabels[user.role]}</Td>
        <Td><StatusBadge status={user.status} /></Td>
        <Td><ActionLink href={`/admin/users/${user.id}`}>Chi tiết</ActionLink></Td>
      </tr>)}
    </DataTable>
  </>;
}
