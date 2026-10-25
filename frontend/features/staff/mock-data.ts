export type OrderStatus = "pending" | "packing" | "shipping" | "completed" | "cancelled";
export type ProductStatus = "active" | "hidden";
export type StockStatus = "available" | "low" | "out";

export type Product = {
  sku: string; name: string; category: string; brand: string; weight: string; price: number;
  physical: number; reserved: number; threshold: number; location: string; status: ProductStatus;
  image: string; updated: string; shortDescription: string; content: string;
};

export type Order = {
  id: string; customer: string; phone: string; date: string; time: string; payment: "COD" | "VNPay";
  status: OrderStatus; total: number; address: string; note: string;
  items: { sku: string; quantity: number }[];
};

const description = "Thức ăn hoàn chỉnh dành cho chó trưởng thành giống nhỏ dưới 10 kg, từ 10 tháng tuổi. Hỗ trợ tiêu hóa và duy trì cân nặng lý tưởng.";
const content = "Protein dễ tiêu hóa, L-carnitine hỗ trợ chuyển hóa chất béo. Omega 3 & 6 chăm sóc da và lông. Luôn cung cấp nước sạch; chia khẩu phần theo hướng dẫn trên bao bì. Bảo quản nơi khô ráo, đóng kín túi sau khi dùng.";

export const products: Product[] = [
  { sku: "RC-D02", name: "Royal Canin Mini Adult", category: "Thức ăn cho chó", brand: "Royal Canin", weight: "2 kg", price: 420000, physical: 72, reserved: 8, threshold: 10, location: "Kệ A1", status: "active", image: "/images/products/royal-canin-mini-adult.png", updated: "12/10 · 11:20", shortDescription: description, content },
  { sku: "RC-C02", name: "Royal Canin Indoor 27", category: "Thức ăn cho mèo", brand: "Royal Canin", weight: "2 kg", price: 480000, physical: 43, reserved: 5, threshold: 10, location: "Kệ A2", status: "active", image: "/images/products/royal-canin-indoor.png", updated: "12/10 · 09:15", shortDescription: "Dinh dưỡng cân bằng cho mèo trưởng thành sống trong nhà.", content: "Hỗ trợ tiêu hóa, kiểm soát cân nặng và duy trì bộ lông khỏe mạnh." },
  { sku: "KG-B01", name: "Bóng cao su KONG", category: "Đồ chơi", brand: "KONG", weight: "Cỡ nhỏ", price: 85000, physical: 8, reserved: 2, threshold: 10, location: "Kệ C1", status: "active", image: "/images/products/kong-ball.png", updated: "11/10 · 16:40", shortDescription: "Bóng cao su bền cho chó cỡ nhỏ.", content: "Kiểm tra sản phẩm thường xuyên và thay mới khi có dấu hiệu hư hỏng." },
  { sku: "CB-L05", name: "Cát mèo Cat’s Best Original", category: "Vệ sinh & chăm sóc", brand: "Cat’s Best", weight: "5 L", price: 195000, physical: 4, reserved: 1, threshold: 8, location: "Kệ B1", status: "active", image: "/images/products/cats-best-original.png", updated: "11/10 · 15:05", shortDescription: "Cát mèo hữu cơ vón cục, kiểm soát mùi.", content: "Đổ lớp cát phù hợp và vệ sinh khay hằng ngày." },
  { sku: "PL-L01", name: "Dây dắt đệm êm Petjoy", category: "Phụ kiện", brand: "Petjoy", weight: "1,5 m", price: 165000, physical: 0, reserved: 0, threshold: 10, location: "Kệ C2", status: "active", image: "/images/products/kong-ball.png", updated: "10/10 · 14:30", shortDescription: "Dây dắt có tay cầm đệm êm.", content: "Phù hợp đi dạo hằng ngày." },
  { sku: "PL-B01", name: "Bát ăn inox chống trượt", category: "Phụ kiện", brand: "Petjoy", weight: "450 ml", price: 120000, physical: 24, reserved: 0, threshold: 5, location: "Kệ C3", status: "hidden", image: "/images/products/kong-ball.png", updated: "10/10 · 10:18", shortDescription: "Bát inox có đế chống trượt.", content: "Rửa sạch sau mỗi lần sử dụng." },
  { sku: "WH-T01", name: "Bánh thưởng Whiskas", category: "Thức ăn cho mèo", brand: "Whiskas", weight: "60 g", price: 45000, physical: 95, reserved: 6, threshold: 10, location: "Kệ A3", status: "active", image: "/images/products/royal-canin-indoor.png", updated: "09/10 · 17:00", shortDescription: "Bánh thưởng giòn cho mèo.", content: "Dùng như thức ăn bổ sung." },
  { sku: "RC-D15", name: "Royal Canin Maxi Adult", category: "Thức ăn cho chó", brand: "Royal Canin", weight: "15 kg", price: 1850000, physical: 7, reserved: 3, threshold: 5, location: "Kệ A4", status: "active", image: "/images/products/royal-canin-mini-adult.png", updated: "09/10 · 09:30", shortDescription: "Dinh dưỡng cho chó trưởng thành giống lớn.", content: "Điều chỉnh khẩu phần theo cân nặng và mức độ vận động." },
];

