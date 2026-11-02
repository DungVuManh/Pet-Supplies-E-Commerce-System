// =============================================================
// features/support/types.ts
// Các kiểu dữ liệu cho tính năng Hỗ trợ & Liên hệ khách hàng
// =============================================================

export type ContactSubject =
  | "consulting"
  | "order"
  | "warranty"
  | "partnership"
  | "feedback"
  | "other";

export type ContactFormData = {
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
};
