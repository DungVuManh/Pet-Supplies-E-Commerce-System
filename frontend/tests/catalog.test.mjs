import assert from "node:assert/strict";
import { test } from "node:test";
import { addCartItem, cartQuantity, cartTotal } from "../features/cart/cart.ts";

const products = [
  {
    id: "1",
    brand: "Royal Canin",
    name: "Royal Canin Mini Adult",
    description: "Thức ăn cho chó trưởng thành · 2 kg",
    price: 420000,
    image: "/images/products/royal-canin-mini-adult.png",
    categories: ["dog", "food"],
  },
  {
    id: "2",
    brand: "Royal Canin",
    name: "Royal Canin Indoor 27",
    description: "Thức ăn cho mèo trong nhà · 2 kg",
    price: 480000,
    image: "/images/products/royal-canin-indoor.png",
    categories: ["cat", "food"],
  },
  {
    id: "3",
    brand: "KONG",
    name: "Bóng cao su KONG",
    description: "Đồ chơi cho chó · Cỡ nhỏ",
    price: 85000,
    image: "/images/products/kong-ball.png",
    categories: ["dog", "accessories"],
  },
  {
    id: "4",
    brand: "Cat’s Best",
    name: "Cát mèo Cat’s Best Original",
    description: "Cát hữu cơ vón cục · 5 L",
    price: 195000,
    image: "/images/products/cats-best-original.png",
    categories: ["cat", "accessories"],
  },
];

function normalizeSearch(value) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
}

function filterProducts(query = "", category = "") {
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    if (category && category !== "unknown" && !product.categories.includes(category)) return false;
    const text = normalizeSearch(`${product.brand} ${product.name} ${product.description}`);
    return words.every((word) => text.includes(word));
  });
}

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
