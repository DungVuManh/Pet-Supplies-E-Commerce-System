import type { BadgeTone } from "@/components/workspace/workspace-ui";
import type { OrderStatus, ProductStatus, StockStatus } from "../mock-data";

export {
  ActionLink, Badge, BarChart, MetricCard, PageHeader, TableFrame, TableHead, Td, Th, card, control, primaryLink, secondaryButton,
} from "@/components/workspace/workspace-ui";
export type { BadgeTone } from "@/components/workspace/workspace-ui";

export const orderLabels: Record<OrderStatus, string> = { pending: "Chờ xử lý", packing: "Đóng gói", shipping: "Đang giao", completed: "Hoàn thành", cancelled: "Đã hủy" };
export const orderTones: Record<OrderStatus, BadgeTone> = { pending: "warning", packing: "info", shipping: "info", completed: "success", cancelled: "danger" };
export const productLabels: Record<ProductStatus, string> = { active: "Đang bán", hidden: "Tạm ẩn" };
export const stockLabels: Record<StockStatus, string> = { available: "Còn hàng", low: "Sắp hết", out: "Hết hàng" };
export const stockTones: Record<StockStatus, BadgeTone> = { available: "success", low: "warning", out: "danger" };
