import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase, createModelIndexes } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";
import {
  User, Address, PetProfile, Category, Product, Cart, Order, Payment,
  Promotion, Review, Wishlist, Notification, AuditLog, Setting,
} from "../models/index.js";

const DAY = 24 * 60 * 60 * 1000;
class SeedError extends Error {}

function sampleId(key) {
  return new mongoose.Types.ObjectId(createHash("sha256").update("petly-seed-v1:" + key).digest("hex").slice(0, 24));
}

async function ensureSample(Model, filter, data) {
  try {
    const existing = await Model.findOne(filter).lean();
    if (existing) return existing;
    const now = new Date();
    const candidate = new Model({
      ...(filter._id ? { _id: filter._id } : {}), ...data,
      createdAt: data.createdAt || now, updatedAt: data.updatedAt || now,
    });
    // save() runs all validators in document context, including cross-field checks.
    await candidate.save({ timestamps: false });
    return candidate.toObject();
  } catch (error) {
    const detail = error instanceof mongoose.Error.ValidationError
      ? `validation thất bại tại ${Object.keys(error.errors).join(", ")}`
      : Number.isInteger(error.code) ? `MongoDB code ${error.code}` : "không thể đọc hoặc ghi dữ liệu mẫu";
    throw new SeedError(`Seed ${Model.modelName}: ${detail}.`);
  }
}

