import { Product } from "../models/product.model.js";
import { AppError } from "./errors/app-error.js";

/**
 * Prices order lines from the database, checking each product and its available
 * stock. The voucher quote and the order share it, so they cannot disagree.
 */
export async function priceOrderItems(items) {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!item.productId) {
      throw new AppError("Thiếu mã sản phẩm trong đơn hàng.", 400, "INVALID_PRODUCT");
    }
    const qty = Number(item.qty || item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError("Số lượng sản phẩm không hợp lệ.", 400, "INVALID_QUANTITY");
    }

    const product = await Product.findById(item.productId);
    if (!product || product.isActive === false) {
      throw new AppError("Không tìm thấy sản phẩm trong đơn hàng hoặc sản phẩm đã ngừng kinh doanh.", 404, "PRODUCT_NOT_FOUND");
    }

    let variant = null;
    if (product.variants && product.variants.length > 0) {
      variant = product.variants.find((v) => v.sku === item.variantSku);
      if (!variant && item.variantSku && item.variantSku !== "default") {
        throw new AppError(`Không tìm thấy biến thể sản phẩm với mã SKU ${item.variantSku}.`, 404, "VARIANT_NOT_FOUND");
      }
      if (!variant) {
        variant = product.variants[0];
      }
    }

    // Kiểm tra tồn kho khả dụng nếu có dữ liệu stock
    const physical = variant ? variant.stock : product.stock;
    if (physical !== undefined && physical !== null) {
      const reserved = variant ? (variant.reservedStock ?? 0) : 0;
      const availableStock = Math.max(0, physical - reserved);
      if (qty > availableStock) {
        throw new AppError(
          `Sản phẩm "${product.name}"${variant?.label ? ` (${variant.label})` : ""} trong kho không đủ. Hiện chỉ còn ${availableStock} sản phẩm khả dụng.`,
          400,
          "OUT_OF_STOCK"
        );
      }
    }

    // Giá lấy từ server database, tuyệt đối không tin giá client gửi lên
    const unitPrice = variant?.price ?? product.price ?? 0;

    orderItems.push({
      productId: product._id,
      variantSku: variant ? variant.sku : (item.variantSku || "default"),
      name: product.name,
      unitPrice,
      qty,
      image: variant?.image || product?.images?.[0] || item.image || "",
    });

    subtotal += unitPrice * qty;
  }

  return { orderItems, subtotal };
}
