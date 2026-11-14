import { z } from "zod";
import { MAX_PRODUCT_IMAGES } from "../../common/product-images.js";
import { listQueryShape } from "./list-query.js";

export const productListQuerySchema = z.object({
    ...listQueryShape,
    tab: z.enum(["all", "active", "hidden"]).default("all"),
    category: z.string().trim().max(100).default("all"),
    status: z.enum(["all", "active", "low", "hidden"]).default("all"),
});

const integer = (message) => z.number({ error: message }).int(message).min(0, message).max(Number.MAX_SAFE_INTEGER, message);

// The rules the new and edit product forms share, so they cannot disagree.
const fields = {
    name: z.string({ error: "Tên sản phẩm không hợp lệ." }).trim().min(3, "Tên sản phẩm phải có ít nhất 3 ký tự.").max(200, "Tên sản phẩm tối đa 200 ký tự."),
    sku: z.string({ error: "SKU không hợp lệ." }).trim().max(100, "SKU tối đa 100 ký tự.")
        .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG."),
    brand: z.string({ error: "Thương hiệu không hợp lệ." }).trim().max(100, "Thương hiệu tối đa 100 ký tự."),
    // The values the Customer catalog filters on.
    petType: z.enum(["dog", "cat", "all"], { error: "Loài thú cưng không hợp lệ." }),
    categoryCodes: z.array(z.string().trim().min(1).max(100), { error: "Danh mục không hợp lệ." }).min(1, "Chọn ít nhất một danh mục.").max(30, "Chọn tối đa 30 danh mục."),
    description: z.string({ error: "Mô tả không hợp lệ." }).trim().max(20000, "Mô tả tối đa 20.000 ký tự."),
    components: z.string({ error: "Thành phần không hợp lệ." }).trim().max(20000, "Thành phần tối đa 20.000 ký tự."),
    unit: z.string({ error: "Đơn vị không hợp lệ." }).trim().max(50, "Đơn vị tối đa 50 ký tự."),
    isActive: z.boolean({ error: "Trạng thái không hợp lệ." }),
    price: integer("Giá bán phải là số nguyên lớn hơn 0.").min(1, "Giá bán phải là số nguyên lớn hơn 0."),
    cost: integer("Giá vốn phải là số nguyên không âm.").nullable(),
    stock: integer("Tồn kho phải là số nguyên không âm."),
    lowStockThreshold: integer("Ngưỡng cảnh báo phải là số nguyên không âm.").nullable(),
    // Image URLs, main photo first. Where they may point is checked in the controller.
    images: z.array(z.string({ error: "Ảnh không hợp lệ." }).trim().min(1, "Ảnh không hợp lệ.").max(500, "Đường dẫn ảnh quá dài."), { error: "Ảnh không hợp lệ." })
        .max(MAX_PRODUCT_IMAGES, `Tối đa ${MAX_PRODUCT_IMAGES} ảnh mỗi sản phẩm.`)
        .refine((urls) => new Set(urls).size === urls.length, "Một ảnh bị thêm hai lần."),
};

// Only changed fields are sent. A SKU is checked only when it changes, because the
// seed data has older SKUs that do not meet this rule.
export const productPatchSchema = z.object({
    name: z.string({ error: "Tên sản phẩm không hợp lệ." }).trim().min(3, "Tên sản phẩm phải có ít nhất 3 ký tự.").max(200, "Tên sản phẩm tối đa 200 ký tự.").optional(),
    sku: z.string({ error: "SKU không hợp lệ." }).trim().max(100, "SKU tối đa 100 ký tự.")
        .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG.").optional(),
    brand: z.string({ error: "Thương hiệu không hợp lệ." }).trim().max(100, "Thương hiệu tối đa 100 ký tự.").optional(),
    // The values the Customer catalog filters on.
    petType: z.enum(["dog", "cat", "all"], { error: "Loài thú cưng không hợp lệ." }).optional(),
    categoryCodes: z.array(z.string().trim().min(1).max(100), { error: "Danh mục không hợp lệ." }).min(1, "Chọn ít nhất một danh mục.").max(30, "Chọn tối đa 30 danh mục.").optional(),
    description: z.string({ error: "Mô tả không hợp lệ." }).trim().max(20000, "Mô tả tối đa 20.000 ký tự.").optional(),
    components: z.string({ error: "Thành phần không hợp lệ." }).trim().max(20000, "Thành phần tối đa 20.000 ký tự.").optional(),
    unit: z.string({ error: "Đơn vị không hợp lệ." }).trim().max(50, "Đơn vị tối đa 50 ký tự.").optional(),
    isActive: z.boolean({ error: "Trạng thái không hợp lệ." }).optional(),
    price: integer("Giá bán phải là số nguyên lớn hơn 0.").min(1, "Giá bán phải là số nguyên lớn hơn 0.").optional(),
    cost: integer("Giá vốn phải là số nguyên không âm.").nullable().optional(),
    stock: integer("Tồn kho phải là số nguyên không âm.").optional(),
    expectedStock: integer("Thiếu tồn kho lúc tải biểu mẫu.").optional(),
    lowStockThreshold: integer("Ngưỡng cảnh báo phải là số nguyên không âm.").nullable().optional(),
}).strict();

export const MAX_VARIANTS = 20;

const variantSchema = z.object({
    label: z.string({ error: "Tên phân loại không hợp lệ." }).trim().min(1, "Nhập tên phân loại, ví dụ Túi 2 kg.").max(100, "Tên phân loại tối đa 100 ký tự."),
    sku: fields.sku,
    price: fields.price,
    cost: fields.cost.optional(),
    stock: fields.stock.default(0),
    lowStockThreshold: fields.lowStockThreshold.optional(),
}).strict();

/** A new product with 1–20 variants. A repeated SKU is reported on its later row, as `variants.<index>.sku`. */
export const productCreateSchema = z.object({
    name: fields.name,
    brand: fields.brand.default(""),
    petType: fields.petType,
    categoryCodes: fields.categoryCodes,
    description: fields.description.default(""),
    components: fields.components.default(""),
    unit: fields.unit.default(""),
    isActive: fields.isActive.default(true),
    images: fields.images.default([]),
    variants: z.array(variantSchema, { error: "Phân loại không hợp lệ." }).min(1, "Thêm ít nhất một phân loại.").max(MAX_VARIANTS, `Tối đa ${MAX_VARIANTS} phân loại.`),
}).strict().superRefine((product, context) => {
    const seen = new Set();
    product.variants.forEach((variant, index) => {
        if (seen.has(variant.sku)) context.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "SKU bị trùng với phân loại khác." });
        seen.add(variant.sku);
    });
});
