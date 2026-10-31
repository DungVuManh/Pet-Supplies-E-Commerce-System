import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
const categoriesData = JSON.parse(readFileSync(new URL("./data/categories.json", import.meta.url), "utf8"));
const productsData = JSON.parse(readFileSync(new URL("./data/products.json", import.meta.url), "utf8"));
class SeedError extends Error {}

function sampleFailure(Model, error) {
  if (error instanceof SeedError) return error;
  const detail = error instanceof mongoose.Error.ValidationError
    ? `validation thất bại tại ${Object.keys(error.errors).join(", ")}`
    : Number.isInteger(error.code) ? `MongoDB code ${error.code}` : "không thể đọc hoặc ghi dữ liệu mẫu";
  return new SeedError(`Seed ${Model.modelName}: ${detail}.`);
}

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
    throw sampleFailure(Model, error);
  }
}

async function seedProduct(filter, data) {
  try {
    const product = await ensureSample(Product, filter, data);
    const changes = {};
    if (product.description !== data.description) changes.description = data.description;
    const variants = product.variants.map((variant, index) => {
      const source = data.variants.find((item) => item.sku === variant.sku);
      if (!source) return variant;
      if (source.stock < (variant.reservedStock ?? 0)) {
        throw new SeedError(`Seed Product: tồn kho mẫu của SKU ${variant.sku} nhỏ hơn reservedStock hiện tại; không cập nhật sản phẩm này.`);
      }
      if (variant.stock !== source.stock) changes[`variants.${index}.stock`] = source.stock;
      return { ...variant, stock: source.stock };
    });
    if (!Object.keys(changes).length && !Object.hasOwn(product, "soldCount")) return product;
    const updated = { ...product, description: data.description, variants };
    delete updated.soldCount;
    await new Product(updated).validate();
    const updatedAt = new Date();
    // Match the read snapshot so concurrent stock, reservation or content edits are not overwritten.
    const result = await Product.collection.updateOne({
      _id: product._id, description: product.description, variants: product.variants,
    }, { $set: { ...changes, updatedAt }, $unset: { soldCount: "" } });
    if (!result.matchedCount) throw new SeedError("Seed Product: sản phẩm đã thay đổi trong lúc seed; hãy kiểm tra và chạy lại.");
    return { ...updated, updatedAt };
  } catch (error) {
    throw sampleFailure(Product, error);
  }
}

