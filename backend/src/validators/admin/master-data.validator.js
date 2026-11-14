import { z } from "zod";
import { MASTER_DATA_KINDS } from "../../models/master-data.model.js";
import { listQueryShape } from "./list-query.js";

export const masterDataListQuerySchema = z.object({
 ...listQueryShape,
 kind: z.enum(MASTER_DATA_KINDS).default("petType"),
 status: z.enum(["all", "active", "inactive"]).default("all"),
});

// The rules every master data form shares, so create and edit cannot disagree.
const shared = {
 name: z.string({ error: "Tên không hợp lệ." }).trim().min(1, "Nhập tên.").max(100, "Tên tối đa 100 ký tự."),
 description: z.string({ error: "Mô tả không hợp lệ." }).trim().max(300, "Mô tả tối đa 300 ký tự."),
 isActive: z.boolean({ error: "Trạng thái không hợp lệ." }),
};

/** Only breeds have a pet type, and only shipping methods have a fee; elsewhere they are unknown keys. */
const extras = {
 breed: { petTypeCode: z.string({ error: "Chọn loài thú cưng." }).trim().min(1, "Chọn loài thú cưng.").max(60, "Loài thú cưng không hợp lệ.").toUpperCase() },
 shippingMethod: {
  fee: z.number({ error: "Phí là số nguyên từ 0." }).int("Phí là số nguyên từ 0.").min(0, "Phí là số nguyên từ 0.").max(100000000, "Phí quá lớn."),
 },
};

/** The new row of `kind`. The code is assigned by the server, so it is an unknown key. */
export function masterDataCreateSchema(kind) {
 return z.object({
  name: shared.name,
  description: shared.description.default(""),
  isActive: shared.isActive.default(true),
  ...extras[kind],
 }).strict();
}

/** The changed fields of a row of `kind`, plus the `updatedAt` the modal was loaded with. */
export function masterDataPatchSchema(kind) {
 const fields = { ...shared, ...extras[kind] };
 return z.object({
  expectedUpdatedAt: z.string({ error: "Thiếu thời điểm tải dữ liệu." }).refine((value) => Number.isFinite(Date.parse(value)), "Thời điểm tải dữ liệu không hợp lệ."),
  ...Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])),
 }).strict();
}

export const masterDataKindSchema = z.enum(MASTER_DATA_KINDS);
