import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as models from "../src/models/index.js";
import * as database from "../src/config/database.js";
import * as environment from "../src/config/env.js";
import { seed, seedSampleData } from "../src/scripts/seed.js";

// Admin-only models get their sample data from seed-admin.js instead.
const sampleModels = Object.values(models).filter((Model) => ![models.User, models.AdminNotification].includes(Model));
const sourceProducts = JSON.parse(readFileSync(new URL("../src/scripts/data/products.json", import.meta.url), "utf8"));
const key = (Model, filter) => `${Model.modelName}:${JSON.stringify(filter)}`;
let users, stored;
const documents = (Model) => [...stored.entries()].filter(([id]) => id.startsWith(`${Model.modelName}:`)).map(([, value]) => value);

beforeEach(() => {
  stored = new Map();
  users = Object.fromEntries(["customer", "staff", "admin"].map((role) => [role, { _id: new mongoose.Types.ObjectId(), role }]));
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(database, "createModelIndexes").mockResolvedValue();
  vi.spyOn(database, "connectDatabase").mockResolvedValue();
  vi.spyOn(database, "disconnectDatabase").mockResolvedValue();
  vi.spyOn(environment, "loadEnvironment").mockReturnValue({ NODE_ENV: "test", MONGODB_URI: "mongodb://localhost/seed-test" });
  vi.spyOn(models.User, "findOne").mockImplementation(({ role }) => ({
    sort: () => ({ select: () => ({ lean: async () => users[role] }) }),
  }));
  for (const operation of ["create", "insertMany", "updateOne", "findOneAndUpdate", "deleteMany"]) {
    vi.spyOn(models.User, operation).mockImplementation(() => { throw new Error("User writes are forbidden"); });
  }
  vi.spyOn(models.User.collection, "insertOne").mockImplementation(() => { throw new Error("User inserts are forbidden"); });
  for (const Model of sampleModels) {
    const find = (filter) => documents(Model).find((doc) => Object.entries(filter).every(([path, value]) =>
      path === "variants.sku" ? doc.variants.some((variant) => variant.sku === value)
        : path === "variants" ? JSON.stringify(doc.variants) === JSON.stringify(value) : String(doc[path]) === String(value)));
    // Keep real Mongoose queries/save middleware; mock only the database boundary.
    vi.spyOn(Model.collection, "findOne").mockImplementation(async (filter) => find(filter) || null);
    vi.spyOn(Model.collection, "insertOne").mockImplementation(async (doc) => {
      stored.set(key(Model, { _id: doc._id }), doc);
      return { acknowledged: true, insertedId: doc._id };
    });
    vi.spyOn(Model.collection, "findOneAndUpdate").mockImplementation(async (filter, update) => {
      const existing = find(filter);
      if (existing) return existing;
      stored.set(key(Model, { _id: update.$setOnInsert._id }), update.$setOnInsert);
      return update.$setOnInsert;
    });
    if (Model === models.Product) {
      vi.spyOn(Model.collection, "updateOne").mockImplementation(async (filter, update) => {
        const existing = find(filter);
        if (!existing) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
        for (const [path, value] of Object.entries(update.$set || {})) {
          const parts = path.split(".");
          const field = parts.pop();
          const target = parts.reduce((object, part) => object[part], existing);
          target[field] = value;
        }
        for (const field of Object.keys(update.$unset || {})) delete existing[field];
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      });
    }
  }
});
afterEach(() => vi.restoreAllMocks());

