import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as models from "../src/models/index.js";
import * as database from "../src/config/database.js";
import * as environment from "../src/config/env.js";
import { seed, seedSampleData } from "../src/scripts/seed.js";

const sampleModels = Object.values(models).filter((Model) => Model !== models.User);
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
      path === "variants.sku" ? doc.variants.some((variant) => variant.sku === value) : String(doc[path]) === String(value)));
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
  }
});
afterEach(() => vi.restoreAllMocks());

describe("sample data seed", () => {
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
    expect(new Set([...orders.values()].map((order) => order.orderStatus)).size).toBe(7);
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
  });

  it("preserves existing catalog data, customer carts, wishlists and global settings", async () => {
    const product = new models.Product({
      name: "Sản phẩm đã chỉnh sửa", petType: "dog", categoryId: new mongoose.Types.ObjectId(),
      variants: [{ sku: "RC-D02", label: "2 kg", price: 123456, stock: 3 }],
    }).toObject();
    const cart = new models.Cart({ userId: users.customer._id, items: [] }).toObject();
    const wishlist = new models.Wishlist({ userId: users.customer._id, productIds: [] }).toObject();
    const setting = new models.Setting({ shippingFee: 15000, lowStockThreshold: 9 }).toObject();
    stored.set(key(models.Product, { "variants.sku": "RC-D02" }), product);
    stored.set(key(models.Cart, { userId: users.customer._id }), cart);
    stored.set(key(models.Wishlist, { userId: users.customer._id }), wishlist);
    stored.set(key(models.Setting, { _id: "global" }), setting);
    await seedSampleData();
    expect(documents(models.Product)).toContain(product);
    expect(documents(models.Cart)).toContain(cart);
    expect(documents(models.Wishlist)).toContain(wishlist);
    expect(documents(models.Setting)).toContain(setting);
    for (const order of documents(models.Order)) {
      expect(order.items.find((item) => item.variantSku === "RC-D02").unitPrice).toBe(123456);
      if (order.channel === "online") expect(order.shippingFee).toBe(15000);
    }
  });

  it.each(["all", "customer", "operators"])("stops before indexes or writes when missing %s users", async (missing) => {
    if (["all", "customer"].includes(missing)) users.customer = null;
    if (["all", "operators"].includes(missing)) { users.staff = null; users.admin = null; }
    await expect(seedSampleData()).rejects.toThrow(/thiếu User có role/);
    expect(database.createModelIndexes).not.toHaveBeenCalled();
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
