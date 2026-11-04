// =============================================================
// backend/src/common/sepay-service.js
// Tiện ích xử lý thông tin chuyển khoản VietQR và cổng SePay
// =============================================================

/**
 * Định dạng cú pháp nội dung chuyển khoản chuẩn theo nhận diện thương hiệu Petly
 * Ví dụ: formatTransferMemo("ORD173000123") -> "PETLY ORD173000123"
 */
export function formatTransferMemo(orderCode) {
  if (!orderCode) return "PETLY";
  const cleanCode = String(orderCode).trim().toUpperCase();
  return `PETLY ${cleanCode}`;
}

/**
 * Trích xuất mã đơn hàng từ chuỗi nội dung chuyển khoản của SePay
 * Ví dụ: "PETLY ORD173000123 chuyen tien" -> "ORD173000123"
 */
export function extractOrderCodeFromMemo(content) {
  if (!content || typeof content !== "string") return null;

  // Khớp cú pháp chuẩn PETLY <orderCode> (VD: PETLY ORD123456)
  const petlyMatch = content.match(/PETLY\s*[:\-_]?\s*(ORD\d+)/i);
  if (petlyMatch && petlyMatch[1]) {
    return petlyMatch[1].toUpperCase();
  }

  // Khớp dự phòng nếu người chuyển chỉ ghi mã ORD123456 mà bỏ sót chữ PETLY
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
  const safeMemo = encodeURIComponent(String(memo || "").trim());

  // Link SePay QR Generator chuẩn
  const sepayQrUrl = `https://qr.sepay.vn/img?acc=${safeAcc}&bank=${safeBank}&amount=${safeAmount}&des=${safeMemo}`;

  return sepayQrUrl;
}

/**
 * Sinh chuỗi payload text thô VietQR theo quy chuẩn Napas (nếu cần render canvas nội bộ)
 */
export function generateVietQrPayload({ bankCode, accountNumber, amount, memo }) {
  // Chuỗi mô tả cơ bản định dạng VietQR Quicklink
  return `vietqr://${bankCode}/${accountNumber}?amount=${amount}&memo=${encodeURIComponent(memo)}`;
}

