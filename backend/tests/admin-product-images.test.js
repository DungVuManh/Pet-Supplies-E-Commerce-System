import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cloudinary from "../src/config/cloudinary.js";
import { allowedImageUrl, imageType } from "../src/common/product-images.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { StockMovement } from "../src/models/stock-movement.model.js";
import { CSRF, ORIGIN, createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/uploads/product-images";
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(40)]);
const CLOUD = "https://res.cloudinary.com/demo/image/upload/";

let admin;
let uploaded;

/** A multipart upload as the browser sends it, with the session and CSRF pair unless told otherwise. */
function upload(files, { csrf = true, origin = ORIGIN, role } = {}) {
 if (role !== undefined) admin.session.role = role;
 const cookies = [];
 if (admin.session.role) cookies.push("petly-session=test-session");
 if (csrf) cookies.push(`petly-csrf=${CSRF}`);
 let call = request(admin.app).post(URL).set("Origin", origin);
 if (cookies.length) call = call.set("Cookie", cookies.join("; "));
 if (csrf) call = call.set("X-CSRF-Token", CSRF);
 for (const [name, buffer] of files) call = call.attach("images", buffer, name);
 return call;
}

beforeEach(() => {
 vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
 vi.stubEnv("CLOUDINARY_API_KEY", "key");
 vi.stubEnv("CLOUDINARY_API_SECRET", "secret");
 uploaded = [];
 admin = createAdminTestApp();
 vi.spyOn(cloudinary.uploader, "upload_stream").mockImplementation((options, done) => ({
  end(buffer) {
   uploaded.push({ options, size: buffer.length });
   done(null, { secure_url: `${CLOUD}v1/${options.folder}/photo-${uploaded.length}.jpg` });
  },
 }));
});
afterEach(() => {
 vi.unstubAllEnvs();
 vi.restoreAllMocks();
});

describe("image rules", () => {
 it("recognises JPEG, PNG, and WebP by their first bytes only", () => {
  expect([imageType(JPEG), imageType(PNG), imageType(WEBP)]).toEqual(["jpeg", "png", "webp"]);
  expect(imageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  expect(imageType(Buffer.from("GIF89a-------"))).toBeNull();
 });

 it("allows this account's uploads, bundled files, and URLs the product already has", () => {
  expect(allowedImageUrl(`${CLOUD}v1/a.jpg`, [], "demo")).toBe(true);
  expect(allowedImageUrl("https://res.cloudinary.com/other/image/upload/v1/a.jpg", [], "demo")).toBe(false);
  expect(allowedImageUrl("/images/products/kong-ball.png", [], "demo")).toBe(true);
  expect(allowedImageUrl("/images/../secret.png", [], "demo")).toBe(false);
  expect(allowedImageUrl("https://example.com/a.png", [], "demo")).toBe(false);
  expect(allowedImageUrl("https://example.com/a.png", ["https://example.com/a.png"], "demo")).toBe(true);
  expect(allowedImageUrl(`${CLOUD}v1/a.jpg`, [], "")).toBe(false);
 });
});

describe("POST /api/v1/admin/uploads/product-images", () => {
 it("uploads JPEG, PNG, and WebP files to the product folder", async () => {
  const { body } = await upload([["a.jpg", JPEG], ["b.png", PNG], ["c.webp", WEBP]]).expect(201);
  expect(body.data.urls).toEqual([1, 2, 3].map((n) => `${CLOUD}v1/petjoy/products/photo-${n}.jpg`));
  expect(uploaded.map((item) => item.options)).toEqual(Array(3).fill({ folder: "petjoy/products", resource_type: "image" }));
 });

 it("refuses a file that is not an image, even when it is named like one, and uploads nothing", async () => {
  const { body } = await upload([["a.jpg", JPEG], ["fake.jpg", Buffer.from("not really an image at all")]]).expect(400);
  expect(body).toMatchObject({ success: false, error: { code: "INVALID_UPLOAD" } });
  expect(body.message).toContain("fake.jpg");
  expect(uploaded).toHaveLength(0);
 });

 it.each([
  ["a file over 5 MB", [["big.jpg", Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)])]], "Mỗi ảnh tối đa 5 MB."],
  ["more than 8 files", Array.from({ length: 9 }, (_, index) => [`${index}.jpg`, JPEG]), "Mỗi lần tải tối đa 8 ảnh."],
 ])("refuses %s with a clear message", async (_label, files, message) => {
  const { body } = await upload(files).expect(400);
  expect(body).toMatchObject({ message, error: { code: "INVALID_UPLOAD" } });
  expect(uploaded).toHaveLength(0);
 });

 it("refuses a multipart request with no files", async () => {
  const { body } = await request(admin.app).post(URL).set("Origin", ORIGIN).set("Cookie", `petly-session=test-session; petly-csrf=${CSRF}`)
   .set("X-CSRF-Token", CSRF).set("Content-Type", "multipart/form-data; boundary=x").send("--x--\r\n").expect(400);
  expect(body).toMatchObject({ message: "Chọn ít nhất một ảnh để tải lên.", error: { code: "INVALID_UPLOAD" } });
 });

 it("refuses files sent under another field name", async () => {
  const { body } = await request(admin.app).post(URL).set("Origin", ORIGIN).set("Cookie", `petly-session=test-session; petly-csrf=${CSRF}`)
   .set("X-CSRF-Token", CSRF).attach("photo", JPEG, "a.jpg").expect(400);
  expect(body.error.code).toBe("INVALID_UPLOAD");
  expect(uploaded).toHaveLength(0);
 });

 it("reports a missing Cloudinary configuration", async () => {
  vi.stubEnv("CLOUDINARY_API_SECRET", "");
  const { body } = await upload([["a.jpg", JPEG]]).expect(503);
  expect(body.error.code).toBe("UPLOAD_UNAVAILABLE");
 });

 it("reports a Cloudinary failure without its details", async () => {
  cloudinary.uploader.upload_stream.mockImplementationOnce((_options, done) => ({ end: () => done({ http_code: 500, message: "secret detail" }) }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { body } = await upload([["a.jpg", JPEG]]).expect(502);
  expect(body).toMatchObject({ error: { code: "UPLOAD_FAILED" } });
  expect(JSON.stringify(body)).not.toContain("secret detail");
 });

 it("refuses a guest, a Customer, and Staff", async () => {
  await upload([["a.jpg", JPEG]], { role: null }).expect(401);
  await upload([["a.jpg", JPEG]], { role: "customer" }).expect(403);
  await upload([["a.jpg", JPEG]], { role: "staff" }).expect(403);
  expect(uploaded).toHaveLength(0);
 });

 it("refuses a missing CSRF pair and a wrong Origin before reading the files", async () => {
  expect((await upload([["a.jpg", JPEG]], { csrf: false }).expect(403)).body.error.code).toBe("CSRF_INVALID");
  // A foreign Origin is already refused by the app's CORS middleware.
  await upload([["a.jpg", JPEG]], { origin: "https://evil.example" }).expect(403);
  expect(uploaded).toHaveLength(0);
 });

 it("refuses a JSON body", async () => {
  await admin.send("POST", URL, { images: [] }).expect(415);
 });
});

