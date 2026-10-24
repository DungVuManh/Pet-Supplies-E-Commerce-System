import { randomBytes } from "node:crypto";
import { AppError } from "../common/errors/app-error.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { literalRegex, parseLookup, parseRequestId, parseSale, saleHash } from "../validators/staff-sale.validator.js";

const PAGE_SIZE = 10;
function unavailable(error) {
 if (error instanceof AppError) return error;
 return new AppError("Chưa thể xác nhận kết quả tạo đơn. Hãy thử lại cùng yêu cầu.", 503, "ORDERS_UNAVAILABLE");
}
function receipt(order) {
 return { id: String(order._id), orderCode: order.orderCode, total: order.total,
  channel: order.channel, orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod };
}
async function existingRequest(actorId, requestId) {
 return Order.findOne({ createdByStaffId: actorId, creationRequestId: requestId })
  .select("_id orderCode total channel orderStatus paymentStatus paymentMethod creationState +creationRequestHash").lean();
}
function completedReceipt(order) {
 if (order.creationState && order.creationState !== "complete") {
  throw new AppError("Đơn đang xử lý hoặc cần kiểm tra. Hãy tra cứu lại cùng yêu cầu.", 503, "ORDERS_UNAVAILABLE");
 }
 return receipt(order);
}
function checkReplay(order, hash) {
 if (order.creationRequestHash !== hash) {
  throw new AppError("Yêu cầu này đã được dùng cho một đơn khác. Hãy kiểm tra đơn vừa tạo.", 409, "IDEMPOTENCY_CONFLICT");
 }
 return completedReceipt(order);
}

export async function listSaleCustomers(request, response) {
 const { query, page } = parseLookup(request.query, true);
 const regex = literalRegex(query);
 try {
  const rows = await User.find({ role: "customer", $or: [
   { fullName: regex }, { phone: regex }, { email: regex },
  ] }).select("_id fullName phone email").sort({ fullName: 1, _id: 1 })
   .skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE + 1).lean();
  response.json({ success: true, data: { page, hasMore: rows.length > PAGE_SIZE,
   items: rows.slice(0, PAGE_SIZE).map((u) => ({ id: String(u._id),
    fullName: u.fullName, phone: u.phone, email: u.email })) } });
 } catch { throw new AppError("Chưa thể tìm khách hàng. Vui lòng thử lại.", 503, "CUSTOMERS_UNAVAILABLE"); }
}

export async function listSaleProducts(request, response) {
 const { query, page } = parseLookup(request.query);
 const regex = literalRegex(query);
 try {
  const rows = await Product.aggregate([
   { $match: { isActive: true } }, { $unwind: "$variants" },
   { $match: { $expr: { $gt: ["$variants.stock", "$variants.reservedStock"] },
    $or: [{ name: regex }, { "variants.sku": regex }, { brand: regex }] } },
   { $sort: { name: 1, _id: 1, "variants.sku": 1 } },
   { $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE + 1 },
   { $project: { _id: 0, productId: { $toString: "$_id" }, name: 1,
    sku: "$variants.sku", variantLabel: "$variants.label", price: "$variants.price",
    availableStock: { $subtract: ["$variants.stock", "$variants.reservedStock"] } } },
  ]);
  response.json({ success: true, data: { page, hasMore: rows.length > PAGE_SIZE,
   items: rows.slice(0, PAGE_SIZE) } });
 } catch { throw new AppError("Chưa thể tìm sản phẩm. Vui lòng thử lại.", 503, "PRODUCTS_UNAVAILABLE"); }
}

export async function getSaleCreation(request, response) {
 const requestId = parseRequestId(request.params.requestId);
 let found;
 try { found = await existingRequest(request.user._id, requestId); }
 catch (error) { throw unavailable(error); }
 if (!found) throw new AppError("Chưa tìm thấy đơn của yêu cầu này.", 404, "CREATION_NOT_FOUND");
 response.json({ success: true, data: { order: completedReceipt(found) } });
}

