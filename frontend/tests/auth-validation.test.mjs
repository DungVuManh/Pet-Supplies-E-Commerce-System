import assert from "node:assert/strict";
import { test } from "node:test";
import { validateLogin, validateRegister, validateProfile, validateResetEmail } from "../features/auth/validation.ts";

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

test("login accepts email without imposing registration password rules", () => {
  for (const identifier of [" minhanh@example.com ", "other@example.com"]) {
    assert.deepEqual(validateLogin(form({ identifier, password: "123456" })), {});
  }
});

test("login rejects missing credentials and malformed identifiers", () => {
  assert.deepEqual(Object.keys(validateLogin(form({}))), ["identifier", "password"]);
  for (const identifier of ["hello", "a@b", "1234567890", "0912345678", "+84 912 345 678", "0912abc678"]) {
    assert.ok(validateLogin(form({ identifier, password: "password" })).identifier);
  }
});

test("registration accepts valid data including international phone prefix", () => {
  assert.deepEqual(validateRegister(form(validRegistration)), {});
  assert.deepEqual(validateRegister(form({ ...validRegistration, phone: "+84912345678" })), {});
});

test("registration checks every required field", () => {
  assert.equal(Object.keys(validateRegister(form({}))).length, 6);
  const errors = validateRegister(form({ fullName: validRegistration.fullName, phone: validRegistration.phone }));
  assert.equal(Object.keys(errors)[0], "email", "focus follows the visible form order before consent");
});

test("registration requires more than six non-whitespace characters", () => {
  for (const password of ["Short1", "123456", " 123456 ", "a b c d e f", "      ", "\t\n ", "😀😀😀😀😀😀"]) {
    assert.ok(validateRegister(form({ ...validRegistration, password, confirmPassword: password })).password);
  }
  for (const password of ["abcdefg", "ABCDEFG", "1234567", "!@#$%^&", "a b c d e f g", "\t1234567\t", "😀😀😀😀😀😀😀"]) {
    assert.deepEqual(validateRegister(form({ ...validRegistration, password, confirmPassword: password })), {});
  }
});

test("registration requires exact confirmation including whitespace", () => {
  assert.ok(validateRegister(form({ ...validRegistration, confirmPassword: "Petly123 " })).confirmPassword);
  assert.ok(validateRegister(form({ ...validRegistration, password: "a b c d e f g", confirmPassword: "abcdefg" })).confirmPassword);
});

test("registration rejects invalid contact details, overlong names, and missing consent", () => {
  const errors = validateRegister(form({ ...validRegistration, fullName: " ", email: "invalid", phone: "abcd", terms: "" }));
  assert.deepEqual(new Set(Object.keys(errors)), new Set(["fullName", "phone", "email", "terms"]));
  assert.ok(validateRegister(form({ ...validRegistration, fullName: "a".repeat(101) })).fullName);
});

test("profile completion requires contact details and consent without requesting a password again", () => {
  assert.deepEqual(validateProfile(form(validRegistration)), {});
  assert.deepEqual(Object.keys(validateProfile(form({}))), ["fullName", "phone", "terms"]);
});

test("password reset accepts only an email address", () => {
  assert.deepEqual(validateResetEmail(form({ email: " customer@example.com " })), {});
  for (const email of ["", "bad", "0912345678"]) assert.ok(validateResetEmail(form({ email })).email);
});
