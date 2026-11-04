// =============================================================
// backend/src/common/sepay-service.js
// Tiện ích xử lý thông tin chuyển khoản VietQR và cổng SePay
// =============================================================

/**
 * Định dạng cú pháp nội dung chuyển khoản chuẩn theo nhận diện thương hiệu Petjoy
 * Ví dụ: formatTransferMemo("ORD173000123") -> "PETJOY ORD173000123"
 */
export function formatTransferMemo(orderCode) {
  if (!orderCode) return "PETJOY";
  const cleanCode = String(orderCode).trim().toUpperCase();
  return `PETJOY ${cleanCode}`;
}

/**
 * Trích xuất mã đơn hàng từ chuỗi nội dung chuyển khoản của SePay
 * Hỗ trợ cú pháp chuẩn PETJOY và tương thích ngược với PETLY
 * Ví dụ: "PETJOY ORD173000123 chuyen tien" -> "ORD173000123"
 */
export function extractOrderCodeFromMemo(content) {
  if (!content || typeof content !== "string") return null;

  // Khớp cú pháp chuẩn PETJOY <orderCode> hoặc PETLY <orderCode> (VD: PETJOY ORD123456 hoặc PETLY ORD123456)
  const memoMatch = content.match(/(?:PETJOY|PETLY)\s*[:\-_]?\s*(ORD\d+)/i);
  if (memoMatch && memoMatch[1]) {
    return memoMatch[1].toUpperCase();
  }

  // Khớp dự phòng nếu người chuyển chỉ ghi mã ORD123456 mà bỏ sót tiền tố
  const fallbackMatch = content.match(/(ORD\d+)/i);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Khởi tạo đường dẫn ảnh mã QR theo chuẩn VietQR thông qua SePay QR API
 * @param {Object} options
 * @param {string} options.bankCode Mã ngân hàng (VD: MB, VCB, ICB, TCB)
 * @param {string} options.accountNumber Số tài khoản ngân hàng
 * @param {string|number} options.amount Số tiền chuyển khoản
 * @param {string} options.memo Nội dung chuyển khoản
 * @param {string} [options.accountHolder] Tên chủ tài khoản
 * @returns {string} URL ảnh VietQR
 */
export function generateVietQrUrl({ bankCode, accountNumber, amount, memo, accountHolder }) {
  const safeBank = encodeURIComponent(String(bankCode || "MB").trim());
  const safeAcc = encodeURIComponent(String(accountNumber || "").trim());
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const safeDes = encodeURIComponent(String(memo || "").trim());

  let url = `https://qr.sepay.vn/img?acc=${safeAcc}&bank=${safeBank}&amount=${safeAmount}&des=${safeDes}`;
  if (accountHolder && String(accountHolder).trim() !== "") {
    url += `&name=${encodeURIComponent(String(accountHolder).trim())}`;
  }

  return url;
}

/**
 * Tạo chuỗi payload deep-link chuẩn VietQR
 */
export function generateVietQrPayload({ bankCode, accountNumber, amount, memo }) {
  const safeBank = String(bankCode || "MB").trim().toUpperCase();
  const safeAcc = String(accountNumber || "").trim();
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const safeMemo = String(memo || "").trim();

  return `vietqr://transfer?bank=${safeBank}&acc=${safeAcc}&amount=${safeAmount}&memo=${encodeURIComponent(safeMemo)}`;
}