export const orders: Order[] = [
  { id: "PA261012018", customer: "Nguyễn Minh Anh", phone: "0901 234 567", date: "12/10/2026", time: "10:42", payment: "COD", status: "pending", total: 1100000, address: "28 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM", note: "Gọi trước khi giao, nhận giờ hành chính.", items: [{ sku: "RC-D02", quantity: 1 }, { sku: "RC-C02", quantity: 1 }, { sku: "KG-B01", quantity: 2 }] },
  { id: "PA261012017", customer: "Trần Thu Hà", phone: "0903 456 781", date: "12/10/2026", time: "10:28", payment: "VNPay", status: "packing", total: 510000, address: "17 Lê Lợi, Quận 1, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }] },
  { id: "PA261012016", customer: "Lê Quốc Bảo", phone: "0912 680 345", date: "12/10/2026", time: "10:15", payment: "COD", status: "pending", total: 450000, address: "12 Nguyễn Huệ, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }] },
  { id: "PA261012015", customer: "Phạm Ngọc Linh", phone: "0987 112 233", date: "12/10/2026", time: "09:56", payment: "VNPay", status: "shipping", total: 725000, address: "44 Võ Văn Tần, TP.HCM", note: "", items: [{ sku: "CB-L05", quantity: 3 }] },
  { id: "PA261012014", customer: "Võ Thanh Tùng", phone: "0908 761 245", date: "12/10/2026", time: "09:40", payment: "COD", status: "pending", total: 420000, address: "3 Phan Xích Long, TP.HCM", note: "", items: [{ sku: "RC-D02", quantity: 1 }] },
  { id: "PA261012013", customer: "Đặng Hải Yến", phone: "0938 567 921", date: "12/10/2026", time: "09:24", payment: "VNPay", status: "completed", total: 225000, address: "90 Trường Sa, TP.HCM", note: "", items: [{ sku: "WH-T01", quantity: 5 }] },
  { id: "PA261012012", customer: "Bùi Anh Tuấn", phone: "0918 222 314", date: "12/10/2026", time: "09:10", payment: "VNPay", status: "pending", total: 960000, address: "7 Hoàng Sa, TP.HCM", note: "", items: [{ sku: "RC-C02", quantity: 2 }] },
  { id: "PA261012011", customer: "Nguyễn Thảo Vy", phone: "0905 887 612", date: "12/10/2026", time: "08:48", payment: "COD", status: "cancelled", total: 150000, address: "31 Nguyễn Văn Trỗi, TP.HCM", note: "", items: [{ sku: "KG-B01", quantity: 1 }] },
];

export const revenue = [
  { label: "06/10", value: 18.4 }, { label: "07/10", value: 21.6 }, { label: "08/10", value: 24.8 },
  { label: "09/10", value: 22.1 }, { label: "10/10", value: 25.7 }, { label: "11/10", value: 27.0 }, { label: "12/10", value: 29.2 },
];
export const performance = [
  { label: "06/10", value: 22 }, { label: "07/10", value: 25 }, { label: "08/10", value: 28 },
  { label: "09/10", value: 24 }, { label: "10/10", value: 30 }, { label: "11/10", value: 27 }, { label: "12/10", value: 28 },
];

export function availableStock(product: Product) { return product.physical - product.reserved; }
export function stockStatus(product: Product): StockStatus {
  const available = availableStock(product);
  return available === 0 ? "out" : available <= product.threshold ? "low" : "available";
}
export function getProduct(sku: string) { return products.find((product) => product.sku === sku); }
export function getOrder(id: string) { return orders.find((order) => order.id === id); }
export function money(value: number) { return `${new Intl.NumberFormat("vi-VN").format(value)} đ`; }
export function normalize(value: string) { return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase(); }
function matchesQuery(value: string, query: string) {
  const haystack = normalize(value);
  return normalize(query).split(" ").filter(Boolean).every((token) => haystack.includes(token));
}
export function filterOrders(query: string, status: OrderStatus | "all") {
  return orders.filter((order) => (status === "all" || order.status === status)
    && matchesQuery(`${order.id} ${order.customer} ${order.phone}`, query));
}
export function filterProducts(query: string, category: string, status: ProductStatus | "all", stock: StockStatus | "all") {
  return products.filter((product) => matchesQuery(`${product.name} ${product.sku}`, query)
    && (category === "all" || product.category === category)
    && (status === "all" || product.status === status)
    && (stock === "all" || stockStatus(product) === stock));
}
