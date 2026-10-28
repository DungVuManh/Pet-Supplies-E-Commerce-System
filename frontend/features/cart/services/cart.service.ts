// =============================================================
// features/cart/services/cart.service.ts
// Service quản lý giỏ hàng:
// 1. Guest chưa đăng nhập -> Lưu vào localStorage
// 2. Đã đăng nhập -> Lưu vào database MongoDB qua API
// =============================================================

import type { BackendCartItem, BackendCartResponse, CartSummary } from "../types";

export const GUEST_TOKEN_KEY = "petly_guest_token";
export const GUEST_CART_STORAGE_KEY = "petly_guest_cart";
export const AUTH_USER_KEY = "petly_auth_user";

export type AddToCartPayload = {
  productId: string;
  variantSku: string;
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
  brand?: string;
  label?: string;
  description?: string;
  stock?: number;
};

// Kiểm tra xem người dùng hiện tại có đang đăng nhập hay không
export function isUserLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(AUTH_USER_KEY));
  } catch {
    return false;
  }
}

// Lấy hoặc tạo guest token trong localStorage
export function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";

  try {
    let token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      token = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `guest_${Date.now()}`;
  }
}

// =============================================================
// LOCAL STORAGE CART HELPERS (Dành riêng cho Guest)
// =============================================================

export function getLocalGuestCartItems(): BackendCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Lỗi khi đọc giỏ hàng guest từ localStorage:", err);
    return [];
  }
}

export function saveLocalGuestCartItems(items: BackendCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Lỗi khi ghi giỏ hàng guest vào localStorage:", err);
  }
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch (err) {
    console.error("Lỗi khi xóa giỏ hàng guest:", err);
  }
}

function calculateSummary(items: BackendCartItem[]): CartSummary {
  const distinctCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const shippingFee = items.length > 0 ? 30000 : 0;
  const discount = 0;
  const total = subtotal + shippingFee - discount;

  return {
    distinctCount,
    totalQuantity,
    subtotal,
    shippingFee,
    discount,
    total,
  };
}

function buildLocalCartResponse(items: BackendCartItem[]): BackendCartResponse {
  return {
    success: true,
    data: {
      cart: {
        _id: "guest_local_cart",
        guestToken: getOrCreateGuestToken(),
        items,
        summary: calculateSummary(items),
      },
      guestToken: getOrCreateGuestToken(),
    },
  };
}

// =============================================================
// CART APIS
// =============================================================

/**
 * 1. Thêm sản phẩm vào giỏ hàng:
 * - Nếu là guest (chưa đăng nhập): lưu dữ liệu vào localStorage
 * - Nếu đã đăng nhập: lưu vào database qua API POST /api/v1/cart/items
 */
