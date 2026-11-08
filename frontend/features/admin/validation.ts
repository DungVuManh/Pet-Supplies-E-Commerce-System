/** Client-side checks for Admin forms; the backend repeats them once it exists. */
/** `lockReason` is checked only when present, because only a change to locked needs one. */
export type UserFormValues = { fullName: string; phone: string; adminNote?: string; lockReason?: string };
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/** The error for an account-lock reason, or "" when it is valid (3–200 characters once trimmed). */
export function validateLockReason(reason: string) {
  const { length } = reason.trim();
  return length < 3 || length > 200 ? "Nhập lý do khóa, từ 3 đến 200 ký tự." : "";
}

/** Reads "450.000" or "450000" as 450000; empty or non-numeric input gives NaN. */
export function parseAmount(value: string) {
  const digits = value.replace(/[.\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/** `skuChanged`: seed data has older SKUs that break the rule, so an unchanged SKU is not checked. */
export type ProductFormValues = { name: string; sku: string; skuChanged?: boolean; categoryCodes: string[]; price: string; cost: string; stock: string; threshold: string };

export function validateProduct(values: ProductFormValues): FormErrors<ProductFormValues> {
  const errors: FormErrors<ProductFormValues> = {};
  if (values.name.trim().length < 3) errors.name = "Nhập tên sản phẩm (ít nhất 3 ký tự).";
  if (values.skuChanged !== false && !/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(values.sku.trim())) errors.sku = "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG.";
  if (values.categoryCodes.length === 0) errors.categoryCodes = "Chọn ít nhất một danh mục.";
  const price = parseAmount(values.price);
  if (!(price > 0)) errors.price = "Giá bán phải là số lớn hơn 0.";
  if (values.cost.trim() && Number.isNaN(parseAmount(values.cost))) errors.cost = "Giá vốn phải là số không âm.";
  if (Number.isNaN(parseAmount(values.stock))) errors.stock = "Tồn kho phải là số nguyên không âm.";
  if (values.threshold.trim() && Number.isNaN(parseAmount(values.threshold))) errors.threshold = "Ngưỡng cảnh báo phải là số nguyên không âm.";
  return errors;
}

/** A slug suggested from a Vietnamese name: "Đồ chơi cho mèo" gives "do-choi-cho-meo". */
export function slugFromName(name: string) {
  return name.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120).replace(/-+$/, "");
}

/** `orderOptional`: a new category may leave the order empty, and the server puts it last. */
export type CategoryFormValues = { name: string; slug: string; order: string; description?: string; orderOptional?: boolean };

export function validateCategory(values: CategoryFormValues): FormErrors<CategoryFormValues> {
  const errors: FormErrors<CategoryFormValues> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = "Nhập tên danh mục, từ 2 đến 100 ký tự.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug.trim())) errors.slug = "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ thuc-an-cho-cho.";
  const order = values.order.trim();
  if (!(values.orderOptional && !order) && !/^[1-9]\d*$/.test(order)) errors.order = "Thứ tự hiển thị là số nguyên từ 1.";
  if ((values.description?.trim().length ?? 0) > 500) errors.description = "Mô tả tối đa 500 ký tự.";
  return errors;
}

export function validateUser(values: UserFormValues): FormErrors<UserFormValues> {
  const errors: FormErrors<UserFormValues> = {};
  const fullName = values.fullName.trim();
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Nhập họ và tên, từ 2 đến 100 ký tự.";
  // The same rule as the account profile; stored numbers may use +84.
  if (!/^(?:0|\+84)\d{9}$/.test(values.phone.replace(/[\s.-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0912 345 678.";
  if ((values.adminNote?.trim().length ?? 0) > 1000) errors.adminNote = "Ghi chú tối đa 1000 ký tự.";
  if (values.lockReason !== undefined) {
    const reason = validateLockReason(values.lockReason);
    if (reason) errors.lockReason = reason;
  }
  return errors;
}

/** Text inputs, plus the two switches. The cap is ignored for a fixed amount, because the form hides it. */
export type VoucherFormValues = {
  code: string; name: string; type: "percent" | "fixed"; value: string; maxDiscount: string; minOrderAmount: string;
  startDate: string; endDate: string; usageLimit: string; oncePerCustomer: boolean; isPublic: boolean;
};

/** The same rules as the server's voucher validator. */
export function validateVoucher(values: VoucherFormValues): FormErrors<VoucherFormValues> {
  const errors: FormErrors<VoucherFormValues> = {};
  if (!/^[A-Z0-9-]{3,30}$/.test(values.code.trim().toUpperCase())) errors.code = "Mã voucher gồm 3–30 ký tự: chữ không dấu, số hoặc dấu gạch ngang.";
  const name = values.name.trim();
  if (name.length < 1 || name.length > 100) errors.name = "Nhập tên voucher, tối đa 100 ký tự.";

  if (values.type === "percent") {
    // No thousand separators here, or "5.5" would read as 55.
    if (!/^\d+$/.test(values.value.trim()) || Number(values.value) < 1 || Number(values.value) > 100) errors.value = "Phần trăm giảm là số nguyên từ 1 đến 100.";
    if (values.maxDiscount.trim() && !(parseAmount(values.maxDiscount) >= 1)) errors.maxDiscount = "Mức giảm tối đa phải từ 1 ₫ trở lên.";
  } else if (!(parseAmount(values.value) >= 1)) {
    errors.value = "Số tiền giảm phải từ 1 ₫ trở lên.";
  }
  if (values.minOrderAmount.trim() && Number.isNaN(parseAmount(values.minOrderAmount))) errors.minOrderAmount = "Đơn tối thiểu phải là số không âm.";
  if (values.usageLimit.trim() && !(parseAmount(values.usageLimit) >= 1)) errors.usageLimit = "Giới hạn lượt dùng phải từ 1 trở lên.";

  if (!values.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  if (!values.endDate) errors.endDate = "Chọn ngày kết thúc.";
  else if (values.startDate && values.endDate < values.startDate) errors.endDate = "Ngày kết thúc phải từ ngày bắt đầu trở đi.";
  return errors;
}

/** The master data modal's text inputs. `petTypeCode` is checked only for breeds and `fee` only for shipping methods. */
export type MasterDataFormValues = { kind: "petType" | "breed" | "brand" | "unit" | "shippingMethod"; name: string; description: string; petTypeCode: string; fee: string };

/** The same rules as the server's master data validator. */
export function validateMasterData(values: MasterDataFormValues): FormErrors<MasterDataFormValues> {
  const errors: FormErrors<MasterDataFormValues> = {};
  const name = values.name.trim();
  if (!name) errors.name = "Nhập tên.";
  else if (name.length > 100) errors.name = "Tên tối đa 100 ký tự.";
  if (values.description.trim().length > 300) errors.description = "Mô tả tối đa 300 ký tự.";
  if (values.kind === "breed" && !values.petTypeCode) errors.petTypeCode = "Chọn loài thú cưng.";
  if (values.kind === "shippingMethod" && Number.isNaN(parseAmount(values.fee))) errors.fee = "Phí là số nguyên từ 0.";
  return errors;
}
