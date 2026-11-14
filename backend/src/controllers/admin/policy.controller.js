import { readFileSync } from "node:fs";
import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { Policy } from "../../models/policy.model.js";
import { createPolicySchema, updatePolicySchema } from "../../validators/admin/policy.validator.js";

const STATUS_TO_VN = {
  published: "Đã công bố",
  draft: "Bản nháp",
  suspended: "Tạm ngưng",
};

const VN_TO_STATUS = {
  "Đã công bố": "published",
  "Bản nháp": "draft",
  "Tạm ngưng": "suspended",
  published: "published",
  draft: "draft",
  suspended: "suspended",
};

export const DEFAULT_POLICIES = JSON.parse(
  readFileSync(new URL("./all-default-policies.json", import.meta.url), "utf8")
);

/** Ensures initial default policies exist in the database and have slug set */
export async function ensureDefaultPolicies() {
  try {
    for (const item of DEFAULT_POLICIES) {
      const { slug, ...rest } = item;
      await Policy.updateOne(
        { code: item.code },
        {
          $setOnInsert: rest,
          $set: { slug: item.slug },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.warn("[policies] Could not verify or seed default policies", error?.message);
  }
}

function formatLastUpdated(policy, actor) {
  const raw = policy.updatedAt || policy.createdAt;
  const d = raw ? new Date(raw) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(validDate.getDate())}/${pad(validDate.getMonth() + 1)}/${validDate.getFullYear()}`;
  const actorName = actor?.fullName || actor?.email || "Lê Hoàng Nam";
  return `${dateStr} bởi ${actorName}`;
}

export function formatPolicyDto(policy, actor = null) {
  const user = actor || (policy.updatedBy && typeof policy.updatedBy === "object" ? policy.updatedBy : null);
  const statusVn = STATUS_TO_VN[policy.status] || policy.status || "Đã công bố";

  return {
    id: policy.id || policy.code?.replace(/^POL-/, "").toLowerCase(),
    code: policy.code,
    slug: policy.slug || policy.id || policy.code?.toLowerCase(),
    title: policy.title,
    status: statusVn,
    rawStatus: policy.status,
    effectiveDate: policy.effectiveDate || "01/10/2026",
    lastUpdated: formatLastUpdated(policy, user),
    content: policy.content || "",
    updatedAt: policy.updatedAt,
  };
}

/**
 * GET /api/v1/admin/policies
 * Returns all store policies.
 */
export async function listPolicies(request, response) {
  await ensureDefaultPolicies();

  const policies = await Policy.find()
    .sort({ code: 1 })
    .populate("updatedBy", "fullName email role")
    .lean();

  response.json({
    success: true,
    data: policies.map((p) => formatPolicyDto(p)),
  });
}

/**
 * GET /api/v1/admin/policies/:code
 * Returns detail of one store policy.
 */
export async function getPolicy(request, response) {
  const { code } = request.params;
  const normalized = (code || "").trim().toLowerCase();
  const normalizedUpper = (code || "").trim().toUpperCase();
  const policy = await Policy.findOne({
    $or: [{ code: normalizedUpper }, { id: normalized }, { slug: normalized }],
  })
    .populate("updatedBy", "fullName email role")
    .lean();

  if (!policy) {
    throw new AppError("Không tìm thấy chính sách cửa hàng.", 404, "NOT_FOUND");
  }

  response.json({
    success: true,
    data: formatPolicyDto(policy),
  });
}

/**
 * PUT /api/v1/admin/policies/:code
 * Updates content, status, and effective date of a store policy. Audited.
 */
export async function updatePolicy(request, response) {
  const { code } = request.params;
  const parsed = updatePolicySchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError("Dữ liệu cập nhật chính sách không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const { title, content, status, effectiveDate } = parsed.data;

  const normalized = (code || "").trim().toLowerCase();
  const normalizedUpper = (code || "").trim().toUpperCase();
  const policy = await Policy.findOne({
    $or: [{ code: normalizedUpper }, { id: normalized }, { slug: normalized }],
  });

  if (!policy) {
    throw new AppError("Không tìm thấy chính sách cửa hàng.", 404, "NOT_FOUND");
  }

  const before = {
    title: policy.title,
    status: policy.status,
    effectiveDate: policy.effectiveDate,
    content: policy.content,
  };

  if (title !== undefined) policy.title = title;
  if (content !== undefined) policy.content = content;
  if (status !== undefined) policy.status = VN_TO_STATUS[status] || status;
  if (effectiveDate !== undefined) policy.effectiveDate = effectiveDate;
  if (request.user?._id) policy.updatedBy = request.user._id;

  await policy.save();

  const after = {
    title: policy.title,
    status: policy.status,
    effectiveDate: policy.effectiveDate,
    content: policy.content,
  };

  await recordAudit(request, {
    action: "policies.update",
    target: { collectionName: "policies", id: policy.code },
    before,
    after,
    summary: `Cập nhật chính sách: ${policy.title}`,
  });

  response.json({
    success: true,
    message: `Đã lưu và công bố “${policy.title}” thành công.`,
    data: formatPolicyDto(policy.toObject ? policy.toObject() : policy, request.user),
  });
}

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * POST /api/v1/admin/policies
 * Creates a new store policy. Audited.
 */
export async function createPolicy(request, response) {
  const parsed = createPolicySchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError("Dữ liệu tạo chính sách không hợp lệ.", 400, "VALIDATION_ERROR");
  }

  const { title, content, effectiveDate } = parsed.data;

  const rawSlug = parsed.data.slug || slugify(title) || `chinh-sach-${Date.now().toString(36)}`;
  const slug = rawSlug.trim().toLowerCase();
  const rawCode = parsed.data.code || `POL-${slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20)}`;
  const code = rawCode.trim().toUpperCase();
  const id = slug;

  const existing = await Policy.findOne({
    $or: [{ code }, { id }, { slug }],
  });

  if (existing) {
    throw new AppError("Mã chính sách hoặc đường dẫn đã tồn tại.", 409, "DUPLICATE_POLICY");
  }

  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const defaultDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  const policy = await Policy.create({
    code,
    id,
    slug,
    title,
    content: content || "",
    status: "published",
    effectiveDate: effectiveDate || defaultDate,
    updatedBy: request.user?._id || null,
  });

  await recordAudit(request, {
    action: "policies.create",
    target: { collectionName: "policies", id: policy.code },
    after: {
      code: policy.code,
      title: policy.title,
      status: policy.status,
    },
    summary: `Tạo mới chính sách: ${policy.title}`,
  });

  response.status(201).json({
    success: true,
    message: `Đã tạo chính sách “${policy.title}” thành công.`,
    data: formatPolicyDto(policy.toObject ? policy.toObject() : policy, request.user),
  });
}

/**
 * DELETE /api/v1/admin/policies/:code
 * Deletes a store policy. Audited.
 */
export async function deletePolicy(request, response) {
  const { code } = request.params;
  const normalized = (code || "").trim().toLowerCase();
  const normalizedUpper = (code || "").trim().toUpperCase();

  const policy = await Policy.findOne({
    $or: [{ code: normalizedUpper }, { id: normalized }, { slug: normalized }],
  });

  if (!policy) {
    throw new AppError("Không tìm thấy chính sách để xóa.", 404, "NOT_FOUND");
  }

  const before = {
    code: policy.code,
    title: policy.title,
    status: policy.status,
  };

  await Policy.deleteOne({ _id: policy._id });

  await recordAudit(request, {
    action: "policies.delete",
    target: { collectionName: "policies", id: policy.code },
    before,
    summary: `Xóa chính sách: ${policy.title}`,
  });

  response.json({
    success: true,
    message: `Đã xóa chính sách “${policy.title}” thành công.`,
    data: { code: policy.code, id: policy.id },
  });
}
