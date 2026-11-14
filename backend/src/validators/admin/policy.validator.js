import { z } from "zod";

const STATUS_VALUES = [
  "published",
  "draft",
  "suspended",
  "Đã công bố",
  "Bản nháp",
  "Tạm ngưng",
];

export const updatePolicySchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200).optional(),
  content: z.string().trim().max(20000, "Nội dung chính sách tối đa 20.000 ký tự").optional(),
  status: z.enum(STATUS_VALUES).optional(),
  effectiveDate: z.string().trim().max(50).optional(),
});
