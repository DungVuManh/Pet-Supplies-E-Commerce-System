/** Client-side checks for Admin forms; the backend repeats them once it exists. */
export type UserFormValues = { fullName: string; email: string; phone: string };
export type FormErrors<T> = Partial<Record<keyof T, string>>;

export function validateUser(values: UserFormValues): FormErrors<UserFormValues> {
  const errors: FormErrors<UserFormValues> = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Nhập họ và tên (ít nhất 2 ký tự).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Nhập email hợp lệ, ví dụ ten@gmail.com.";
  if (!/^0\d{9}$/.test(values.phone.replace(/\s+/g, ""))) errors.phone = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.";
  return errors;
}
