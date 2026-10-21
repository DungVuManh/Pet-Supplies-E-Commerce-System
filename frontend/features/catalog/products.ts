export type CategoryId = "dog" | "cat" | "food" | "accessories";

export type Product = {
  id: string;
  brand: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categories: readonly CategoryId[];
};

export const categories = [
  { id: "dog", name: "Dành cho chó", description: "Chăm sóc người bạn nhỏ", icon: "/icons/dog.svg" },
  { id: "cat", name: "Dành cho mèo", description: "Chiều chuộng bé mèo", icon: "/icons/cat.svg" },
  { id: "food", name: "Thức ăn & bánh thưởng", description: "Dinh dưỡng mỗi ngày", icon: "/icons/utensils.svg" },
  { id: "accessories", name: "Đồ chơi & phụ kiện", description: "Thêm niềm vui cho bé", icon: "/icons/bone.svg" },
] as const;

// Sample catalog from the supplied design; replace with API data when available.
export const products: readonly Product[] = [
  {
    id: "royal-canin-mini-adult",
    brand: "Royal Canin",
    name: "Royal Canin Mini Adult",
    description: "Thức ăn cho chó trưởng thành · 2 kg",
    price: 420000,
    image: "/images/products/royal-canin-mini-adult.png",
    categories: ["dog", "food"],
  },
  {
    id: "royal-canin-indoor",
    brand: "Royal Canin",
    name: "Royal Canin Indoor 27",
    description: "Thức ăn cho mèo trong nhà · 2 kg",
    price: 480000,
    image: "/images/products/royal-canin-indoor.png",
    categories: ["cat", "food"],
  },
  {
    id: "kong-ball",
    brand: "KONG",
    name: "Bóng cao su KONG",
    description: "Đồ chơi cho chó · Cỡ nhỏ",
    price: 85000,
    image: "/images/products/kong-ball.png",
    categories: ["dog", "accessories"],
  },
  {
    id: "cats-best-original",
    brand: "Cat’s Best",
    name: "Cát mèo Cat’s Best Original",
    description: "Cát hữu cơ vón cục · 5 L",
    price: 195000,
    image: "/images/products/cats-best-original.png",
    categories: ["cat", "accessories"],
  },
];

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
}

export function filterProducts(query = "", category = ""): readonly Product[] {
  const selected = categories.find((item) => item.id === category);
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    if (selected && !product.categories.includes(selected.id)) return false;
    const text = normalizeSearch(`${product.brand} ${product.name} ${product.description}`);
    return words.every((word) => text.includes(word));
  });
}
