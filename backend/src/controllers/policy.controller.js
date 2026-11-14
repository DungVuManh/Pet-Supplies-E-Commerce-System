import { AppError } from "../common/errors/app-error.js";
import { Policy } from "../models/policy.model.js";
import { buildLookupQuery, ensureDefaultPolicies } from "./admin/policy.controller.js";

/**
 * Formats a policy document for guest / public display.
 */
function formatPublicPolicy(policy) {
  return {
    code: policy.code,
    id: policy.id,
    slug: policy.slug || policy.id,
    title: policy.title,
    content: policy.content || "",
    status: policy.status,
    effectiveDate: policy.effectiveDate || "01/10/2026",
    updatedAt: policy.updatedAt || policy.createdAt || null,
  };
}

/**
 * GET /api/v1/policies
 * Returns all published store policies for guests and storefront visitors.
 */
export async function listPublicPolicies(_request, response) {
  await ensureDefaultPolicies();

  const policies = await Policy.find({ status: "published" })
    .sort({ code: 1 })
    .lean();

  response.json({
    success: true,
    data: policies.map(formatPublicPolicy),
  });
}

/**
 * GET /api/v1/policies/:slug
 * Returns detail of one published store policy (by slug, code, or id).
 */
export async function getPublicPolicy(request, response) {
  await ensureDefaultPolicies();

  const { slug } = request.params;
  const policy = await Policy.findOne(buildLookupQuery(slug)).lean();

  if (!policy) {
    throw new AppError("Không tìm thấy chính sách được yêu cầu.", 404, "NOT_FOUND");
  }

  if (policy.status !== "published") {
    throw new AppError("Chính sách này hiện chưa được công bố.", 404, "POLICY_NOT_PUBLISHED");
  }

  response.json({
    success: true,
    data: formatPublicPolicy(policy),
  });
}
