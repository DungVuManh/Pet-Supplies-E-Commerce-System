import assert from "node:assert/strict";
import { test } from "node:test";
import { validateLogin, validateRegister } from "../features/auth/validation.ts";

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const validRegistration = {
  fullName: "Nguyễn Minh Anh",
  phone: "0912345678",
  email: "minhanh@example.com",
  password: "Petly123",
  confirmPassword: "Petly123",
  terms: "on",
};

test("login accepts email and Vietnamese phone formats without imposing registration password rules", () => {
  for (const identifier of [" minhanh@example.com ", "0912345678", "+84 912 345 678"]) {
    assert.deepEqual(validateLogin(form({ identifier, password: "old-password" })), {});
  }
});

test("login rejects missing credentials and malformed identifiers", () => {
  assert.deepEqual(Object.keys(validateLogin(form({}))), ["identifier", "password"]);
  for (const identifier of ["hello", "a@b", "1234567890", "0912abc678"]) {
    assert.ok(validateLogin(form({ identifier, password: "password" })).identifier);
  }
});

test("registration accepts valid data including international phone prefix", () => {
  assert.deepEqual(validateRegister(form(validRegistration)), {});
  assert.deepEqual(validateRegister(form({ ...validRegistration, phone: "+84912345678" })), {});
});

test("registration checks every required field", () => {
  assert.equal(Object.keys(validateRegister(form({}))).length, 6);
});

test("registration enforces password guidance and exact confirmation", () => {
  for (const password of ["Short1", "lowercase1", "UPPERCASE1", "NoNumbersHere"]) {
    assert.ok(validateRegister(form({ ...validRegistration, password, confirmPassword: password })).password);
  }
  assert.ok(validateRegister(form({ ...validRegistration, confirmPassword: "Petly123 " })).confirmPassword);
});

test("registration rejects invalid contact details, overlong names, and missing consent", () => {
  const errors = validateRegister(form({ ...validRegistration, fullName: " ", email: "invalid", phone: "abcd", terms: "" }));
  assert.deepEqual(Object.keys(errors), ["fullName", "phone", "email", "terms"]);
  assert.ok(validateRegister(form({ ...validRegistration, fullName: "a".repeat(101) })).fullName);
});