describe("sample data seed", () => {
  it("seeds the 52 described products with fixed 1-50 stock, no soldCount and the requested ten categories", async () => {
    const counts = await seedSampleData();
    expect(counts).toMatchObject({ Category: 10, Product: 52 });
    expect(new Set(sourceProducts.map((product) => product.description)).size).toBe(52);
    const products = documents(models.Product);
    const categories = documents(models.Category);
    expect(categories.map((category) => [category.name, products.filter((product) =>
      String(product.categoryId) === String(category._id)).length])).toEqual([
      ["Dành cho chó", 20], ["Dành cho mèo", 28], ["Dây dắt, phụ kiện", 0], ["Quần áo", 0],
      ["Bát bình chứa đựng", 0], ["Đồ vận chuyển, nuôi nhốt", 0], ["Sữa tắm, Khử mùi", 0],
      ["Hỗ trợ chăm sóc", 0], ["Bổ sung dinh dưỡng", 2], ["Thú Y", 2],
    ]);
    for (const source of sourceProducts) {
      expect(source.description.trim()).not.toBe("");
      expect(Object.hasOwn(source, "soldCount")).toBe(false);
      for (const variant of source.variants) {
        expect(Number.isSafeInteger(variant.stock)).toBe(true);
        expect(variant.stock).toBeGreaterThanOrEqual(1);
        expect(variant.stock).toBeLessThanOrEqual(50);
      }
      const product = products.find((item) => item.variants[0].sku === source.variants[0].sku);
      expect(product).toMatchObject({ name: source.name, brand: source.brand, description: source.description,
        images: source.images, variants: source.variants, ratingAvg: source.ratingAvg });
      expect(String(product.categoryId)).toBe(source.categoryId.$oid);
      expect(Object.hasOwn(product, "soldCount")).toBe(false);
    }
    expect(products.find((product) => product.variants[0].sku === "BIO-044").petType).toBe("all");
    expect(products.find((product) => product.variants[0].sku === "ROY-009").ratingCount).toBe(0);
  });

  it("uses an existing category's actual ID without overwriting its metadata", async () => {
    const category = new models.Category({ name: "Danh mục đã chỉnh sửa", slug: "danh-cho-meo", isActive: false }).toObject();
    stored.set(key(models.Category, { _id: category._id }), category);
    await seedSampleData();
    expect(documents(models.Category)).toHaveLength(10);
    expect(documents(models.Category)).toContain(category);
    expect(documents(models.Product).filter((product) => String(product.categoryId) === String(category._id))).toHaveLength(28);
  });

  it("seeds every non-User model with schema-valid documents and real references", async () => {
    const counts = await seedSampleData();
    expect(Object.keys(counts).sort()).toEqual(sampleModels.map((Model) => Model.modelName).sort());
    for (const Model of sampleModels) {
      expect(documents(Model)).toHaveLength(counts[Model.modelName]);
      for (const data of documents(Model)) await expect(new Model(data).validate()).resolves.toBeUndefined();
    }
    for (const operation of ["create", "insertMany", "updateOne", "findOneAndUpdate", "deleteMany"]) {
      expect(models.User[operation]).not.toHaveBeenCalled();
    }
    expect(models.User.collection.insertOne).not.toHaveBeenCalled();
    const userIds = new Set(Object.values(users).map((user) => String(user._id)));
    const productIds = new Set(documents(models.Product).map((product) => String(product._id)));
    const categoryIds = new Set(documents(models.Category).map((category) => String(category._id)));
    const orders = new Map(documents(models.Order).map((order) => [String(order._id), order]));
    const products = new Map(documents(models.Product).map((product) => [String(product._id), product]));
    for (const Model of sampleModels) {
      for (const doc of documents(Model)) {
        for (const field of ["userId", "customerId", "createdByStaffId", "actorId"]) {
          if (doc[field]) expect(userIds.has(String(doc[field]))).toBe(true);
        }
        if (doc.productId) expect(productIds.has(String(doc.productId))).toBe(true);
        if (doc.orderId) expect(orders.has(String(doc.orderId))).toBe(true);
        for (const id of doc.productIds || []) expect(productIds.has(String(id))).toBe(true);
        for (const item of doc.items || []) {
          const product = products.get(String(item.productId));
          expect(product).toBeDefined();
          expect(product.variants.some((variant) => variant.sku === item.variantSku)).toBe(true);
        }
      }
    }
    for (const product of products.values()) expect(categoryIds.has(String(product.categoryId))).toBe(true);
    expect(new Set([...orders.values()].map((order) => order.orderStatus)).size).toBe(6);
    expect([...orders.values()].some((order) => order.guestInfo && !order.customerId)).toBe(true);
    expect([...orders.values()].find((order) => order.channel === "offline").createdByStaffId).toEqual(users.staff._id);
    for (const payment of documents(models.Payment)) {
      const order = orders.get(String(payment.orderId));
      expect(payment.amount).toBe(order.total);
      expect(payment.method).toBe(order.paymentMethod);
      expect(payment.status).toBe(order.paymentStatus);
    }
    const completed = [...orders.values()].filter((order) => order.orderStatus === "completed");
    for (const review of documents(models.Review)) {
      expect(completed.some((order) => String(order.customerId) === String(review.userId)
        && order.items.some((item) => String(item.productId) === String(review.productId)))).toBe(true);
    }
    const audit = documents(models.AuditLog)[0];
    expect(audit.target.collectionName).toBe("orders");
    expect(orders.has(audit.target.id)).toBe(true);
  });

  it("can run twice without duplicates, changed snapshots or timestamp updates", async () => {
    await seedSampleData();
    const before = JSON.stringify([...stored]);
    const insertsBefore = sampleModels.map((Model) => Model.collection.insertOne.mock.calls.length);
    await seedSampleData();
    expect(JSON.stringify([...stored])).toBe(before);
    expect(sampleModels.map((Model) => Model.collection.insertOne.mock.calls.length)).toEqual(insertsBefore);
    expect(models.Product.collection.updateOne).not.toHaveBeenCalled();
  });

  it("syncs only catalog descriptions/stock and removes soldCount while preserving prices, reservations and customer data", async () => {
    const source = sourceProducts.find((product) => product.variants[0].sku === "GAN-001");
    const product = new models.Product({
      name: "Sản phẩm đã chỉnh sửa", description: "Mô tả cũ", petType: "dog", isActive: false,
      categoryId: new mongoose.Types.ObjectId(),
      variants: [
        { sku: "GAN-001", label: "2 kg", price: 123456, stock: 60, reservedStock: source.variants[0].stock },
        { sku: "CUSTOM-SKU", label: "Biến thể riêng", price: 90000, stock: 70, reservedStock: 5 },
      ],
    }).toObject();
    product.soldCount = 1234;
    const originalCategoryId = String(product.categoryId);
    const originalCustomVariant = structuredClone(product.variants[1]);
    const cart = new models.Cart({ userId: users.customer._id, items: [] }).toObject();
    const wishlist = new models.Wishlist({ userId: users.customer._id, productIds: [] }).toObject();
    const setting = new models.Setting({ shippingFee: 15000, lowStockThreshold: 9 }).toObject();
    stored.set(key(models.Product, { "variants.sku": "GAN-001" }), product);
    stored.set(key(models.Cart, { userId: users.customer._id }), cart);
    stored.set(key(models.Wishlist, { userId: users.customer._id }), wishlist);
    stored.set(key(models.Setting, { _id: "global" }), setting);
    await seedSampleData();
    expect(documents(models.Product)).toContain(product);
    expect(product.description).toBe(source.description);
    expect(product.variants[0]).toEqual({ sku: "GAN-001", label: "2 kg", price: 123456,
      stock: source.variants[0].stock, reservedStock: source.variants[0].stock });
    expect(product.variants[1]).toEqual(originalCustomVariant);
    expect(product.name).toBe("Sản phẩm đã chỉnh sửa");
    expect(product.isActive).toBe(false);
    expect(String(product.categoryId)).toBe(originalCategoryId);
    expect(Object.hasOwn(product, "soldCount")).toBe(false);
    expect(documents(models.Cart)).toContain(cart);
    expect(documents(models.Wishlist)).toContain(wishlist);
    expect(documents(models.Setting)).toContain(setting);
    for (const order of documents(models.Order)) {
      expect(order.items.find((item) => item.variantSku === "GAN-001").unitPrice).toBe(123456);
      if (order.channel === "online") expect(order.shippingFee).toBe(15000);
    }
  });

  it("leaves products outside the 52 seed SKUs unchanged", async () => {
    const product = new models.Product({ name: "Sản phẩm riêng", description: "Mô tả riêng", petType: "dog",
      categoryId: new mongoose.Types.ObjectId(), variants: [{ sku: "NOT-IN-SEED", label: "1 kg", price: 100000, stock: 90 }],
    }).toObject();
    product.soldCount = 99;
    stored.set(key(models.Product, { _id: product._id }), product);
    const before = JSON.stringify(product);
    await seedSampleData();
    expect(JSON.stringify(product)).toBe(before);
  });

  it("does not lower physical stock below existing reservations", async () => {
    const source = sourceProducts[0];
    const product = new models.Product({ name: source.name, description: "Mô tả đang sử dụng", petType: "dog",
      categoryId: new mongoose.Types.ObjectId(), variants: [{ ...source.variants[0], stock: 100, reservedStock: source.variants[0].stock + 1 }],
    }).toObject();
    stored.set(key(models.Product, { _id: product._id }), product);
    const before = JSON.stringify(product);
    await expect(seedSampleData()).rejects.toThrow(/GAN-001.*reservedStock/);
    expect(JSON.stringify(product)).toBe(before);
    expect(models.Product.collection.updateOne).not.toHaveBeenCalled();
  });

  it("rejects a stale product snapshot without overwriting a concurrent edit", async () => {
    const source = sourceProducts[0];
    const product = new models.Product({ name: source.name, description: "Mô tả cũ", petType: "dog",
      categoryId: new mongoose.Types.ObjectId(), variants: source.variants,
    }).toObject();
    stored.set(key(models.Product, { _id: product._id }), product);
    const before = JSON.stringify(product);
    models.Product.collection.updateOne.mockResolvedValueOnce({ acknowledged: true, matchedCount: 0, modifiedCount: 0 });
    await expect(seedSampleData()).rejects.toThrow(/sản phẩm đã thay đổi/);
    expect(JSON.stringify(product)).toBe(before);
    expect(models.Product.collection.updateOne.mock.calls[0][0]).toEqual({
      _id: product._id, description: product.description, variants: product.variants,
    });
  });

  it.each(["all", "customer", "operators"])("stops before indexes or writes when missing %s users", async (missing) => {
    if (["all", "customer"].includes(missing)) users.customer = null;
    if (["all", "operators"].includes(missing)) { users.staff = null; users.admin = null; }
    await expect(seedSampleData()).rejects.toThrow(/thiếu User có role/);
    expect(database.createModelIndexes).not.toHaveBeenCalled();
    expect(models.Product.collection.updateOne).not.toHaveBeenCalled();
    for (const Model of sampleModels) {
      expect(Model.collection.insertOne).not.toHaveBeenCalled();
      expect(Model.collection.findOneAndUpdate).not.toHaveBeenCalled();
    }
  });

  it("supports a customer and admin without inventing a Staff or offline creator", async () => {
    users.staff = null;
    const counts = await seedSampleData();
    expect(Object.keys(counts)).toHaveLength(13);
    expect(documents(models.Order).every((order) => order.channel === "online")).toBe(true);
    expect(documents(models.AuditLog)[0].actorId).toEqual(users.admin._id);
  });

  it("supports a customer and staff without requiring an admin", async () => {
    users.admin = null;
    await seedSampleData();
    expect(documents(models.AuditLog)[0].actorId).toEqual(users.staff._id);
  });

  it("persists valid promotions through real Mongoose validators and rejects reversed dates", async () => {
    await seedSampleData();
    expect(documents(models.Promotion)).toHaveLength(4);
    models.Promotion.collection.insertOne.mockClear();
    const invalid = new models.Promotion({
      code: "INVALID-DATES", type: "percent", value: 10,
      startAt: new Date("2026-11-01"), endAt: new Date("2026-10-01"),
    });
    await expect(invalid.save()).rejects.toThrow("End must follow start");
    expect(models.Promotion.collection.insertOne).not.toHaveBeenCalled();
  });
});