export async function seedSampleData() {
  const users = {};
  for (const role of ["customer", "staff", "admin"]) {
    users[role] = await User.findOne({ role }).sort({ _id: 1 }).select("_id role").lean();
  }
  const missing = [];
  if (!users.customer) missing.push("customer");
  if (!users.staff && !users.admin) missing.push("staff hoặc admin");
  if (missing.length) {
    throw new SeedError("Không ghi dữ liệu: thiếu User có role " + missing.join(", ") + ". Hãy tạo tài khoản trước; seed không tạo hoặc sửa User.");
  }
  await createModelIndexes();
  const customer = users.customer;
  const actor = users.staff || users.admin;
  const now = new Date();

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
    const doc = await ensureSample(Category, { slug: cat.slug }, cat);
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
    },
    {
      name: "Dây dắt đệm êm Petjoy",
      categoryName: "Phụ kiện",
      brand: "Petjoy",
      petType: "dog",
      description: "Dây dắt có tay cầm đệm êm chống đau tay, khóa kim loại chắc chắn phù hợp dắt thú cưng đi dạo.",
      images: ["/images/products/kong-ball.png"],
      isActive: true,
      variants: [
        { sku: "PL-L01", label: "1,5 m", price: 165000, stock: 0, reservedStock: 0 },
      ],
    },
    {
      name: "Bát ăn inox chống trượt",
      categoryName: "Phụ kiện",
      brand: "Petjoy",
      petType: "all",
      description: "Bát ăn inox cao cấp viền silicon chống trượt, dễ dàng vệ sinh sạch sẽ.",
      images: ["/images/products/kong-ball.png"],
      isActive: false, // Tạm ẩn để test filter trạng thái
      variants: [
        { sku: "PL-B01", label: "450 ml", price: 120000, stock: 24, reservedStock: 0 },
      ],
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
    },
  ];

  const productMap = new Map();
  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categoryName);
    if (!categoryId) throw new Error("Missing sample category");

    const primarySku = item.variants[0].sku;
    const product = await ensureSample(Product,
      { "variants.sku": primarySku },
      {
        name: item.name,
        categoryId,
        brand: item.brand,
        petType: item.petType,
        description: item.description,
        images: item.images,
        isActive: item.isActive,
        variants: item.variants,
        ratingAvg: primarySku === "RC-D02" ? 5 : primarySku === "RC-C02" ? 4 : 0,
        ratingCount: ["RC-D02", "RC-C02"].includes(primarySku) ? 1 : 0,
      }
    );
    for (const variant of product.variants) productMap.set(variant.sku, product);
  }

  const setting = await ensureSample(Setting, { _id: "global" }, { lowStockThreshold: 5, shippingFee: 30000 });
  const shippingAddress = {
    recipientName: "Khách hàng mẫu Petjoy", phone: "0900000000", province: "TP. Hồ Chí Minh",
    district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Đường Mẫu",
  };
  const ownerKey = String(customer._id);
  for (const [key, street] of [["home", shippingAddress.street], ["office", "456 Đường Mẫu"]]) {
    // Do not compete with an existing default address for this real account.
    await ensureSample(Address, { _id: sampleId(`address:${ownerKey}:${key}`) }, {
      userId: customer._id, ...shippingAddress, street, isDefault: false,
    });
  }
  for (const pet of [
    { name: "Milo (mẫu)", species: "dog", breed: "Poodle", age: 730 },
    { name: "Luna (mẫu)", species: "cat", breed: "Mèo Anh lông ngắn", age: 365 },
  ]) {
    await ensureSample(PetProfile, { _id: sampleId(`pet:${ownerKey}:${pet.species}`) }, {
      userId: customer._id, name: pet.name, species: pet.species, breed: pet.breed,
      dob: new Date(now.getTime() - pet.age * DAY),
    });
  }

  function orderItem(sku, qty = 1) {
    const product = productMap.get(sku);
    const variant = product.variants.find((variant) => variant.sku === sku);
    return { productId: product._id, variantSku: sku, name: product.name, unitPrice: variant.price, qty };
  }
  const cartItems = ["RC-D02", "RC-C02"].map((sku) => ({
    productId: productMap.get(sku)._id, variantSku: sku, quantity: 1,
  }));
  await ensureSample(Cart, { userId: customer._id }, { userId: customer._id, items: cartItems });
  await ensureSample(Cart, { guestToken: "seed-petly-guest-cart-v1" }, {
    guestToken: "seed-petly-guest-cart-v1", items: [cartItems[1]],
  });
  await ensureSample(Wishlist, { userId: customer._id }, {
    userId: customer._id, productIds: [productMap.get("KG-B01")._id, productMap.get("CB-L05")._id],
  });

  for (const promotion of [
    { code: "SEED-PETLY10", type: "percent", value: 10, minOrderAmount: 0, start: -7, end: 30, isActive: true },
    { code: "SEED-PETLY30K", type: "fixed", value: 30000, minOrderAmount: 500000, start: -7, end: 30, isActive: true },
    { code: "SEED-EXPIRED", type: "fixed", value: 50000, minOrderAmount: 600000, start: -60, end: -30, isActive: true },
    { code: "SEED-DISABLED", type: "percent", value: 5, minOrderAmount: 0, start: -7, end: 30, isActive: false },
  ]) {
    const { start, end, ...data } = promotion;
    await ensureSample(Promotion, { code: promotion.code }, {
      ...data, startAt: new Date(now.getTime() + start * DAY), endAt: new Date(now.getTime() + end * DAY),
    });
  }

  const stages = ["pending", "confirmed", "processing", "shipping", "delivered", "completed"];
  const examples = [
    { key: "pending", status: "pending", method: "COD", paid: "unpaid" },
    { key: "confirmed", status: "confirmed", method: "COD", paid: "unpaid" },
    { key: "processing", status: "processing", method: "ONLINE", paid: "paid" },
    { key: "shipping", status: "shipping", method: "ONLINE", paid: "paid" },
    { key: "delivered", status: "delivered", method: "COD", paid: "paid" },
    { key: "completed", status: "completed", method: "ONLINE", paid: "paid" },
    { key: "cancelled", status: "cancelled", method: "ONLINE", paid: "failed" },
    { key: "guest", status: "pending", method: "ONLINE", paid: "pending", guest: true },
  ];
  if (users.staff) examples.push({ key: "offline", status: "completed", method: "COD", paid: "paid", offline: true });
  else console.info("Không có Staff: chỉ tạo đơn online; các collection vẫn được seed đầy đủ.");

  const orders = new Map();
  for (const example of examples) {
    const orderCode = `SEED-PETLY-${ownerKey}-${example.key}`.toUpperCase();
    const items = example.status === "completed" ? [orderItem("RC-D02"), orderItem("RC-C02")] : [orderItem("RC-D02")];
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const discount = example.key === "completed" ? Math.floor(subtotal * 10 / 100) : 0;
    const shippingFee = example.offline ? 0 : setting.shippingFee;
    const history = example.offline ? ["pending", "confirmed", "processing", "completed"]
      : example.status === "cancelled" ? ["pending", "cancelled"] : stages.slice(0, stages.indexOf(example.status) + 1);
    const statusHistory = history.map((to, index) => ({
      ...(index ? { from: history[index - 1] } : {}), to,
      ...(index && users.staff ? { by: users.staff._id } : {}),
      at: new Date(now.getTime() - (history.length - index) * DAY),
    }));
    const order = await ensureSample(Order, { orderCode }, {
      orderCode,
      ...(example.guest ? { guestInfo: { name: "Khách vãng lai mẫu", phone: "0900000000", email: "guest@example.test" } }
        : { customerId: customer._id }),
      items, shippingAddress, subtotal, discount, shippingFee, total: subtotal - discount + shippingFee,
      ...(discount ? { promotionCode: "SEED-PETLY10" } : {}),
      paymentMethod: example.method, paymentStatus: example.paid, orderStatus: example.status,
      channel: example.offline ? "offline" : "online",
      ...(example.offline ? { createdByStaffId: users.staff._id } : {}),
      ...(["shipping", "delivered", "completed"].includes(example.status) && !example.offline
        ? { shipping: { carrier: "Đơn vị giao hàng mẫu", trackingNumber: `TEST-${example.key.toUpperCase()}` } } : {}),
      statusHistory, createdAt: statusHistory[0].at, updatedAt: statusHistory.at(-1).at,
    });
    orders.set(example.key, order);
    // Use the persisted snapshot so a rerun cannot disagree with a previously seeded order.
    await ensureSample(Payment, { _id: sampleId(`payment:${order._id}`) }, {
      orderId: order._id, method: order.paymentMethod, amount: order.total, status: order.paymentStatus,
      ...(order.paymentMethod === "ONLINE" ? {
        transactionRef: `TEST-${order.orderCode}`, qrPayload: `TEST-ONLY:${order.orderCode}:${order.total}`,
        rawResult: { source: "seed", simulated: true, status: order.paymentStatus },
      } : {}),
    });
  }

  for (const [sku, rating, comment] of [
    ["RC-D02", 5, "Dữ liệu mẫu: bé ăn ngon, đóng gói cẩn thận."],
    ["RC-C02", 4, "Dữ liệu mẫu: sản phẩm phù hợp cho mèo sống trong nhà."],
  ]) {
    await ensureSample(Review, { _id: sampleId(`review:${ownerKey}:${sku}`) }, {
      userId: customer._id, productId: productMap.get(sku)._id, rating, comment, status: "published",
    });
  }
  for (const [status, orderKey] of [["sent", "completed"], ["pending", "pending"], ["failed", "cancelled"]]) {
    await ensureSample(Notification, { _id: sampleId(`notification:${ownerKey}:${status}`) }, {
      userId: customer._id, orderId: orders.get(orderKey)._id, type: "order_update", channel: "email", status,
      ...(status === "sent" ? { sentAt: now } : {}),
      ...(status === "failed" ? { error: "Lỗi gửi thông báo mô phỏng, không gọi dịch vụ email." } : {}),
    });
  }
  await ensureSample(AuditLog, { _id: sampleId(`audit:${ownerKey}`) }, {
    actorId: actor._id, action: "seed.sample-data",
    target: { collectionName: "orders", id: String(orders.get("completed")._id) },
    after: { source: "seed", simulated: true, orderStatus: "completed" }, at: now,
  });

  const counts = {
    Category: categoriesData.length, Product: productsData.length, Setting: 1, Address: 2,
    PetProfile: 2, Cart: 2, Wishlist: 1, Promotion: 4, Order: orders.size,
    Payment: orders.size, Review: 2, Notification: 3, AuditLog: 1,
  };
  for (const [model, count] of Object.entries(counts)) console.info(`${model}: đã bảo đảm ${count} bản ghi mẫu (tạo mới hoặc dùng lại).`);
  return counts;
}

export async function seed() {
  const config = loadEnvironment();
  if (config.NODE_ENV === "production") throw new SeedError("Seed chỉ dành cho development/test, không chạy trong production.");
  try {
    await connectDatabase(config.MONGODB_URI);
    return await seedSampleData();
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seed().catch((error) => {
    console.error(error instanceof SeedError ? error.message : "Seed thất bại; kiểm tra MongoDB, schema và khóa dữ liệu mẫu.");
    process.exitCode = 1;
  });
}
