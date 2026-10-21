import { connectDatabase, disconnectDatabase, createModelIndexes } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";

async function seed() {
  const config = loadEnvironment();
  console.info("Connecting to MongoDB for seeding...");
  await connectDatabase(config.MONGODB_URI);
  await createModelIndexes();

  console.info("Seeding categories...");
  const categoriesData = [
    { name: "Thức ăn cho chó", slug: "thuc-an-cho-cho", isActive: true },
    { name: "Thức ăn cho mèo", slug: "thuc-an-cho-meo", isActive: true },
    { name: "Đồ chơi", slug: "do-choi", isActive: true },
    { name: "Vệ sinh & chăm sóc", slug: "ve-sinh-cham-soc", isActive: true },
    { name: "Phụ kiện", slug: "phu-kien", isActive: true },
  ];

  const categoryMap = new Map();
  for (const cat of categoriesData) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    categoryMap.set(cat.name, doc._id);
  }
  console.info(`Seeded ${categoryMap.size} categories.`);

  console.info("Seeding products...");
  const productsData = [
    {
      name: "Royal Canin Mini Adult",
      categoryName: "Thức ăn cho chó",
      brand: "Royal Canin",
      petType: "dog",
      description: "Thức ăn hoàn chỉnh dành cho chó trưởng thành giống nhỏ dưới 10 kg, từ 10 tháng tuổi. Hỗ trợ tiêu hóa và duy trì cân nặng lý tưởng.",
      images: ["/images/products/royal-canin-mini-adult.png"],
      isActive: true,
      variants: [
        { sku: "RC-D02", label: "2 kg", price: 420000, stock: 72, reservedStock: 8 },
        { sku: "RC-D15", label: "15 kg", price: 1850000, stock: 7, reservedStock: 3 },
      ],
      ratingAvg: 4.8,
      ratingCount: 36,
    },
    {
      name: "Royal Canin Indoor 27",
      categoryName: "Thức ăn cho mèo",
      brand: "Royal Canin",
      petType: "cat",
      description: "Dinh dưỡng cân bằng cho mèo trưởng thành sống trong nhà. Hỗ trợ tiêu hóa, kiểm soát cân nặng và duy trì bộ lông khỏe mạnh.",
      images: ["/images/products/royal-canin-indoor.png"],
      isActive: true,
      variants: [
        { sku: "RC-C02", label: "2 kg", price: 480000, stock: 43, reservedStock: 5 },
        { sku: "RC-C04", label: "4 kg", price: 890000, stock: 20, reservedStock: 2 },
      ],
      ratingAvg: 4.9,
      ratingCount: 42,
    },
    {
      name: "Bóng cao su KONG",
      categoryName: "Đồ chơi",
      brand: "KONG",
      petType: "dog",
      description: "Bóng cao su bền bỉ cho chó gặm và nhặt bóng. Chất liệu cao su thiên nhiên an toàn và có độ nảy tuyệt vời.",
      images: ["/images/products/kong-ball.png"],
      isActive: true,
      variants: [
        { sku: "KG-B01", label: "Cỡ nhỏ", price: 85000, stock: 8, reservedStock: 2 },
        { sku: "KG-B02", label: "Cỡ vừa", price: 125000, stock: 12, reservedStock: 0 },
      ],
      ratingAvg: 4.7,
      ratingCount: 19,
    },
    {
      name: "Cát mèo Cat’s Best Original",
      categoryName: "Vệ sinh & chăm sóc",
      brand: "Cat’s Best",
      petType: "cat",
      description: "Cát mèo hữu cơ từ gỗ thông vón cục tự nhiên, có khả năng phân hủy sinh học và kiểm soát mùi vượt trội.",
      images: ["/images/products/cats-best-original.png"],
      isActive: true,
      variants: [
        { sku: "CB-L05", label: "5 L", price: 195000, stock: 4, reservedStock: 1 },
        { sku: "CB-L10", label: "10 L", price: 360000, stock: 18, reservedStock: 0 },
      ],
      ratingAvg: 4.9,
      ratingCount: 55,
    },
    {
      name: "Dây dắt đệm êm Petly",
      categoryName: "Phụ kiện",
      brand: "Petly",
      petType: "dog",
      description: "Dây dắt có tay cầm đệm êm chống đau tay, khóa kim loại chắc chắn phù hợp dắt thú cưng đi dạo.",
      images: ["/images/products/kong-ball.png"],
      isActive: true,
      variants: [
        { sku: "PL-L01", label: "1,5 m", price: 165000, stock: 0, reservedStock: 0 },
      ],
      ratingAvg: 4.5,
      ratingCount: 8,
    },
    {
      name: "Bát ăn inox chống trượt",
      categoryName: "Phụ kiện",
      brand: "Petly",
      petType: "all",
      description: "Bát ăn inox cao cấp viền silicon chống trượt, dễ dàng vệ sinh sạch sẽ.",
      images: ["/images/products/kong-ball.png"],
      isActive: false, // Tạm ẩn để test filter trạng thái
      variants: [
        { sku: "PL-B01", label: "450 ml", price: 120000, stock: 24, reservedStock: 0 },
      ],
      ratingAvg: 4.6,
      ratingCount: 14,
    },
    {
      name: "Bánh thưởng Whiskas",
      categoryName: "Thức ăn cho mèo",
      brand: "Whiskas",
      petType: "cat",
      description: "Bánh thưởng giòn cho mèo vị thơm ngon hấp dẫn.",
      images: ["/images/products/royal-canin-indoor.png"],
      isActive: true,
      variants: [
        { sku: "WH-T01", label: "60 g", price: 45000, stock: 95, reservedStock: 6 },
      ],
      ratingAvg: 4.8,
      ratingCount: 60,
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categoryName);
    if (!categoryId) continue;

    // Check if product with primary variant SKU exists
    const primarySku = item.variants[0].sku;
    await Product.findOneAndUpdate(
      { "variants.sku": primarySku },
      {
        $set: {
          name: item.name,
          categoryId,
          brand: item.brand,
          petType: item.petType,
          description: item.description,
          images: item.images,
          isActive: item.isActive,
          variants: item.variants,
          ratingAvg: item.ratingAvg,
          ratingCount: item.ratingCount,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  console.info(`Seeded ${productsData.length} products successfully!`);
  await disconnectDatabase();
  console.info("Database disconnected. Done.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
