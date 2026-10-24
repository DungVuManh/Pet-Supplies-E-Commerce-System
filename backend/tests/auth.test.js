import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository, User } from "../src/models/user.model.js";

const DAY = 24 * 60 * 60 * 1000;
const now = 1_800_000_000_000;
const claims = {
 uid: "firebase-customer",
 email: "customer@example.com",
 auth_time: now / 1000,
 firebase: { sign_in_provider: "password" },
};
const profile = {
 _id: "mongo-customer",
 firebaseUid: claims.uid,
 email: claims.email,
 fullName: "Khách hàng Petjoy",
 phone: "0912345678",
 role: "customer",
 secret: "never-return",
};
const config = parseEnvironment({ NODE_ENV: "test" });
let admin, users, app;
afterEach(() => vi.restoreAllMocks());
async function browser(target = app) {
 const agent = request.agent(target);
 const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
 const send = (method, path, body = {}) =>
  agent[method](`/api/v1/auth/${path}`)
   .set("Origin", "http://localhost:3000")
   .set("X-CSRF-Token", csrf.body.data.csrfToken)
   .send(body);
 return { agent, csrf, send };
}

describe("authentication HTTP boundary", () => {
 beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(Date, "now").mockReturnValue(now);
  admin = {
   verifyIdToken: vi.fn().mockResolvedValue(claims),
   createSessionCookie: vi.fn().mockResolvedValue("signed-session"),
   verifySessionCookie: vi.fn().mockResolvedValue(claims),
  };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(admin);
  users = {
   findByUid: vi.spyOn(userRepository, "findByUid").mockResolvedValue(profile),
   createIfMissing: vi
    .spyOn(userRepository, "createIfMissing")
    .mockResolvedValue(profile),
  };
  app = createApp(config);
 });

 it("issues a no-store HttpOnly CSRF cookie and rejects mutation without matching origin/token/JSON", async () => {
  const { agent, csrf } = await browser();
  expect(csrf.headers["cache-control"]).toBe("no-store");
  expect(csrf.headers["set-cookie"][0]).toContain("HttpOnly");
  for (const headers of [
   {},
   { Origin: "http://localhost:3000" },
   { Origin: "http://localhost:3000", "X-CSRF-Token": "x".repeat(43) },
   { Origin: "https://evil.example", "X-CSRF-Token": csrf.body.data.csrfToken },
   { "X-CSRF-Token": csrf.body.data.csrfToken },
  ]) {
   const response = await agent
    .post("/api/v1/auth/session")
    .set(headers)
    .send({ idToken: "token" });
   expect(response.status).toBe(403);
   expect(response.headers["cache-control"]).toBe("no-store");
  }
  await agent
   .post("/api/v1/auth/session")
   .set("Origin", "http://localhost:3000")
   .set("X-CSRF-Token", csrf.body.data.csrfToken)
   .type("form")
   .send({ idToken: "token" })
   .expect(415);
  expect(admin.verifyIdToken).not.toHaveBeenCalled();
 });

 it("signs in with a bounded browser-session cookie and returns only the public profile", async () => {
  const { send } = await browser();
  const response = await send("post", "session", { idToken: "token" }).expect(
   200,
  );
  expect(admin.verifyIdToken).toHaveBeenCalledWith("token", true);
  expect(admin.createSessionCookie).toHaveBeenCalledWith("token", {
   expiresIn: DAY,
  });
  const cookie = response.headers["set-cookie"][0];
  expect(cookie).toContain("petly-session=signed-session");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).not.toContain("Max-Age");
  expect(cookie).not.toContain("Expires");
  expect(response.body.data.user).toEqual({
   id: "mongo-customer",
   email: claims.email,
   fullName: profile.fullName,
   phone: profile.phone,
   role: "customer",
  });
  expect(JSON.stringify(response.body)).not.toMatch(
   /signed-session|never-return|firebaseUid/,
  );
 });

 it("remembers a session for 14 days and uses Secure host cookies in production", async () => {
  const production = createApp({ ...config, NODE_ENV: "production" });
  const csrf = await request(production).get("/api/v1/auth/csrf");
  const response = await request(production)
   .post("/api/v1/auth/session")
   .set("Cookie", csrf.headers["set-cookie"][0].split(";")[0])
   .set("Origin", "http://localhost:3000")
   .set("X-CSRF-Token", csrf.body.data.csrfToken)
   .send({ idToken: "token", remember: true })
   .expect(200);
  expect(admin.createSessionCookie).toHaveBeenCalledWith("token", {
   expiresIn: 14 * DAY,
  });
  expect(response.headers["set-cookie"][0]).toMatch(/^__Host-petly-session=/);
  expect(response.headers["set-cookie"][0]).toContain("Secure");
  expect(response.headers["set-cookie"][0]).toContain("Max-Age=1209600");
  expect(response.headers["set-cookie"][0]).not.toContain("Domain=");
 });

 it("requires a session, checks revocation, clears rejected sessions and signs out", async () => {
  const { agent, send } = await browser();
  await agent.get("/api/v1/auth/me").expect(401);
  await send("post", "session", { idToken: "token" }).expect(200);
  const me = await agent.get("/api/v1/auth/me").expect(200);
  expect(me.headers["cache-control"]).toBe("no-store");
  expect(admin.verifySessionCookie).toHaveBeenCalledWith(
   "signed-session",
   true,
  );
  await send("delete", "session").expect(204);
  await agent.get("/api/v1/auth/me").expect(401);
  await send("post", "session", { idToken: "token" }).expect(200);
  admin.verifySessionCookie.mockRejectedValue({
   code: "auth/session-cookie-revoked",
  });
  const revoked = await agent.get("/api/v1/auth/me").expect(401);
  expect(revoked.headers["set-cookie"][0]).toContain(
   "Expires=Thu, 01 Jan 1970",
  );
 });

 it.each([
  "auth/invalid-id-token",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/user-disabled",
 ])("rejects %s without database writes or session issuance", async (code) => {
  admin.verifyIdToken.mockRejectedValue({ code });
  const { send } = await browser();
  const response = await send("post", "register", {
   idToken: "bad",
   fullName: "Khách hàng",
   phone: "0912345678",
   terms: true,
  }).expect(401);
  expect(response.body.error.code).toBe("UNAUTHENTICATED");
  expect(users.createIfMissing).not.toHaveBeenCalled();
  expect(admin.createSessionCookie).not.toHaveBeenCalled();
 });

 it("rejects old, future or missing authentication time and non-password accounts", async () => {
  const { send } = await browser();
  for (const auth_time of [now / 1000 - 300, undefined]) {
   admin.verifyIdToken.mockResolvedValue({ ...claims, auth_time });
   const response = await send("post", "session", { idToken: "token" }).expect(
    401,
   );
   expect(response.body.error.code).toBe("RECENT_LOGIN_REQUIRED");
  }
  admin.verifyIdToken.mockResolvedValue({
   ...claims,
   auth_time: now / 1000 + 83,
  });
  const clockError = await send("post", "session", { idToken: "token" }).expect(
   503,
  );
  expect(clockError.body.error.code).toBe("AUTH_CLOCK_SKEW");
  expect(admin.createSessionCookie).not.toHaveBeenCalled();
  expect(console.warn).toHaveBeenCalledWith(
   "[auth] Recent sign-in check rejected",
   {
    reason: "server-clock-behind",
    ageSeconds: -83,
   },
  );
  admin.verifyIdToken.mockResolvedValue({
   ...claims,
   firebase: { sign_in_provider: "google.com" },
  });
  await send("post", "session", { idToken: "token" }).expect(401);
 });

 it("rejects invalid fields and attempted client-supplied identity or role", async () => {
  const { send } = await browser();
  const valid = {
   idToken: "token",
   fullName: "Khách hàng",
   phone: "0912345678",
   terms: true,
  };
  for (const fields of [
   { role: "admin" },
   { email: "attacker@example.com" },
   { firebaseUid: "someone-else" },
   { fullName: "x" },
   { phone: "bad" },
   { terms: false },
   { remember: "true" },
   { password: "secret" },
  ]) {
   await send("post", "register", { ...valid, ...fields }).expect(400);
  }
  await send("post", "session", { idToken: "token", role: "admin" }).expect(
   400,
  );
  expect(admin.verifyIdToken).not.toHaveBeenCalled();
 });

 it("recovers a missing profile with a retry after a database failure", async () => {
  const { send } = await browser();
  users.findByUid.mockResolvedValue(null);
  const incomplete = await send("post", "session", { idToken: "token" }).expect(
   409,
  );
  expect(incomplete.body.error.code).toBe("PROFILE_INCOMPLETE");
  users.createIfMissing.mockRejectedValueOnce(
   new Error("private database URI"),
  );
  const input = {
   idToken: "token",
   fullName: profile.fullName,
   phone: "+84 912 345 678",
   terms: true,
  };
  const unavailable = await send("post", "register", input).expect(503);
  expect(JSON.stringify(unavailable.body)).not.toContain("private");
  expect(admin.createSessionCookie).not.toHaveBeenCalled();
  await send("post", "register", input).expect(200);
  expect(users.createIfMissing).toHaveBeenLastCalledWith(claims.uid, {
   email: claims.email,
   fullName: profile.fullName,
   phone: "+84912345678",
  });
 });

 it("reports dependency failure as 503, not a fabricated guest or successful login", async () => {
  const { send } = await browser();
  admin.verifyIdToken.mockRejectedValue(
   new Error("private service-account details"),
  );
  const response = await send("post", "session", { idToken: "token" }).expect(
   503,
  );
  expect(response.body.error.code).toBe("AUTH_UNAVAILABLE");
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(console.warn).toHaveBeenCalledWith(
   "[auth] Firebase request rejected",
   {
    operation: "verify-id-token",
    code: "unknown",
   },
  );
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain(
   "private service-account details",
  );
 });

 it.each(["customer", "staff", "admin"])("supports %s login, me and repeated registration without changing the role", async (role) => {
  const existing = { ...profile, role };
  users.findByUid.mockResolvedValue(existing);
  users.createIfMissing.mockResolvedValue(existing);
  const { agent, send } = await browser();
  const signedIn = await send("post", "session", { idToken: "token" }).expect(200);
  expect(signedIn.body.data.user.role).toBe(role);
  expect((await agent.get("/api/v1/auth/me").expect(200)).body.data.user.role).toBe(role);
  const repeated = await send("post", "register", {
   idToken: "token", fullName: profile.fullName, phone: profile.phone, terms: true,
  }).expect(200);
  expect(repeated.body.data.user.role).toBe(role);
  expect(users.createIfMissing).toHaveBeenCalledWith(claims.uid, {
   email: claims.email, fullName: profile.fullName, phone: profile.phone,
  });
 });

 it.each(["staff", "admin"])("enforces the full role matrix on the %s dashboard API", async (requiredRole) => {
  const path = `/api/v1/${requiredRole}/dashboard`;
  const guest = await request(app).get(path).expect(401);
  expect(guest.body.error.code).toBe("UNAUTHENTICATED");
  expect(guest.headers["cache-control"]).toBe("no-store");
  for (const role of ["customer", "staff", "admin"]) {
   users.findByUid.mockResolvedValue({ ...profile, role });
   const response = await request(app).get(path)
    .set("Cookie", "petly-session=signed-session")
    .expect(role === requiredRole ? 200 : 403);
   expect(response.headers["cache-control"]).toBe("no-store");
   if (role === requiredRole) {
    expect(response.body.data.user).toEqual({
     id: profile._id, email: profile.email, fullName: profile.fullName, phone: profile.phone, role,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/never-return|firebaseUid|signed-session/);
   } else {
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(response.body.data).toBeUndefined();
   }
  }
  expect(admin.verifySessionCookie).toHaveBeenCalledWith("signed-session", true);
 });

 it.each(["auth/invalid-session-cookie", "auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/user-disabled"])("rejects %s on both dashboard APIs", async (code) => {
  admin.verifySessionCookie.mockRejectedValue({ code });
  for (const role of ["staff", "admin"]) {
   const response = await request(app).get(`/api/v1/${role}/dashboard`)
    .set("Cookie", "petly-session=bad-session").expect(401);
   expect(response.body.error.code).toBe("UNAUTHENTICATED");
   expect(response.headers["cache-control"]).toBe("no-store");
   expect(response.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
  }
  expect(users.findByUid).not.toHaveBeenCalled();
 });

 it.each([undefined, "manager", "", null])("denies invalid persisted role %s on login, me and dashboards", async (role) => {
  users.findByUid.mockResolvedValue({ ...profile, role });
  const { send } = await browser();
  await send("post", "session", { idToken: "token" }).expect(403);
  expect(admin.createSessionCookie).not.toHaveBeenCalled();
  for (const path of ["auth/me", "staff/dashboard", "admin/dashboard"]) {
   const response = await request(app).get(`/api/v1/${path}`)
    .set("Cookie", "petly-session=signed-session").expect(403);
   expect(response.body.error.code).toBe("FORBIDDEN");
  }
 });

 it.each(["staff", "admin"])("reads %s permissions again after a role change in the same session", async (role) => {
  const { agent, send } = await browser();
  users.findByUid.mockResolvedValue({ ...profile, role });
  await send("post", "session", { idToken: "token" }).expect(200);
  await agent.get(`/api/v1/${role}/dashboard`).expect(200);
  users.findByUid.mockResolvedValue(profile);
  await agent.get(`/api/v1/${role}/dashboard`).expect(403);
  expect((await agent.get("/api/v1/auth/me").expect(200)).body.data.user.role).toBe("customer");
 });

 it("preserves incomplete-profile and dependency errors on protected APIs", async () => {
  const get = (path) => request(app).get(`/api/v1/${path}`).set("Cookie", "petly-session=signed-session");
  for (const path of ["auth/me", "staff/dashboard", "admin/dashboard"]) {
   users.findByUid.mockResolvedValue(null);
   expect((await get(path).expect(409)).body.error.code).toBe("PROFILE_INCOMPLETE");
   users.findByUid.mockRejectedValue(new Error("private database URI"));
   const failure = await get(path).expect(503);
   expect(failure.body.error.code).toBe("PROFILE_UNAVAILABLE");
   expect(JSON.stringify(failure.body)).not.toContain("private");
   expect(failure.headers["cache-control"]).toBe("no-store");
  }
  admin.verifySessionCookie.mockRejectedValue(new Error("private credentials"));
  expect((await get("staff/dashboard").expect(503)).body.error.code).toBe("AUTH_UNAVAILABLE");
 });

 it("accepts only the production host session cookie in production", async () => {
  const production = createApp({ ...config, NODE_ENV: "production" });
  users.findByUid.mockResolvedValue({ ...profile, role: "admin" });
  await request(production).get("/api/v1/admin/dashboard")
   .set("Cookie", "petly-session=signed-session").expect(401);
  await request(production).get("/api/v1/admin/dashboard")
   .set("Cookie", "__Host-petly-session=signed-session").expect(200);
 });
});

