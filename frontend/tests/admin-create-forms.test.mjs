import assert from "node:assert/strict";
import { test } from "node:test";
import { slugFromName, validateCategory, validateMasterData, validateProductCreate } from "../features/admin/validation.ts";

test("a slug is suggested from a Vietnamese name", () => {
  assert.equal(slugFromName("Đồ chơi cho mèo"), "do-choi-cho-meo");
  assert.equal(slugFromName("  Thức ăn hạt — Chó lớn!  "), "thuc-an-hat-cho-lon");
  assert.equal(slugFromName("ĐẶC BIỆT 2026"), "dac-biet-2026");
  assert.equal(slugFromName("Ưu đãi / Phụ kiện"), "uu-dai-phu-kien");
  assert.equal(slugFromName("!!!"), "");
});

test("a suggested slug always passes the slug rule, even when cut to 120 characters", () => {
  const slug = slugFromName(`${"ab ".repeat(39)}cd`);
  assert.ok(slug.length <= 120);
  assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(slugFromName(`${"a".repeat(119)} b`), "a".repeat(119));
});

test("a new category may leave the order empty, an edited one may not", () => {
  const values = { name: "Đồ chơi", slug: "do-choi", order: "" };
  assert.deepEqual(validateCategory({ ...values, orderOptional: true }), {});
  assert.deepEqual(Object.keys(validateCategory(values)), ["order"]);
  assert.deepEqual(Object.keys(validateCategory({ ...values, order: "0", orderOptional: true })), ["order"]);
  assert.deepEqual(validateCategory({ ...values, order: "3", orderOptional: true }), {});
});

test("master data needs a name, a pet type for a breed, and a fee for shipping", () => {
  const values = { kind: "unit", name: "Hộp", description: "", petTypeCode: "", fee: "" };
  const keys = (patch) => Object.keys(validateMasterData({ ...values, ...patch }));
  assert.deepEqual(keys({}), []);
  assert.deepEqual(keys({ name: "  " }), ["name"]);
  assert.deepEqual(keys({ name: "x".repeat(101) }), ["name"]);
  assert.deepEqual(keys({ description: "x".repeat(301) }), ["description"]);
  assert.deepEqual(keys({ kind: "breed" }), ["petTypeCode"]);
  assert.deepEqual(keys({ kind: "breed", petTypeCode: "PET-DOG" }), []);
  for (const fee of ["", "-1", "1,5", "abc"]) assert.deepEqual(keys({ kind: "shippingMethod", fee }), ["fee"], fee);
  for (const fee of ["0", "30.000", "45000"]) assert.deepEqual(keys({ kind: "shippingMethod", fee }), [], fee);
  assert.deepEqual(keys({ fee: "abc" }), [], "a fee is ignored outside shipping");
});

test("a new product checks each variant row and reports a repeated SKU on its later row", () => {
  const row = (patch = {}) => ({ label: "Túi 2 kg", sku: "RC-2KG", price: "450.000", cost: "", stock: "10", threshold: "", ...patch });
  const check = (variants, base = {}) => validateProductCreate({ name: "Royal Canin", categoryCodes: ["DM001"], variants, ...base });
  assert.equal(check([row()]).valid, true);
  assert.deepEqual(check([row()], { name: "ab", categoryCodes: [] }).errors, { name: "Nhập tên sản phẩm (ít nhất 3 ký tự).", categoryCodes: "Chọn ít nhất một danh mục." });
  assert.deepEqual(check([]).errors, { variants: "Thêm ít nhất một phân loại." });
  const result = check([row(), row({ sku: "RC-5KG" }), row()]);
  assert.equal(result.valid, false);
  assert.deepEqual(result.variants, [{}, {}, { sku: "SKU bị trùng với phân loại khác." }]);
  assert.deepEqual(Object.keys(check([row({ label: " ", sku: "rc 2", price: "0", cost: "x", stock: "-1", threshold: "a" })]).variants[0]),
    ["label", "sku", "price", "cost", "stock", "threshold"]);
  assert.equal(check([row({ stock: "", cost: "300.000", threshold: "5" })]).valid, true);
});

