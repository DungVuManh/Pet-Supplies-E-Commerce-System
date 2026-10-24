// Xử lý các nghiệp vụ thêm, sửa, xóa, lấy giỏ hàng lưu vào MongoDB

import { AppError } from "../common/errors/app-error.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import {
  parseAddToCartInput,
  parseUpdateCartItemInput,
} from "../validators/cart.validator.js";

// Helper xác định chủ sở hữu giỏ hàng: người dùng đăng nhập hoặc khách vãng lai
function resolveOwner(request, explicitGuestToken) {
  if (request.user?._id) {
    return { userId: request.user._id, isUser: true };
  }

  const guestToken =
    explicitGuestToken ||
    request.headers["x-guest-token"] ||
    request.authCookies?.["petly-guest-token"] ||
    request.query?.guestToken ||
    `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return { guestToken, isUser: false };
}

async function formatCartResponse(cart) {
  if (!cart) {
    return {
      items: [],
      summary: {
        distinctCount: 0,
        totalQuantity: 0,
        subtotal: 0,
        shippingFee: 0,
        discount: 0,
        total: 0,
      },
    };
  }

  await cart.populate({
    path: "items.productId",
    select: "name brand description images price variants isActive",
  });

  const formattedItems = [];
  let subtotal = 0;
  let totalQuantity = 0;

  for (const item of cart.items) {
    const prod = item.productId;
    if (!prod || !prod.isActive) continue;

    const variant = prod.variants?.find((v) => v.sku === item.variantSku) || {
      sku: item.variantSku,
      label: "Tiêu chuẩn",
      price: prod.price || 0,
      stock: 0,
      reservedStock: 0,
    };

    const itemPrice = variant.price ?? prod.price ?? 0;
    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;
    totalQuantity += item.quantity;

    const physical = variant.stock ?? 0;
    const reserved = variant.reservedStock ?? 0;

    formattedItems.push({
      id: `${prod._id}_${variant.sku}`,
      productId: prod._id,
      name: prod.name,
      brand: prod.brand || "",
      description: prod.description || "",
      sku: variant.sku,
      label: variant.label,
      price: itemPrice,
      quantity: item.quantity,
      itemTotal,
      image: prod.images?.[0] || "/images/products/royal-canin-mini-adult.png",
      stock: physical,
      availableStock: Math.max(0, physical - reserved),
    });
  }

  const shippingFee = formattedItems.length > 0 ? 30000 : 0;
  const total = subtotal + shippingFee;

  return {
    _id: cart._id,
    userId: cart.userId,
    guestToken: cart.guestToken,
    items: formattedItems,
    summary: {
      distinctCount: formattedItems.length,
      totalQuantity,
      subtotal,
      shippingFee,
      discount: 0,
      total,
    },
  };
}

/**
 * 1. POST /api/v1/cart/items - Thêm sản phẩm vào giỏ hàng trong MongoDB
 */
export async function addToCart(request, response, next) {
  try {
    const { productId, variantSku, quantity, guestToken: bodyGuestToken } =
      parseAddToCartInput(request.body);

    // Kiểm tra sản phẩm tồn tại và đang kinh doanh
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      throw new AppError(
        "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.",
        404,
        "NOT_FOUND"
      );
    }

    // Kiểm tra biến thể tồn tại trong sản phẩm
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) {
      throw new AppError(
        "Không tìm thấy biến thể sản phẩm với mã SKU này.",
        404,
        "VARIANT_NOT_FOUND"
      );
    }

    // Kiểm tra số lượng tồn kho khả dụng
    const physical = variant.stock ?? 0;
    const reserved = variant.reservedStock ?? 0;
    const availableStock = Math.max(0, physical - reserved);

    // Xác định giỏ hàng của User hay Guest
    const owner = resolveOwner(request, bodyGuestToken);
    const filter = owner.isUser
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken };

    let cart = await Cart.findOne(filter);
    if (!cart) {
      cart = new Cart({ ...filter, items: [] });
    }

    // Kiểm tra xem mặt hàng đã có sẵn trong giỏ chưa
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantSku === variantSku
    );

    const currentQtyInCart =
      existingIndex >= 0 ? cart.items[existingIndex].quantity : 0;

    if (currentQtyInCart + quantity > availableStock) {
      throw new AppError(
        `Số lượng trong kho không đủ. Hiện chỉ còn ${availableStock} sản phẩm khả dụng.`,
        400,
        "OUT_OF_STOCK"
      );
    }

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        variantSku,
        quantity,
      });
    }

    await cart.save();

    const formattedCart = await formatCartResponse(cart);

    response.status(200).json({
      success: true,
      data: {
        cart: formattedCart,
        guestToken: owner.isUser ? undefined : owner.guestToken,
        message: "Đã thêm sản phẩm vào giỏ hàng thành công.",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. GET /api/v1/cart - Lấy dữ liệu giỏ hàng từ MongoDB
 */
export async function getCart(request, response, next) {
  try {
    // 1. Xác định giỏ hàng thuộc về ai (User đã đăng nhập hay Khách vãng lai)
    const owner = resolveOwner(request, request.query?.guestToken);
    const filter = owner.isUser
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken };

    // 2. Tìm giỏ hàng trong database
    const cart = await Cart.findOne(filter);

    // 3. Ghép chi tiết sản phẩm và tính toán tổng tiền
    const formattedCart = await formatCartResponse(cart);

    // 4. Trả kết quả về client
    response.status(200).json({
      success: true,
      data: {
        cart: formattedCart,
        guestToken: owner.isUser ? undefined : owner.guestToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. PATCH /api/v1/cart/items/:sku - Cập nhật số lượng của một mặt hàng
 */
export async function updateCartItemQuantity(request, response, next) {
  try {
    const { sku } = request.params;
    const { quantity, guestToken } = parseUpdateCartItemInput(request.body);

    const owner = resolveOwner(request, guestToken);
    const filter = owner.isUser
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken };

    const cart = await Cart.findOne(filter);
    if (!cart) {
      throw new AppError("Không tìm thấy giỏ hàng.", 404, "NOT_FOUND");
    }

    const itemIndex = cart.items.findIndex((item) => item.variantSku === sku);
    if (itemIndex === -1) {
      throw new AppError(
        "Mặt hàng không tồn tại trong giỏ hàng.",
        404,
        "ITEM_NOT_FOUND"
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const formattedCart = await formatCartResponse(cart);

    response.status(200).json({
      success: true,
      data: {
        cart: formattedCart,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. DELETE /api/v1/cart/items/:sku - Xóa một mặt hàng khỏi giỏ
 */
export async function removeCartItem(request, response, next) {
  try {
    const { sku } = request.params;
    const owner = resolveOwner(request, request.query?.guestToken);
    const filter = owner.isUser
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken };

    const cart = await Cart.findOne(filter);
    if (!cart) {
      throw new AppError("Không tìm thấy giỏ hàng.", 404, "NOT_FOUND");
    }

    cart.items = cart.items.filter((item) => item.variantSku !== sku);
    await cart.save();

    const formattedCart = await formatCartResponse(cart);

    response.status(200).json({
      success: true,
      data: {
        cart: formattedCart,
        message: "Đã xóa sản phẩm khỏi giỏ hàng.",
      },
    });
  } catch (error) {
    next(error);
  }
}