async function saveSale(input, actorId, requestId, hash) {
 const skus = input.items.map((i) => i.sku);
 const products = await Product.find({ isActive: true, "variants.sku": { $in: skus } })
  .select("_id name variants").lean();
 let contact = input.customer;
 if (input.customerId) {
  const user = await User.findOne({ _id: input.customerId, role: "customer" })
   .select("fullName phone email").lean();
  if (!user) throw new AppError("Khách hàng không còn khả dụng. Hãy chọn lại.", 404, "CUSTOMER_NOT_FOUND");
  contact = { name: user.fullName, phone: user.phone, email: user.email };
 }
 const items = [];
 let subtotal = 0;
 for (const requested of input.items) {
  const product = products.find((p) => p.variants.some((v) => v.sku === requested.sku));
  const variant = product?.variants.find((v) => v.sku === requested.sku);
  if (!variant) throw new AppError("Sản phẩm không còn được bán. Hãy chọn lại.", 409, "CATALOG_CHANGED");
  if (![variant.price, variant.stock, variant.reservedStock].every((n) => Number.isSafeInteger(n) && n >= 0)
   || variant.reservedStock > variant.stock) throw new AppError("Dữ liệu sản phẩm chưa hợp lệ.", 503, "ORDERS_UNAVAILABLE");
  if (variant.price !== requested.expectedPrice) throw new AppError("Giá sản phẩm đã thay đổi. Hãy xóa và chọn lại sản phẩm.", 409, "CATALOG_CHANGED");
  if (variant.stock - variant.reservedStock < requested.qty) throw new AppError("Số lượng còn lại không đủ. Hãy kiểm tra lại sản phẩm.", 409, "OUT_OF_STOCK");
  subtotal += variant.price * requested.qty;
  if (!Number.isSafeInteger(subtotal)) throw new AppError("Tổng tiền vượt giới hạn cho phép.", 400, "VALIDATION_ERROR");
  items.push({ productId: product._id, variantSku: variant.sku,
   name: product.name, unitPrice: variant.price, qty: requested.qty });
 }
 const now = new Date();
 const order = new Order({ orderCode: `POS-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(8).toString("hex").toUpperCase()}`,
  ...(input.customerId ? { customerId: input.customerId } : {}), guestInfo: contact,
  items, subtotal, total: subtotal, discount: 0, shippingFee: 0,
  channel: "offline", orderStatus: "completed", paymentMethod: "CASH", paymentStatus: "paid",
  createdByStaffId: actorId, creationRequestId: requestId, creationRequestHash: hash, creationState: "pending",
  statusHistory: [{ to: "completed", by: actorId, at: now }],
 });
 // Claim the unique request key before any stock/payment writes, including across processes.
 await order.save();
 const payment = new Payment({ orderId: order._id, method: "CASH", amount: subtotal, status: "paid" });
 const audit = new AuditLog({ actorId, action: "order.create.offline",
  target: { collectionName: "orders", id: String(order._id) }, at: now,
  after: { orderCode: order.orderCode, total: subtotal, channel: "offline" },
 });
 const deducted = [];
 let stockWriteUncertain = false;
 try {
  for (const item of items) {
   const variant = products.find((p) => String(p._id) === String(item.productId))
    .variants.find((v) => v.sku === item.variantSku);
   stockWriteUncertain = true;
   const updated = await Product.updateOne({ _id: item.productId, isActive: true,
    variants: { $elemMatch: { sku: item.variantSku, price: item.unitPrice,
     stock: { $gte: item.qty + variant.reservedStock }, reservedStock: variant.reservedStock } },
   }, { $inc: { "variants.$.stock": -item.qty } });
   stockWriteUncertain = false;
   if (updated.modifiedCount !== 1) throw new AppError("Tồn kho đã thay đổi. Hãy kiểm tra lại sản phẩm.", 409, "OUT_OF_STOCK");
   deducted.push(item);
  }
  await payment.save();
  await audit.save();
 } catch (error) {
  // shortcut: compensation cannot survive a process crash; use transactions for production atomicity.
  let restored = !stockWriteUncertain;
  for (const item of deducted.reverse()) {
   try {
    const result = await Product.updateOne({ _id: item.productId, "variants.sku": item.variantSku },
     { $inc: { "variants.$.stock": item.qty } });
    if (result.modifiedCount !== 1) restored = false;
   } catch { restored = false; }
  }
  for (const doc of [audit, payment]) {
   try { await doc.constructor.deleteOne({ _id: doc._id }); }
   catch { restored = false; }
  }
  if (restored) {
   try { await Order.deleteOne({ _id: order._id, creationState: "pending" }); }
   catch { restored = false; }
  }
  if (!restored) {
   console.error("Staff sale requires reconciliation", String(order._id));
   throw unavailable();
  }
  throw error;
 }
 // An uncertain final acknowledgement must never trigger compensation of a completed sale.
 const completed = await Order.updateOne({ _id: order._id, creationState: "pending" },
  { $set: { creationState: "complete" } });
 if (completed.modifiedCount !== 1) throw unavailable();
 return receipt(order);
}

export async function createStaffSale(request, response) {
 const input = parseSale(request.body);
 const requestId = parseRequestId(request.get("Idempotency-Key"));
 const hash = saleHash(input);
 try {
  const previous = await existingRequest(request.user._id, requestId);
  if (previous) return response.json({ success: true, data: { order: checkReplay(previous, hash) } });
  const order = await saveSale(input, request.user._id, requestId, hash);
  response.status(201).json({ success: true, data: { order } });
 } catch (error) {
  try {
   const replay = await existingRequest(request.user._id, requestId);
   if (replay) return response.json({ success: true, data: { order: checkReplay(replay, hash) } });
  } catch (lookupError) { throw unavailable(lookupError); }
  throw unavailable(error);
 }
}