export async function seedSampleData() {
  const users = {};
  for (const role of ["customer", "staff", "admin"]) {
    users[role] = await User.findOne({ role }).sort({ _id: 1 }).select("_id role").lean();
  }
  await createModelIndexes();
  const now = new Date();

  let customer = users.customer;
  if (!customer) {
    try {
      const doc = new User({
        _id: sampleId("user:seed:customer"),
        firebaseUid: "seed-customer-uid",
        email: "customer.seed@petjoy.test",
        fullName: "Khách hàng mẫu Petjoy",
        phone: "0900000000",
        role: "customer",
        termsAcceptedAt: now,
      });
      await doc.save();
      customer = doc.toObject();
      console.info("Đã tạo User mẫu vai trò customer.");
    } catch {
      customer = { _id: sampleId("user:seed:customer"), role: "customer" };
    }
  }

  let actor = users.staff || users.admin;
  if (!actor) {
    try {
      const doc = new User({
        _id: sampleId("user:seed:staff"),
        firebaseUid: "seed-staff-uid",
        email: "staff.seed@petjoy.test",
        fullName: "Nhân viên mẫu Petjoy",
        phone: "0911111111",
        role: "staff",
        termsAcceptedAt: now,
      });
      await doc.save();
      users.staff = doc.toObject();
      actor = users.staff;
      console.info("Đã tạo User mẫu vai trò staff.");
    } catch {
      users.staff = { _id: sampleId("user:seed:staff"), role: "staff" };
      actor = users.staff;
    }
  }

  console.info("Seeding categories...");
  const categoryMap = new Map();
  for (const category of categoriesData) {
    const doc = await ensureSample(Category, { slug: category.slug }, {
      _id: new mongoose.Types.ObjectId(category._id.$oid), name: category.name, slug: category.slug, isActive: true,
    });
    categoryMap.set(category._id.$oid, doc._id);
  }
  console.info(`Seeded ${categoryMap.size} categories.`);

  console.info("Seeding products...");
  const productMap = new Map();
  for (const item of productsData) {
    let categoryIds = [];
    if (Array.isArray(item.categoryIds)) {
      categoryIds = item.categoryIds.map((c) => categoryMap.get(c?.$oid || c)).filter(Boolean);
    } else if (item.categoryId) {
      const singleId = categoryMap.get(item.categoryId?.$oid || item.categoryId);
      if (singleId) categoryIds = [singleId];
    }
    const categoryId = categoryIds[0] || categoryMap.values().next().value;
    if (!categoryIds.length && categoryId) categoryIds = [categoryId];
    if (!categoryIds.length) throw new SeedError("Seed Product: không tìm thấy danh mục của sản phẩm mẫu.");
    const product = await seedProduct({ "variants.sku": item.variants[0].sku }, {
      name: item.name, categoryIds, categoryId, brand: item.brand,
      petType: item.petType === "both" ? "all" : item.petType,
      description: item.description, images: item.images, isActive: true,
      variants: item.variants, ratingAvg: item.ratingAvg, ratingCount: item.ratingCount ?? 0,
    });
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
    if (!product) return null;
    const variant = product.variants.find((variant) => variant.sku === sku);
    return { productId: product._id, variantSku: sku, name: product.name, unitPrice: variant.price, qty };
  }
  const allProducts = Array.from(productMap.values());
  const fallbackP1 = allProducts[0];
  const fallbackP2 = allProducts[1] || fallbackP1;
  const fallbackP3 = allProducts[2] || fallbackP1;
  const fallbackP4 = allProducts[3] || fallbackP1;

  const sku1 = productMap.has("GAN-001") ? "GAN-001" : fallbackP1.variants[0].sku;
  const sku2 = productMap.has("ROY-021") ? "ROY-021" : fallbackP2.variants[0].sku;
  const wish1 = productMap.has("INA-049") ? productMap.get("INA-049")._id : fallbackP3._id;
  const wish2 = productMap.has("ACR-046") ? productMap.get("ACR-046")._id : fallbackP4._id;

  const cartItems = [sku1, sku2].map((sku) => ({
    productId: productMap.get(sku)._id, variantSku: sku, quantity: 1,
  }));
  await ensureSample(Cart, { userId: customer._id }, { userId: customer._id, items: cartItems });
  await ensureSample(Cart, { guestToken: "seed-petly-guest-cart-v1" }, {
    guestToken: "seed-petly-guest-cart-v1", items: [cartItems[1] || cartItems[0]],
  });
  await ensureSample(Wishlist, { userId: customer._id }, {
    userId: customer._id, productIds: [wish1, wish2],
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

  const stages = ["pending", "confirmed", "processing", "shipping", "completed"];
  const examples = [
    { key: "pending", status: "pending", method: "COD", paid: "unpaid" },
    { key: "confirmed", status: "confirmed", method: "COD", paid: "unpaid" },
    { key: "processing", status: "processing", method: "ONLINE", paid: "paid" },
    { key: "shipping", status: "shipping", method: "ONLINE", paid: "paid" },
    { key: "completed", status: "completed", method: "ONLINE", paid: "paid" },
    { key: "cancelled", status: "cancelled", method: "ONLINE", paid: "failed" },
    { key: "guest", status: "pending", method: "ONLINE", paid: "pending", guest: true },
  ];
  if (users.staff) examples.push({ key: "offline", status: "completed", method: "COD", paid: "paid", offline: true });
  else console.info("Không có Staff: chỉ tạo đơn online; các collection vẫn được seed đầy đủ.");

  const orders = new Map();
  for (const example of examples) {
    const orderCode = `SEED-PETLY-${ownerKey}-${example.key}`.toUpperCase();
    const items = (example.status === "completed"
      ? [orderItem(sku1), orderItem(sku2)].filter(Boolean)
      : [orderItem(sku1)].filter(Boolean));
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
      ...(["shipping", "completed"].includes(example.status) && !example.offline
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

  // Reuse persisted purchases even when they still refer to the old catalog.
  const reviewItems = orders.get("completed").items.slice(0, 2);
  for (const [index, item] of reviewItems.entries()) {
    await ensureSample(Review, { _id: sampleId(`review:${ownerKey}:${item.variantSku}`) }, {
      userId: customer._id, productId: item.productId, rating: index === 0 ? 5 : 4,
      comment: "Dữ liệu mẫu: bé ăn ngon, đóng gói cẩn thận.", status: "published",
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
    Category: categoriesData.length, Product: new Set(productMap.values()).size, Setting: 1, Address: 2,
    PetProfile: 2, Cart: 2, Wishlist: 1, Promotion: 4, Order: orders.size,
    Payment: orders.size, Review: reviewItems.length, Notification: 3, AuditLog: 1,
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