test("CSV cells neutralize formulas but keep numbers, amounts, and phones readable", async () => {
  const { escapeCsvCell, buildCsv } = await import("../features/admin/utils/export-excel.ts");
  for (const text of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", "\rx", "=HYPERLINK(\"http://x\")"]) {
    assert.equal(escapeCsvCell(text)[1], "'", text);
  }
  assert.equal(escapeCsvCell("=A1"), `"'=A1"`);
  assert.equal(escapeCsvCell('Nói "xin chào"'), `"Nói ""xin chào"""`);
  for (const text of ["-5", "+84912345678", "-1.000.000 ₫", "12,5%", "0912 345 678", "Bình thường"]) {
    assert.equal(escapeCsvCell(text), `"${text}"`, text);
  }
  assert.equal(escapeCsvCell(-5), `"-5"`);
  assert.equal(escapeCsvCell(null), `""`);
  assert.equal(buildCsv({ title: "T", sections: [{ headers: ["A"], rows: [[1]] }] }), `"T"\r\n\r\n"A"\r\n"1"\r\n`);
  assert.equal(buildCsv({ title: "T", period: "Tháng 11", sections: [] }), `"T"\r\n"Kỳ báo cáo:","Tháng 11"\r\n`);
});

test("the product export has the agreed columns and no cost", async () => {
  const { productSection, fileDate } = await import("../features/admin/utils/export-rows.ts");
  const section = productSection([{ sku: "RC-1", code: "SP00A001", name: "Royal", brand: "RC", unit: "Túi", price: 450000, available: 8, threshold: 5, status: "low",
    categories: [{ ref: "DM1", name: "Mèo", path: "Mèo" }, { ref: "DM2", name: "Thức ăn", path: "Thức ăn" }], cost: 1 }]);
  assert.equal(section.headers.length, 10);
  assert.deepEqual(section.rows[0], ["RC-1", "SP00A001", "Royal", "RC", "Mèo; Thức ăn", "Túi", 450000, 8, 5, "Sắp hết hàng"]);
  assert.match(fileDate(new Date("2026-11-07T18:30:00Z")), /^2026-11-08$/);
});

test("a new Staff account needs a name, a valid email, and a Vietnamese phone", async () => {
  const { validateUserCreate } = await import("../features/admin/validation.ts");
  const valid = { fullName: "Trần Thu Hà", email: "thuha@petjoy.vn", phone: "0912 345 678", adminNote: "" };
  assert.deepEqual(validateUserCreate(valid), {});
  assert.deepEqual(Object.keys(validateUserCreate({ ...valid, email: "thuha@" })), ["email"]);
  assert.deepEqual(Object.keys(validateUserCreate({ ...valid, email: " " })), ["email"]);
  assert.deepEqual(Object.keys(validateUserCreate({ ...valid, fullName: "A", phone: "123" })).sort(), ["fullName", "phone"]);
});

test("the order export has the agreed columns, in Vietnam time", async () => {
  const { orderSection, exportDateTime } = await import("../features/admin/utils/export-rows.ts");
  assert.equal(exportDateTime("2026-11-07T18:05:00Z"), "08/11/2026 01:05");
  const section = orderSection([{ orderCode: "PA-1", createdAt: "2026-11-07T18:05:00Z", channel: "offline", customerName: "=Khách", phone: "0912 345 678",
    paymentMethod: "CASH", paymentStatus: "paid", subtotal: 150000, discount: 50000, total: 100000, promotionCode: null, status: "completed" }]);
  assert.equal(section.headers.length, 12);
  assert.deepEqual(section.rows[0], ["PA-1", "08/11/2026 01:05", "Tại cửa hàng", "=Khách", "0912 345 678", "Tiền mặt", "Đã thanh toán", 150000, 50000, 100000, "", "Hoàn thành"]);
});

test("product photos are checked for count, type, and size before uploading", async () => {
  const { productImagesError } = await import("../features/admin/validation.ts");
  const photo = (patch = {}) => ({ name: "a.jpg", type: "image/jpeg", size: 1000, ...patch });
  assert.equal(productImagesError([photo(), photo({ type: "image/png" }), photo({ type: "image/webp" })], 0), "");
  assert.match(productImagesError([photo(), photo()], 7), /tối đa 8 ảnh; còn thêm được 1 ảnh/);
  assert.equal(productImagesError([photo({ name: "x.gif", type: "image/gif" })], 0), "“x.gif” không phải ảnh JPG, PNG hoặc WebP.");
  assert.equal(productImagesError([photo({ name: "big.jpg", size: 5 * 1024 * 1024 + 1 })], 0), "“big.jpg” lớn hơn 5 MB.");
});
