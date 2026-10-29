// =============================================================
// features/catalog/products.ts
// Định nghĩa kiểu dữ liệu và danh mục chuẩn cho hệ thống
// =============================================================

export type CategoryId = "dog" | "cat" | "food" | "accessories";

export type ProductVariantItem = {
  sku: string;
  label: string;
  price: number;
  stock: number;
  availableStock?: number;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categories: readonly CategoryId[];
  images?: string[];
  variants?: ProductVariantItem[];
  ratingAvg?: number;
  ratingCount?: number;
  inStock?: boolean;
};

export const categories = [
  { id: "dog", name: "Dành cho chó", description: "Chăm sóc người bạn nhỏ", icon: "/icons/dog.svg" },
  { id: "cat", name: "Dành cho mèo", description: "Chiều chuộng bé mèo", icon: "/icons/cat.svg" },
  { id: "food", name: "Thức ăn & bánh thưởng", description: "Dinh dưỡng mỗi ngày", icon: "/icons/utensils.svg" },
  { id: "accessories", name: "Đồ chơi & phụ kiện", description: "Thêm niềm vui cho bé", icon: "/icons/bone.svg" },
] as const;

export type Category = (typeof categories)[number];
