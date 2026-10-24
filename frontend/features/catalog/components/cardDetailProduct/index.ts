// =============================================================
// features/catalog/components/cardDetailProduct/index.ts
// Entry point cho module cardDetailProduct
// =============================================================

export { DetailProduct, default } from "./detailProduct";
export * from "./types";
export { useProductDetail } from "./hooks/use-product-detail";
export { fetchProductDetailApi } from "./services/product-detail.service";
export { addToCartApi, getOrCreateGuestToken } from "./services/cart.service";