export async function addToCartApi(payload: AddToCartPayload): Promise<BackendCartResponse> {
  // Nếu ĐÃ ĐĂNG NHẬP -> Gọi API lưu vào DB
  if (isUserLoggedIn()) {
    try {
      const response = await fetch("/api/v1/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId: payload.productId,
          variantSku: payload.variantSku,
          quantity: payload.quantity,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          // Token/session hết hạn -> fallback về guest
          if (typeof window !== "undefined") {
            localStorage.removeItem(AUTH_USER_KEY);
          }
        } else {
          throw new Error(data.error?.message || "Không thể thêm vào giỏ hàng");
        }
      } else {
        return data;
      }
    } catch (err) {
      // Nếu lỗi không phải 401 thì ném ra ngoài, nếu 401 tiếp tục fallback local
      if (err instanceof Error && !err.message.includes("401")) {
        throw err;
      }
    }
  }

  // NẾU LÀ GUEST (Chưa đăng nhập) -> Lưu vào localStorage
  let name = payload.name;
  let price = payload.price;
  let image = payload.image;
  let brand = payload.brand;
  let label = payload.label;
  let description = payload.description;
  let stock = payload.stock ?? 10;

  // Nếu thiếu thông tin cơ bản của sản phẩm, fetch từ API catalog để lưu đủ thông tin hiển thị giỏ
  if (!name || price === undefined) {
    try {
      const prodRes = await fetch(`/api/v1/catalog/products/${encodeURIComponent(payload.productId)}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const p = prodData.data?.product;
        if (p) {
          name = p.name;
          brand = p.brand;
          description = p.description;
          image = p.images?.[0] || p.image || "/images/products/royal-canin-mini-adult.png";
          const v = p.variants?.find((item: { sku: string }) => item.sku === payload.variantSku);
          price = v?.price ?? p.price ?? 0;
          label = v?.label;
          stock = v?.stock ?? 10;
        }
      }
    } catch {
      // Giữ fallback defaults
    }
  }

  const items = getLocalGuestCartItems();
  const existingIndex = items.findIndex((i) => i.sku === payload.variantSku);

  const finalPrice = price ?? 0;
  if (existingIndex > -1) {
    const existing = items[existingIndex];
    const newQty = existing.quantity + payload.quantity;
    items[existingIndex] = {
      ...existing,
      quantity: newQty,
      itemTotal: newQty * existing.price,
    };
  } else {
    items.push({
      id: `${payload.productId}_${payload.variantSku}`,
      productId: payload.productId,
      name: name || "Sản phẩm",
      brand: brand || "",
      description: description || "",
      sku: payload.variantSku,
      label: label || "Tiêu chuẩn",
      price: finalPrice,
      quantity: payload.quantity,
      itemTotal: finalPrice * payload.quantity,
      image: image || "/images/products/royal-canin-mini-adult.png",
      stock: stock,
      availableStock: stock,
    });
  }

  saveLocalGuestCartItems(items);
  return buildLocalCartResponse(items);
}

/**
 * 2. Lấy dữ liệu giỏ hàng:
 * - Nếu là guest (chưa đăng nhập): đọc từ localStorage
 * - Nếu đã đăng nhập: lấy từ database qua API GET /api/v1/cart
 */
export async function getCartApi(): Promise<BackendCartResponse> {
  if (isUserLoggedIn()) {
    try {
      const response = await fetch("/api/v1/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(AUTH_USER_KEY);
          }
        } else {
          throw new Error(data.error?.message || "Không thể tải giỏ hàng");
        }
      } else {
        return data;
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes("401")) {
        throw err;
      }
    }
  }

  // Khách chưa đăng nhập: đọc từ localStorage
  const items = getLocalGuestCartItems();
  return buildLocalCartResponse(items);
}

/**
 * 3. Cập nhật số lượng sản phẩm:
 * - Guest: cập nhật trong localStorage
 * - Đã đăng nhập: cập nhật trong database qua PATCH /api/v1/cart/items/:sku
 */
export async function updateCartItemQuantityApi(
  sku: string,
  quantity: number
): Promise<BackendCartResponse> {
  if (isUserLoggedIn()) {
    try {
      const response = await fetch(`/api/v1/cart/items/${encodeURIComponent(sku)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Không thể cập nhật số lượng");
      }

      return data;
    } catch (err) {
      if (err instanceof Error && !err.message.includes("401")) {
        throw err;
      }
    }
  }

  // Guest: cập nhật trong localStorage
  let items = getLocalGuestCartItems();
  const target = items.find((i) => i.sku === sku);

  if (target) {
    if (quantity <= 0) {
      items = items.filter((i) => i.sku !== sku);
    } else {
      target.quantity = quantity;
      target.itemTotal = target.price * quantity;
    }
    saveLocalGuestCartItems(items);
  }

  return buildLocalCartResponse(items);
}

/**
 * 4. Xóa sản phẩm khỏi giỏ:
 * - Guest: xóa khỏi localStorage
 * - Đã đăng nhập: xóa khỏi DB qua DELETE /api/v1/cart/items/:sku
 */
export async function removeCartItemApi(sku: string): Promise<BackendCartResponse> {
  if (isUserLoggedIn()) {
    try {
      const response = await fetch(`/api/v1/cart/items/${encodeURIComponent(sku)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Không thể xóa sản phẩm khỏi giỏ");
      }

      return data;
    } catch (err) {
      if (err instanceof Error && !err.message.includes("401")) {
        throw err;
      }
    }
  }

  // Guest: xóa khỏi localStorage
  const items = getLocalGuestCartItems().filter((i) => i.sku !== sku);
  saveLocalGuestCartItems(items);
  return buildLocalCartResponse(items);
}

/**
 * Đồng bộ giỏ hàng từ localStorage lên DB khi guest đăng nhập thành công
 */
export async function syncGuestCartToBackend(): Promise<void> {
  if (typeof window === "undefined") return;

  const localItems = getLocalGuestCartItems();
  if (localItems.length === 0) return;

  try {
    for (const item of localItems) {
      await fetch("/api/v1/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId: item.productId,
          variantSku: item.sku,
          quantity: item.quantity,
        }),
      });
    }

    // Xóa giỏ hàng guest sau khi đã đồng bộ thành công vào DB
    clearGuestCart();
    window.dispatchEvent(new Event("cart-updated"));
  } catch (err) {
    console.error("Lỗi khi đồng bộ giỏ hàng lên DB:", err);
  }
}
