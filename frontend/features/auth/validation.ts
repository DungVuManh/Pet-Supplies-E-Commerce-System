export type AuthField =
 | "identifier"
 | "fullName"
 | "phone"
 | "email"
 | "password"
 | "confirmPassword"
 | "terms";
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
 if (!identifier) errors.identifier = "Vui lòng nhập email.";
 else if (!isEmail(identifier))
  errors.identifier = "Email chưa đúng định dạng.";
 if (!text(data, "password")) errors.password = "Vui lòng nhập mật khẩu.";
 return errors;
}

export function validateRegister(data: FormData): AuthErrors {
 const { terms, ...contactErrors } = validateProfile(data);
 const errors: AuthErrors = contactErrors;
 const email = text(data, "email").trim();
 const password = text(data, "password");
 const confirmation = text(data, "confirmPassword");

 if (!email) errors.email = "Vui lòng nhập email.";
 else if (!isEmail(email)) errors.email = "Email chưa đúng định dạng.";
 if (!password) errors.password = "Vui lòng tạo mật khẩu.";
 else if ([...password.replace(/\s/g, "")].length <= 5) {
  errors.password =
   "Mật khẩu cần từ  6 ký tự trở lên, không tính khoảng trắng.";
 }
 if (!confirmation) errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
 else if (confirmation !== password)
  errors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
 if (terms) errors.terms = terms;
 return errors;
}

export function validateProfile(data: FormData): AuthErrors {
 const errors: AuthErrors = {};
 const fullName = text(data, "fullName").trim();
 const phone = text(data, "phone").trim();

 if (fullName.length < 2 || fullName.length > 100)
  errors.fullName = "Vui lòng nhập họ và tên từ 2 đến 100 ký tự.";
 if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";
 else if (!isPhone(phone))
  errors.phone = "Vui lòng nhập số điện thoại Việt Nam hợp lệ.";
 if (data.get("terms") !== "on")
  errors.terms = "Bạn cần đồng ý với điều khoản sử dụng và chính sách bảo mật.";
 return errors;
}

export function validateResetEmail(data: FormData): AuthErrors {
 const email = text(data, "email").trim();
 return !email
  ? { email: "Vui lòng nhập email." }
  : !isEmail(email)
    ? { email: "Email chưa đúng định dạng." }
    : {};
}
