import assert from "node:assert/strict";
import test from "node:test";
import { adminStatusTone, adminStatusTones } from "../features/admin/status.ts";

test("admin status labels map to the designed badge tones", () => {
  const allowed = new Set(["success", "warning", "info", "danger", "neutral"]);
  for (const [status, tone] of Object.entries(adminStatusTones)) assert.ok(allowed.has(tone), `${status} → ${tone}`);
  assert.equal(adminStatusTone("Hoạt động"), "success");
  assert.equal(adminStatusTone("Sắp hết hàng"), "warning");
  assert.equal(adminStatusTone("Đã khóa"), "danger");
  assert.equal(adminStatusTone("Đã ẩn"), "neutral");
});
