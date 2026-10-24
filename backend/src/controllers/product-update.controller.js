import { AppError } from "../common/errors/app-error.js";
import { Product } from "../models/product.model.js";
import { parseProductSku, parseProductUpdate } from "../validators/product.validator.js";

export async function updateStaffProduct(request, response) {
  const sku = parseProductSku(request.params);
  const input = parseProductUpdate(request.body);
  try {
    const product = await Product.findOne({ "variants.sku": sku }).lean();
    const variant = product?.variants.find((item) => item.sku === sku);
    if (!product || !variant) throw new AppError("Không tìm thấy sản phẩm.", 404, "NOT_FOUND");
    if (![variant.stock, variant.reservedStock].every((n) => Number.isSafeInteger(n) && n >= 0)
      || variant.reservedStock > variant.stock) throw new Error("Invalid stock data");
    const expected = input.expected;
    if (expected.physical !== variant.stock || expected.reserved !== variant.reservedStock
      || expected.status !== (product.isActive ? "active" : "hidden")
      || expected.description !== (product.description || "")) {
      throw new AppError("Sản phẩm đã thay đổi. Hãy tải lại trước khi cập nhật.", 409, "PRODUCT_CHANGED");
    }
    if (input.physical < variant.reservedStock) {
      throw new AppError("Số lượng thực tế không được nhỏ hơn số đang giữ chỗ.", 409, "STOCK_BELOW_RESERVED");
    }
    // Keep the inventory precondition and shared content changes in one atomic Product write.
    const result = await Product.updateOne({
      _id: product._id, isActive: product.isActive ?? null, description: product.description ?? null,
      variants: { $elemMatch: { sku, stock: variant.stock, reservedStock: variant.reservedStock } },
    }, { $set: { "variants.$.stock": input.physical, isActive: input.status === "active", description: input.description } },
    { runValidators: true });
    if (result.matchedCount !== 1) {
      throw new AppError("Sản phẩm đã thay đổi. Hãy tải lại trước khi cập nhật.", 409, "PRODUCT_CHANGED");
    }
    response.json({ success: true, data: { sku } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Chưa xác nhận được kết quả cập nhật. Hãy tải lại sản phẩm.", 503, "PRODUCTS_UNAVAILABLE");
  }
}
