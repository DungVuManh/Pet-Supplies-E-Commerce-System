import { matchesQuery } from "./text.ts";

export type UserRole = "customer" | "staff";
export type UserStatus = "Hoạt động" | "Đã khóa";
export type AdminUser = { id: string; role: UserRole; fullName: string; email: string; phone: string; joinedAt: string; status: UserStatus };

export const roleLabels: Record<UserRole, string> = { customer: "Customer", staff: "Staff" };
/** Admin accounts are managed separately and never appear in the user list. */
export const adminAccountCount = 1;

const designed: AdminUser[] = [
  { id: "KH0001", role: "customer", fullName: "Nguyễn Minh Anh", email: "minhanh.nguyen@gmail.com", phone: "0901 234 567", joinedAt: "01/09/2026", status: "Hoạt động" },
  { id: "KH0002", role: "customer", fullName: "Trần Bảo Ngọc", email: "baongoc.tran@gmail.com", phone: "0912 456 789", joinedAt: "04/09/2026", status: "Hoạt động" },
  { id: "NV0001", role: "staff", fullName: "Phạm Thu Hà", email: "thuha@petly.vn", phone: "0934 567 890", joinedAt: "15/08/2026", status: "Hoạt động" },
  { id: "NV0002", role: "staff", fullName: "Vũ Đức Long", email: "duclong@petly.vn", phone: "0987 654 321", joinedAt: "20/08/2026", status: "Hoạt động" },
  { id: "KH0003", role: "customer", fullName: "Lê Quang Huy", email: "quanghuy.le@gmail.com", phone: "0923 456 780", joinedAt: "06/09/2026", status: "Đã khóa" },
  { id: "KH0004", role: "customer", fullName: "Đỗ Khánh Linh", email: "khanhlinh.do@gmail.com", phone: "0945 678 901", joinedAt: "08/09/2026", status: "Hoạt động" },
];

const moreStaff: AdminUser[] = [
  { id: "NV0003", role: "staff", fullName: "Hoàng Gia Bảo", email: "giabao@petly.vn", phone: "0938 112 233", joinedAt: "22/08/2026", status: "Hoạt động" },
  { id: "NV0004", role: "staff", fullName: "Ngô Thanh Tâm", email: "thanhtam@petly.vn", phone: "0976 445 566", joinedAt: "28/08/2026", status: "Hoạt động" },
  { id: "NV0005", role: "staff", fullName: "Bùi Ngọc Mai", email: "ngocmai@petly.vn", phone: "0965 778 899", joinedAt: "02/09/2026", status: "Hoạt động" },
  { id: "NV0006", role: "staff", fullName: "Đặng Văn Khoa", email: "vankhoa@petly.vn", phone: "0919 220 331", joinedAt: "05/09/2026", status: "Đã khóa" },
];

const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
const middleNames = ["Văn", "Thị", "Minh", "Hoàng", "Thu", "Bảo", "Quang", "Khánh", "Ngọc", "Đức", "Thanh", "Gia"];
const givenNames = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hải", "Hương", "Khoa", "Lan", "Linh", "Long", "Mai", "Nam", "Nhi", "Phúc", "Quân", "Tâm", "Trang", "Vy"];
const ascii = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
const pad = (value: number, size: number) => String(value).padStart(size, "0");

/** Deterministic filler customers KH0005–KH0342 so counts and paging match the design. */
function generatedCustomer(n: number): AdminUser {
  const last = lastNames[n % lastNames.length], middle = middleNames[(n * 7) % middleNames.length], given = givenNames[(n * 11) % givenNames.length];
  const day = 1 + (n % 30), month = 8 + Math.floor(n / 150);
  return {
    id: `KH${pad(n, 4)}`, role: "customer", fullName: `${last} ${middle} ${given}`,
    email: `${ascii(given)}.${ascii(last)}${n}@gmail.com`, phone: `09${n % 10}${(n * 3) % 10} ${pad((n * 37) % 1000, 3)} ${pad((n * 53) % 1000, 3)}`,
    joinedAt: `${pad(day, 2)}/${pad(month, 2)}/2026`, status: n % 17 === 0 ? "Đã khóa" : "Hoạt động",
  };
}

export const users: AdminUser[] = [...designed, ...Array.from({ length: 338 }, (_, i) => generatedCustomer(i + 5)), ...moreStaff];

export function getUser(id: string) {
  return users.find((user) => user.id === id);
}

export function countUsers(role: UserRole | "all") {
  return role === "all" ? users.length : users.filter((user) => user.role === role).length;
}

export type UserFilter = { tab: UserRole | "all"; query: string; role: UserRole | "all"; status: UserStatus | "all" };

export function filterUsers({ tab, query, role, status }: UserFilter) {
  return users.filter((user) => (tab === "all" || user.role === tab)
    && (role === "all" || user.role === role)
    && (status === "all" || user.status === status)
    && matchesQuery(query, user.id, user.fullName, user.email, user.phone));
}
