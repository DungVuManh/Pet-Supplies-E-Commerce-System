import assert from "node:assert/strict";
import { test } from "node:test";
import { slugFromName, validateCategory, validateMasterData } from "../features/admin/validation.ts";

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
