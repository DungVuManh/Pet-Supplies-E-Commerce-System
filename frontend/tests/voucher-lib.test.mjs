import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forgetVoucherCode, rememberVoucherCode, rememberedVoucherCode, voucherCapLabel, voucherExpiryLabel,
  voucherMinimumLabel, voucherQuotePhone, voucherValueLabel,
} from "../lib/voucher.ts";

function fakeStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const broken = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
};

test("the remembered code survives until it is forgotten", () => {
  const storage = fakeStorage();
  assert.equal(rememberedVoucherCode(storage), null);
  rememberVoucherCode("PET50K", storage);
  assert.equal(rememberedVoucherCode(storage), "PET50K");
  forgetVoucherCode(storage);
  assert.equal(rememberedVoucherCode(storage), null);
});

test("blocked storage never breaks the page", () => {
  assert.equal(rememberedVoucherCode(broken), null);
  assert.doesNotThrow(() => rememberVoucherCode("PET50K", broken));
  assert.doesNotThrow(() => forgetVoucherCode(broken));
});

test("only a complete phone number reaches the quote", () => {
  for (const phone of ["0912345678", "0912 345 678", "0912.345.678", "+84912345678"]) assert.ok(voucherQuotePhone(phone), phone);
  for (const phone of ["", "091", "09123456789", "abc", undefined]) assert.equal(voucherQuotePhone(phone), undefined, String(phone));
});

test("public voucher labels read as designed", () => {
  const plain = (text) => text?.replace(/\s/g, " ");
  assert.equal(voucherValueLabel({ type: "percent", value: 10 }), "10%");
  assert.equal(plain(voucherValueLabel({ type: "fixed", value: 50000 })), "50.000đ");
  assert.equal(plain(voucherCapLabel({ maxDiscount: 50000 })), "tối đa 50.000đ");
  assert.equal(voucherCapLabel({ maxDiscount: null }), null);
  assert.equal(plain(voucherMinimumLabel({ minOrderAmount: 500000 })), "Từ 500.000đ");
  assert.equal(voucherMinimumLabel({ minOrderAmount: 0 }), "Mọi đơn hàng");
  assert.equal(voucherExpiryLabel({ endDate: "2026-11-30" }), "HSD 30/11/2026");
});
