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

export type ProductFormValues = { name: string; sku: string; categoryCode: string; price: string; cost: string; stock: string; threshold: string };

export function validateProduct(values: ProductFormValues): FormErrors<ProductFormValues> {
  const errors: FormErrors<ProductFormValues> = {};
  if (values.name.trim().length < 3) errors.name = "Nhập tên sản phẩm (ít nhất 3 ký tự).";
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(values.sku.trim())) errors.sku = "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG.";
  if (!values.categoryCode) errors.categoryCode = "Chọn danh mục.";
  const price = parseAmount(values.price);
  if (!(price > 0)) errors.price = "Giá bán phải là số lớn hơn 0.";
  if (values.cost.trim() && Number.isNaN(parseAmount(values.cost))) errors.cost = "Giá vốn phải là số không âm.";
  if (Number.isNaN(parseAmount(values.stock))) errors.stock = "Tồn kho phải là số nguyên không âm.";
  if (values.threshold.trim() && Number.isNaN(parseAmount(values.threshold))) errors.threshold = "Ngưỡng cảnh báo phải là số nguyên không âm.";
  return errors;
}

export type CategoryFormValues = { name: string; slug: string; order: string; description?: string };

export function validateCategory(values: CategoryFormValues): FormErrors<CategoryFormValues> {
  const errors: FormErrors<CategoryFormValues> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = "Nhập tên danh mục, từ 2 đến 100 ký tự.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug.trim())) errors.slug = "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ thuc-an-cho-cho.";
  if (!/^[1-9]\d*$/.test(values.order.trim())) errors.order = "Thứ tự hiển thị là số nguyên từ 1.";
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
