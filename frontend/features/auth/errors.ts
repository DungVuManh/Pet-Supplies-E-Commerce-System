export function authErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  switch (code) {
    case "FORBIDDEN": return "Bạn không có quyền truy cập chức năng này.";
    case "auth/invalid-email": return "Địa chỉ email chưa đúng định dạng.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/email-already-in-use": return "Không thể đăng nhập hoặc tạo tài khoản với thông tin này. Hãy kiểm tra email và mật khẩu.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements": return "Mật khẩu chưa đáp ứng yêu cầu bảo mật. Vui lòng chọn mật khẩu mạnh hơn.";
    case "auth/too-many-requests":
    case "RATE_LIMITED": return "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.";
    case "auth/user-disabled": return "Tài khoản hiện không thể đăng nhập. Vui lòng liên hệ hỗ trợ.";
    case "auth/operation-not-allowed": return "Đăng nhập bằng email chưa được bật. Vui lòng liên hệ hỗ trợ.";
    case "auth/network-request-failed":
    case "NETWORK_ERROR": return "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.";
    case "PROFILE_UNAVAILABLE": return "Chưa thể lưu hoặc đọc hồ sơ. Vui lòng thử lại; nếu đã tạo tài khoản, bạn có thể đăng nhập để hoàn tất hồ sơ.";
    case "PROFILE_INCOMPLETE": return "Vui lòng hoàn tất hồ sơ để tiếp tục.";
    case "ACCOUNT_LOCKED": return "Tài khoản đang bị khóa.";
    case "RECENT_LOGIN_REQUIRED":
    case "UNAUTHENTICATED": return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case "AUTH_CLOCK_SKEW": return "Dịch vụ đăng nhập chưa đồng bộ thời gian. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
    case "CSRF_INVALID": return "Phiên gửi biểu mẫu đã hết hạn. Vui lòng thử lại.";
    case "VALIDATION_ERROR": return "Thông tin hồ sơ chưa hợp lệ. Vui lòng kiểm tra lại.";
    case "FIREBASE_CONFIG_MISSING": return "Chưa có cấu hình xác thực. Vui lòng liên hệ hỗ trợ.";
    case "auth/argument-error": return "Tham số cấu hình xác thực chưa hợp lệ. Vui lòng tải lại trang và thử lại.";
    case "auth/unauthorized-domain": return "Tên miền hiện tại chưa được cấp phép trong Firebase Authentication (Authorized domains). Vui lòng thêm localhost / 127.0.0.1 vào Firebase Console.";
    case "auth/popup-blocked": return "Trình duyệt đã chặn cửa sổ đăng nhập pop-up. Vui lòng cho phép pop-up và thử lại.";
    case "auth/account-exists-with-different-credential": return "Email này đã được sử dụng với một phương thức đăng nhập khác.";
    case "AUTH_UNAVAILABLE": return "Chưa thể kết nối dịch vụ xác thực. Vui lòng thử lại sau.";
    default: return "Chưa thể kết nối dịch vụ xác thực. Vui lòng thử lại sau.";
  }
}