describe("profile persistence", () => {
 it("allows exactly three roles and defaults new profiles to customer", async () => {
  expect(User.schema.path("role").enumValues).toEqual(["customer", "staff", "admin"]);
  expect(new User().role).toBe("customer");
  const invalid = new User({
   firebaseUid: claims.uid, email: profile.email, fullName: profile.fullName,
   phone: profile.phone, termsAcceptedAt: new Date(), role: "manager",
  });
  await expect(invalid.validate()).rejects.toMatchObject({ errors: { role: { path: "role" } } });
 });
 it("uses a unique UID index and insert-only update so repeated registration cannot replace a profile", async () => {
  expect(User.schema.path("firebaseUid").options.unique).toBe(true);
  const update = vi
   .spyOn(User, "findOneAndUpdate")
   .mockReturnValue({ lean: () => Promise.resolve(profile) });
  await userRepository.createIfMissing(claims.uid, {
   email: claims.email,
   fullName: profile.fullName,
   phone: profile.phone,
  });
  const [filter, changes, options] = update.mock.calls[0];
  expect(filter).toEqual({ firebaseUid: claims.uid });
  expect(changes.$set).toBeUndefined();
  expect(changes.$setOnInsert.role).toBe("customer");
  expect(options).toMatchObject({ upsert: true, runValidators: true });
  update.mockRestore();
 });
});
