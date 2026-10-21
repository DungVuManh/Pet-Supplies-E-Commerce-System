import type { Product } from "../catalog/products";

export type CartItem = { product: Product; quantity: number };

export function addCartItem(items: readonly CartItem[], product: Product): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id);
  return existing
    ? items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...items, { product, quantity: 1 }];
}

export function cartQuantity(items: readonly CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartTotal(items: readonly CartItem[]) {
  return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
}