describe("product images on save", () => {
 const cat = { _id: new mongoose.Types.ObjectId(), code: "DM001", name: "Chó" };
 let product;
 const query = (value) => {
  const chain = { select: () => chain, sort: () => chain, limit: () => chain, populate: () => chain, lean: async () => value };
  return chain;
 };

 beforeEach(() => {
  product = {
   _id: new mongoose.Types.ObjectId(), name: "KONG", petType: "dog", categoryIds: [cat._id], isActive: true,
   images: ["/images/products/kong-ball.png", "https://example.com/old-seed.png"],
   variants: [{ sku: "KG-1", label: "S", price: 100000, stock: 5, reservedStock: 0 }],
  };
  vi.spyOn(Product, "findOne").mockImplementation(() => query(structuredClone(product)));
  vi.spyOn(Product, "updateOne").mockImplementation(async (_filter, update) => {
   Object.assign(product, update.$set);
   return { matchedCount: 1 };
  });
  vi.spyOn(Category, "find").mockImplementation(() => query([cat]));
  vi.spyOn(Setting, "findById").mockImplementation(() => query({ lowStockThreshold: 5 }));
  vi.spyOn(Order, "exists").mockResolvedValue(null);
  vi.spyOn(AuditLog, "find").mockImplementation(() => query([]));
  vi.spyOn(StockMovement, "find").mockImplementation(() => query([]));
  vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
 });

 const patch = (images) => admin.send("PATCH", "/api/v1/admin/products/KG-1", { images });

 it("saves new uploads in order, the first being the main photo, and audits the change", async () => {
  const next = [`${CLOUD}v1/new.jpg`, "/images/products/kong-ball.png"];
  const { body } = await patch(next).expect(200);
  expect(product.images).toEqual(next);
  expect(body.data.images).toEqual(next);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   before: { images: product.images.length ? expect.any(Array) : [] }, after: { images: next }, summary: "Cập nhật sản phẩm KG-1: ảnh",
  });
 });

 it("keeps an older image the product already has when reordering", async () => {
  await patch(["https://example.com/old-seed.png", "/images/products/kong-ball.png"]).expect(200);
  expect(product.images[0]).toBe("https://example.com/old-seed.png");
 });

 it("treats the same images in the same order as no change", async () => {
  const { body } = await patch([...product.images]).expect(200);
  expect(body.data.changed).toBe(false);
  expect(Product.updateOne).not.toHaveBeenCalled();
 });

 it.each([
  [["https://example.com/new.png"], "Có ảnh không phải tải lên từ trang quản trị."],
  [Array.from({ length: 9 }, (_, index) => `${CLOUD}v1/${index}.jpg`), "Tối đa 8 ảnh mỗi sản phẩm."],
  [[`${CLOUD}v1/a.jpg`, `${CLOUD}v1/a.jpg`], "Một ảnh bị thêm hai lần."],
 ])("refuses %j", async (images, message) => {
  const { body } = await patch(images).expect(400);
  expect(body.error.fields).toEqual({ images: message });
  expect(Product.updateOne).not.toHaveBeenCalled();
 });

 it("removes every image", async () => {
  await patch([]).expect(200);
  expect(product.images).toEqual([]);
 });
});
