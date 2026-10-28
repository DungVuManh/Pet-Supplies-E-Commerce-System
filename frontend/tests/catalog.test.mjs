import assert from "node:assert/strict";
import { test } from "node:test";
import { filterProducts, products } from "../features/catalog/products.ts";
import { addCartItem, cartQuantity, cartTotal } from "../features/cart/cart.ts";

// The sample grid repeats 4 distinct products 3 times, so assertions compare distinct names.
const names = (list) => [...new Set(list.map((p) => p.name))];

test("public catalog shows all sample products without account data", () => {
  assert.equal(filterProducts().length, products.length);
  assert.equal(names(products).length, 4);
  assert.deepEqual(filterProducts("", "unknown"), products);
});

test("catalog search ignores Vietnamese accents and case and matches multiple words", () => {
  assert.deepEqual(names(filterProducts("THUC AN MEO")), ["Royal Canin Indoor 27"]);
  assert.deepEqual(names(filterProducts("Royal Adult")), ["Royal Canin Mini Adult"]);
  assert.deepEqual(names(filterProducts("do choi")), ["Bóng cao su KONG"]);
});

test("category and search combine and unmatched search is genuinely empty", () => {
  assert.equal(names(filterProducts("", "cat")).length, 2);
  assert.equal(names(filterProducts("royal", "cat")).length, 1);
  assert.equal(filterProducts("kong", "cat").length, 0);
  assert.equal(filterProducts("no-such-product").length, 0);
});

test("guest cart merges repeated products without mutating its previous state", () => {
  const empty = [];
  const first = addCartItem(empty, products[0]);
  const second = addCartItem(first, products[0]);
  const third = addCartItem(second, products[2]);
  assert.equal(empty.length, 0);
  assert.equal(first[0].quantity, 1);
  assert.equal(second.length, 1);
  assert.equal(second[0].quantity, 2);
  assert.equal(cartQuantity(third), 3);
  assert.equal(cartTotal(third), 925000);
});

test("empty guest cart has zero total and quantity", () => {
  assert.equal(cartQuantity([]), 0);
  assert.equal(cartTotal([]), 0);
});
