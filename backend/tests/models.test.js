import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { Address } from "../src/models/address.model.js";
import { Category } from "../src/models/category.model.js";
import { PetProfile } from "../src/models/pet-profile.model.js";
import { Product } from "../src/models/product.model.js";
import { Cart } from "../src/models/cart.model.js";
import { Wishlist } from "../src/models/wishlist.model.js";
import { Order } from "../src/models/order.model.js";
import { Payment } from "../src/models/payment.model.js";
import { Promotion } from "../src/models/promotion.model.js";
import { Review } from "../src/models/review.model.js";
import { Notification } from "../src/models/notification.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Setting } from "../src/models/setting.model.js";
import * as models from "../src/models/index.js";

const userId = new mongoose.Types.ObjectId();
const address = {
 recipientName: "Buyer", phone: "0901234567", province: "HCM",
 district: "District 1", ward: "Ward 1", street: "1 Test Street",
};
const productData = () => ({
 name: "Cat food", petType: "cat", categoryIds: [new mongoose.Types.ObjectId()],
 variants: [{ sku: "CAT-1", label: "1 kg", price: 100000, stock: 10 }],
});
const orderData = () => ({
 orderCode: "ORD-001", customerId: userId, shippingAddress: { ...address },
 items: [{ productId: new mongoose.Types.ObjectId(), variantSku: "CAT-1", name: "Cat food", unitPrice: 100000, qty: 2 }],
 subtotal: 200000, total: 200000, paymentMethod: "COD",
});

describe("account and catalog models", () => {
 it("validates saved addresses and requires all shipping details", async () => {
  const savedAddress = new Address({ userId, ...address });
  await expect(savedAddress.validate()).resolves.toBeUndefined();
  expect(savedAddress.isDefault).toBe(false);
  await expect(new Address({ userId, ...address, ward: " " }).validate()).rejects.toThrow();
 });

 it("indexes only default addresses for uniqueness per user", () => {
  expect(Address.schema.indexes()).toContainEqual([
   { userId: 1, isDefault: 1 },
   expect.objectContaining({ unique: true, partialFilterExpression: { isDefault: true } }),
  ]);
 });

 it("normalizes categories and stores pet profiles in the SRS collection", async () => {
  const category = new Category({ name: " Food ", slug: " FOOD " });
  await expect(category.validate()).resolves.toBeUndefined();
  expect(category.name).toBe("Food");
  expect(category.slug).toBe("food");
  const pet = new PetProfile({ userId, name: "Milo", species: "cat" });
  await expect(pet.validate()).resolves.toBeUndefined();
  expect(PetProfile.collection.name).toBe("petProfiles");
 });
});

describe("products and shopping models", () => {
 it("validates variants, VND prices, stock and reserved stock", async () => {
  const product = new Product(productData());
  await expect(product.validate()).resolves.toBeUndefined();
  expect(product.variants[0].reservedStock).toBe(0);
  for (const patch of [
   { price: -1 }, { price: 1.5 }, { price: Number.MAX_SAFE_INTEGER + 1 },
   { stock: -1 }, { stock: 1.5 }, { reservedStock: 11 }, { reservedStock: 0.5 },
  ]) {
   const data = productData();
   Object.assign(data.variants[0], patch);
   await expect(new Product(data).validate()).rejects.toThrow();
  }
 });

 it("requires variants and rejects duplicate SKUs inside a product", async () => {
  await expect(new Product({ ...productData(), variants: [] }).validate()).rejects.toThrow();
  const data = productData();
  data.variants.push({ ...data.variants[0] });
  await expect(new Product(data).validate()).rejects.toThrow("distinct SKUs");
 });

 it("supports multiple categoryIds and deduplicates them", async () => {
  const cat1 = new mongoose.Types.ObjectId();
  const cat2 = new mongoose.Types.ObjectId();
  const product = new Product({
   name: "Multi-cat food",
   petType: "cat",
   categoryIds: [cat1, cat2, cat1],
   variants: [{ sku: "MULTI-1", label: "1 kg", price: 50000, stock: 5 }],
  });
  await expect(product.validate()).resolves.toBeUndefined();
  expect(product.categoryIds).toHaveLength(2);
  expect(product.categoryIds[0].toString()).toBe(cat1.toString());
  expect(product.categoryIds[1].toString()).toBe(cat2.toString());

  await expect(new Product({
   name: "No-cat food",
   petType: "cat",
   categoryIds: [],
   variants: [{ sku: "NO-CAT-1", label: "1 kg", price: 50000, stock: 5 }],
  }).validate()).rejects.toThrow("at least one category");
 });

 it("requires exactly one cart owner and positive whole quantities", async () => {
  const item = { productId: new mongoose.Types.ObjectId(), variantSku: "CAT-1", quantity: 1 };
  for (const owner of [{ userId }, { guestToken: "guest-token" }]) {
   await expect(new Cart({ ...owner, items: [item] }).validate()).resolves.toBeUndefined();
  }
  for (const owner of [{}, { userId, guestToken: "guest-token" }]) {
   await expect(new Cart(owner).validate()).rejects.toThrow("either a user or a guest");
  }
  for (const quantity of [0, -1, 1.5]) {
   await expect(new Cart({ userId, items: [{ ...item, quantity }] }).validate()).rejects.toThrow();
  }
  await expect(new Cart({ userId, items: [null] }).validate()).rejects.toThrow("Cart items cannot be null");
 });

 it("allows empty customer wishlists", async () => {
  const wishlist = new Wishlist({ userId });
  await expect(wishlist.validate()).resolves.toBeUndefined();
  expect(wishlist.productIds).toHaveLength(0);
 });
});

