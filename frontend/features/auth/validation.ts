export type AuthField = "identifier" | "fullName" | "phone" | "email" | "password" | "confirmPassword" | "terms";
export type AuthErrors = Partial<Record<AuthField, string>>;

function text(data: FormData, name: AuthField) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isPhone(value: string) {
  return /^(?:0|\+84)[0-9]{9}$/.test(value.replace(/[\s.-]/g, ""));
}

export function validateLogin(data: FormData): AuthErrors {
  const errors: AuthErrors = {};
  const identifier = text(data, "identifier").trim();
  if (!identifier) errors.identifier = "Vui lòng nhập email hoặc số điện thoại.";
  else if (!isEmail(identifier) && !isPhone(identifier)) errors.identifier = "Email hoặc số điện thoại chưa đúng định dạng.";
  if (!text(data, "password")) errors.password = "Vui lòng nhập mật khẩu.";
  return errors;
}

export function validateRegister(data: FormData): AuthErrors {
  const errors: AuthErrors = {};
  const fullName = text(data, "fullName").trim();
  const email = text(data, "email").trim();
  const phone = text(data, "phone").trim();
  const password = text(data, "password");
  const confirmation = text(data, "confirmPassword");

  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Vui lòng nhập họ và tên từ 2 đến 100 ký tự.";
  if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";
  else if (!isPhone(phone)) errors.phone = "Vui lòng nhập số điện thoại Việt Nam hợp lệ.";
  if (!email) errors.email = "Vui lòng nhập email.";
  else if (!isEmail(email)) errors.email = "Email chưa đúng định dạng.";
  if (!password) errors.password = "Vui lòng tạo mật khẩu.";
  else if (password.length < 8 || !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) || !/[0-9]/.test(password)) {
    errors.password = "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.";
  }
  if (!confirmation) errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
  else if (confirmation !== password) errors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
  if (data.get("terms") !== "on") errors.terms = "Bạn cần đồng ý với điều khoản sử dụng và chính sách bảo mật.";
  return errors;
}
