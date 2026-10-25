/** Client-side checks for Admin forms; the backend repeats them once it exists. */
export type UserFormValues = { fullName: string; email: string; phone: string };
export type FormErrors<T> = Partial<Record<keyof T, string>>;

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

export type CategoryFormValues = { name: string; slug: string; order: string };

export function validateCategory(values: CategoryFormValues): FormErrors<CategoryFormValues> {
  const errors: FormErrors<CategoryFormValues> = {};
  if (values.name.trim().length < 2) errors.name = "Nhập tên danh mục (ít nhất 2 ký tự).";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug.trim())) errors.slug = "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ thuc-an-cho-cho.";
  if (!/^[1-9]\d*$/.test(values.order.trim())) errors.order = "Thứ tự hiển thị là số nguyên từ 1.";
  return errors;
}

export function validateUser(values: UserFormValues): FormErrors<UserFormValues> {
  const errors: FormErrors<UserFormValues> = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Nhập họ và tên (ít nhất 2 ký tự).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Nhập email hợp lệ, ví dụ ten@gmail.com.";
  if (!/^0\d{9}$/.test(values.phone.replace(/\s+/g, ""))) errors.phone = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.";
  return errors;
}
