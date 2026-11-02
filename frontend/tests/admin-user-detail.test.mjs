import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage } from "../features/auth/errors.ts";
import { adminStatusTone, userActivityStatusLabels } from "../features/admin/status.ts";
import { validateLockReason } from "../features/admin/validation.ts";

test("a lock reason must be 3 to 200 characters once trimmed", () => {
  for (const reason of ["", "  ", " ab ", "x".repeat(201)]) assert.notEqual(validateLockReason(reason), "", JSON.stringify(reason));
  for (const reason of ["abc", " abc ", "x".repeat(200)]) assert.equal(validateLockReason(reason), "");
});

test("every order status and audit result has a badge", () => {
  for (const status of ["pending", "confirmed", "processing", "shipping", "completed", "cancelled", "success", "denied"]) {
    assert.ok(adminStatusTone(userActivityStatusLabels[status]), status);
  }
  assert.equal(userActivityStatusLabels.completed, "Hoàn thành");
  assert.equal(userActivityStatusLabels.denied, "Bị từ chối");
});

test("the login form explains a locked account (MSG07)", () => {
  assert.equal(authErrorMessage({ code: "ACCOUNT_LOCKED" }), "Tài khoản đang bị khóa.");
});