describe("checkout models", () => {
 it("retains independent order/payment states and never defaults COD to paid", async () => {
  const order = new Order(orderData());
  await expect(order.validate()).resolves.toBeUndefined();
  expect(order.orderStatus).toBe("pending");
  expect(order.paymentStatus).toBe("unpaid");
  expect(order.items[0].unitPrice).toBe(100000);
  expect(order.shippingAddress.street).toBe(address.street);
  const onlineOrder = new Order({ ...orderData(), paymentMethod: "ONLINE" });
  await expect(onlineOrder.validate()).resolves.toBeUndefined();
  expect(onlineOrder.paymentStatus).toBe("pending");
 });

 it("requires guest contacts and an identified creator for offline orders", async () => {
  const data = { ...orderData(), customerId: undefined };
  await expect(new Order(data).validate()).rejects.toThrow("guestInfo");
  await expect(new Order({ ...data, guestInfo: { name: "Guest", phone: "0901234567" } }).validate()).resolves.toBeUndefined();
  await expect(new Order({ ...data, channel: "offline" }).validate()).rejects.toThrow("createdByStaffId");
  await expect(new Order({ ...data, channel: "offline", createdByStaffId: userId }).validate()).resolves.toBeUndefined();
 });

 it("rejects missing snapshots, invalid quantities and inconsistent order amounts", async () => {
  for (const patch of [
   { items: [] }, { items: null }, { items: [null] }, { shippingAddress: undefined }, { subtotal: 1 },
   { total: 1 }, { discount: 200001, total: 0 }, { total: 200000.5 },
   { orderStatus: "unknown" }, { paymentMethod: "CARD" },
  ]) {
   await expect(new Order({ ...orderData(), ...patch }).validate()).rejects.toThrow();
  }
  const data = orderData();
  data.items[0].qty = 1.5;
  data.subtotal = data.total = 150000;
  await expect(new Order(data).validate()).rejects.toThrow("qty");
 });

 it("allows manual shipping without tracking and timestamps status history", async () => {
  const data = { ...orderData(), orderStatus: "shipping" };
  await expect(new Order(data).validate()).resolves.toBeUndefined();
  await expect(new Order({ ...data, shipping: { carrier: "Shipper tự do" } }).validate()).resolves.toBeUndefined();
  await expect(new Order({ ...data, shipping: { trackingNumber: "x".repeat(101) } }).validate()).rejects.toThrow("trackingNumber");
  const order = new Order({
   ...data, shipping: { carrier: "Manual", trackingNumber: "TRACK-1" },
   statusHistory: [{ from: "processing", to: "shipping", by: userId }],
  });
  await expect(order.validate()).resolves.toBeUndefined();
  expect(order.statusHistory[0].at).toBeInstanceOf(Date);
 });

 it("allows uninitialized transaction references while rejecting invalid payment amounts", async () => {
  for (const method of ["COD", "ONLINE"]) {
   const payment = new Payment({ orderId: new mongoose.Types.ObjectId(), method, amount: 200000 });
   await expect(payment.validate()).resolves.toBeUndefined();
   expect(payment.status).toBe(method === "COD" ? "unpaid" : "pending");
   payment.amount = 0.5;
   await expect(payment.validate()).rejects.toThrow("amount");
  }
  expect(Payment.schema.indexes()).toContainEqual([
   { transactionRef: 1 },
   expect.objectContaining({ unique: true, partialFilterExpression: { transactionRef: { $type: "string" } } }),
  ]);
 });

 it("validates promotion dates, percentages and whole VND discounts", async () => {
  const data = { code: " sale ", type: "percent", value: 10, startAt: new Date("2026-01-01"), endAt: new Date("2026-12-31") };
  const promotion = new Promotion(data);
  await expect(promotion.validate()).resolves.toBeUndefined();
  expect(promotion.code).toBe("SALE");
  for (const patch of [
   { value: 0 }, { value: 101 }, { value: Infinity }, { endAt: data.startAt },
   { type: "fixed", value: 100.5 }, { minOrderAmount: -1 },
  ]) {
   await expect(new Promotion({ ...data, ...patch }).validate()).rejects.toThrow();
  }
  await expect(new Promotion({ ...data, type: "fixed", value: 10000 }).validate()).resolves.toBeUndefined();
 });
});

