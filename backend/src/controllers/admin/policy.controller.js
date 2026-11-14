import { recordAudit } from "../../common/audit.js";
import { AppError } from "../../common/errors/app-error.js";
import { Policy } from "../../models/policy.model.js";
import { updatePolicySchema } from "../../validators/admin/policy.validator.js";

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

export const DEFAULT_POLICIES = [
  {
    id: "return",
    code: "POL-RETURN",
    slug: "chinh-sach-doi-tra-hang",
    title: "Chính sách đổi trả",
    status: "published",
    effectiveDate: "01/10/2026",
    content: `1. Điều kiện đổi trả
Khách hàng có thể yêu cầu đổi trả trong 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi, hư hỏng hoặc giao sai. Sản phẩm cần giữ nguyên bao bì, tem nhãn và kèm hóa đơn mua hàng.

2. Sản phẩm không áp dụng
Không nhận đổi trả thức ăn đã mở bao bì, sản phẩm đã sử dụng hoặc hư hỏng do bảo quản sai. Quy định này không áp dụng với lỗi phát sinh từ nhà sản xuất.

3. Cách gửi yêu cầu
Liên hệ hello@petjoy.vn hoặc 1900 6868, cung cấp mã đơn, hình ảnh sản phẩm và mô tả lỗi. Petjoy phản hồi trong 1 ngày làm việc.

4. Phí vận chuyển và hoàn tiền
Petjoy chịu phí vận chuyển nếu giao sai hoặc sản phẩm lỗi. Sau khi xác nhận, tiền được hoàn về phương thức thanh toán ban đầu trong 3–7 ngày làm việc.`,
  },
  {
    id: "cancellation",
    code: "POL-CANCEL",
    slug: "chinh-sach-huy-don",
    title: "Chính sách hủy đơn",
    status: "published",
    effectiveDate: "01/10/2026",
    content: `1. Thời gian yêu cầu hủy đơn
Khách hàng có thể gửi yêu cầu hủy đơn hàng trước khi đơn được đóng gói và bàn giao cho đơn vị vận chuyển.

2. Hủy đơn đã thanh toán trước
Đối với các đơn hàng đã thanh toán qua cổng VNPay hoặc chuyển khoản ngân hàng, yêu cầu hủy sau khi được duyệt sẽ được hoàn tiền tự động về tài khoản thanh toán ban đầu.

3. Đơn hàng đang vận chuyển
Sau khi đơn hàng đã xuất kho và có mã vận đơn, khách hàng không thể hủy trực tiếp trên hệ thống mà cần từ chối nhận hàng khi shipper giao tới.`,
  },
  {
    id: "refund",
    code: "POL-REFUND",
    slug: "chinh-sach-hoan-tien",
    title: "Chính sách hoàn tiền",
    status: "published",
    effectiveDate: "01/10/2026",
    content: `1. Thời gian xử lý hoàn tiền
Tiền hoàn sẽ được chuyển về tài khoản ban đầu trong thời gian từ 3 đến 7 ngày làm việc tùy thuộc vào ngân hàng thụ hưởng.

2. Phương thức hoàn tiền
- Thanh toán VNPay: Hoàn trực tiếp qua cổng thanh toán VNPay.
- Thanh toán chuyển khoản: Chuyển khoản hoàn tiền theo số tài khoản khách hàng cung cấp.
- Thanh toán COD: Hoàn tiền qua tài khoản ngân hàng chính chủ của khách.

3. Phí hoàn tiền
Petjoy miễn phí toàn bộ chi phí phát sinh trong quá trình xử lý hoàn tiền cho khách hàng.`,
  },
  {
    id: "privacy",
    code: "POL-PRIVACY",
    slug: "chinh-sach-bao-mat",
    title: "Chính sách bảo mật",
    status: "published",
    effectiveDate: "01/10/2026",
    content: `1. Thu thập thông tin
Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ cho việc giao hàng và chăm sóc khách hàng: họ tên, số điện thoại, địa chỉ nhận hàng và email.

2. Mục đích sử dụng
Thông tin khách hàng chỉ được dùng để xác nhận đơn hàng, giao hàng và thông báo trạng thái vận đơn. Tuyệt đối không chia sẻ cho bên thứ ba vì mục đích quảng cáo khi chưa có sự đồng ý.

3. Bảo mật thanh toán
Mọi thông tin thẻ và tài khoản ngân hàng được xử lý bảo mật tuyệt đối qua cổng thanh toán đạt tiêu chuẩn PCI-DSS.`,
  },
];

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
