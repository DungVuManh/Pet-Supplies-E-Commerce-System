import { AuditLog } from "../models/audit-log.model.js";

const secretKey = /password|secret|token|cookie|csrf|credential|authorization/i;

/** Copies a before/after snapshot without any field whose name looks like a secret. */
export function stripSecrets(value) {
 if (Array.isArray(value)) return value.map(stripSecrets);
 if (value instanceof Date || value === null || typeof value !== "object") return value;
 if (typeof value.toHexString === "function") return value.toHexString();
 return Object.fromEntries(Object.entries(value)
  .filter(([key]) => !secretKey.test(key))
  .map(([key, item]) => [key, stripSecrets(item)]));
}

/**
 * Writes one audit entry for the signed-in actor. The audit log is secondary to
 * the action itself, so a failed write is logged and never fails the response.
 * `target` is `{ collectionName, id }`; returns the saved entry or null.
 */
export async function recordAudit(request, { action, target, before, after, result = "success", summary }) {
 try {
  if (!request.user?._id) throw new Error("missing actor");
  return await AuditLog.create({
   actorId: request.user._id,
   action,
   target: { collectionName: target.collectionName, id: String(target.id) },
   before: before === undefined ? undefined : stripSecrets(before),
   after: after === undefined ? undefined : stripSecrets(after),
   ip: request.ip,
   result,
   summary,
   at: new Date(),
  });
 } catch {
  // Raw errors can contain request data; log only the action.
  console.error("[audit] Failed to record audit entry", { action });
  return null;
 }
}