describe("supporting models", () => {
 it("only accepts whole star ratings between one and five", async () => {
  const data = { productId: new mongoose.Types.ObjectId(), userId, rating: 5 };
  const review = new Review(data);
  await expect(review.validate()).resolves.toBeUndefined();
  expect(review.status).toBe("published");
  for (const rating of [0, 6, 1.5]) {
   await expect(new Review({ ...data, rating }).validate()).rejects.toThrow("rating");
  }
 });

 it("supports customer notifications and guest order notification logs", async () => {
  const data = { type: "order_placed", channel: "email" };
  await expect(new Notification(data).validate()).rejects.toThrow("user or an order");
  for (const owner of [{ userId }, { orderId: new mongoose.Types.ObjectId() }]) {
   const notification = new Notification({ ...data, ...owner });
   await expect(notification.validate()).resolves.toBeUndefined();
   expect(notification.status).toBe("pending");
  }
  await expect(new Notification({ ...data, userId, status: "unknown" }).validate()).rejects.toThrow("status");
 });

 it("records audit actors, targets, timestamps and snapshots", async () => {
  const audit = new AuditLog({
   actorId: userId, action: "order.confirm",
   target: { collectionName: "orders", id: new mongoose.Types.ObjectId() },
   before: { orderStatus: "pending" }, after: { orderStatus: "confirmed" },
  });
  await expect(audit.validate()).resolves.toBeUndefined();
  expect(audit.at).toBeInstanceOf(Date);
  expect(audit.before.orderStatus).toBe("pending");
  expect(typeof audit.target.id).toBe("string");
  expect(AuditLog.collection.name).toBe("auditLogs");
  await expect(new AuditLog({ action: "order.confirm" }).validate()).rejects.toThrow();
 });

 it("provides singleton settings with the SRS defaults and validates counts/fees", async () => {
  const settings = new Setting();
  await expect(settings.validate()).resolves.toBeUndefined();
  expect(settings._id).toBe("global");
  expect(settings.lowStockThreshold).toBe(5);
  expect(settings.shippingFee).toBe(0);
  for (const patch of [{ _id: "other" }, { _id: null }, { lowStockThreshold: -1 }, { lowStockThreshold: 0.5 }, { shippingFee: 1.5 }]) {
   await expect(new Setting(patch).validate()).rejects.toThrow();
  }
 });

 it("exports all SRS models without changing Firebase users", () => {
  expect(Object.keys(models).sort()).toEqual([
   "Address", "AuditLog", "Cart", "Category", "Notification", "Order", "Payment",
   "PetProfile", "Product", "Promotion", "Review", "Setting", "User", "Wishlist",
  ]);
  expect(models.User.schema.path("firebaseUid").options.unique).toBe(true);
  expect(models.User.schema.path("passwordHash")).toBeUndefined();
  expect(models.User.schema.path("role").enumValues).toEqual(["customer", "staff", "admin"]);
  for (const model of Object.values(models)) {
   expect(model.schema.options.timestamps).toBe(true);
   expect(model.schema.options.bufferCommands).toBe(false);
  }
 });
});