describe("seed lifecycle", () => {
  it("does not connect just by importing and disconnects after a successful run", async () => {
    expect(database.connectDatabase).not.toHaveBeenCalled();
    await seed();
    expect(database.connectDatabase).toHaveBeenCalledWith("mongodb://localhost/seed-test");
    expect(database.disconnectDatabase).toHaveBeenCalledOnce();
  });

  it("disconnects when prerequisites or a write fail", async () => {
    users.customer = null;
    await expect(seed()).rejects.toThrow(/thiếu User/);
    expect(database.disconnectDatabase).toHaveBeenCalledOnce();
    users.customer = { _id: new mongoose.Types.ObjectId(), role: "customer" };
    models.Category.collection.insertOne.mockRejectedValueOnce(Object.assign(new Error("mongodb://private-credentials"), { code: 11000 }));
    await expect(seed()).rejects.toThrow("Seed Category: MongoDB code 11000.");
    expect(database.disconnectDatabase).toHaveBeenCalledTimes(2);
  });

  it("identifies validation paths without exposing raw messages or credentials", async () => {
    const error = new mongoose.Error.ValidationError();
    error.addError("slug", new mongoose.Error.ValidatorError({ path: "slug", message: "mongodb://private-credentials" }));
    models.Category.collection.insertOne.mockRejectedValueOnce(error);
    await expect(seedSampleData()).rejects.toThrow("Seed Category: validation thất bại tại slug.");
  });

  it("does not seed production databases", async () => {
    environment.loadEnvironment.mockReturnValue({ NODE_ENV: "production" });
    await expect(seed()).rejects.toThrow(/production/);
    expect(database.connectDatabase).not.toHaveBeenCalled();
  });
});
