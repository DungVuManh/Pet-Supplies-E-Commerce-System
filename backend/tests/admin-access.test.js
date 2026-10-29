import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import adminRouter from "../src/routers/admin.router.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

// Every route registered on the Admin router, with params filled by a dummy id,
// so routes added in later phases are covered without editing this file.
const routes = adminRouter.stack.filter((layer) => layer.route).flatMap((layer) =>
 Object.keys(layer.route.methods).map((method) => ({
  method: method.toUpperCase(),
  path: "/api/v1/admin" + layer.route.path.replace(/:\w+/g, "000000000000000000000000"),
 })));
const mutations = routes.filter((route) => route.method !== "GET");
const label = ({ method, path }) => `${method} ${path}`;

let admin;
beforeEach(() => {
 admin = createAdminTestApp();
 vi.spyOn(AuditLog, "create").mockResolvedValue({});
});
afterEach(() => vi.restoreAllMocks());

describe("Admin route access", () => {
 it("registers the Admin routes", () => {
  expect(routes.map(label)).toEqual(expect.arrayContaining([
   "GET /api/v1/admin/dashboard", "GET /api/v1/admin/inventory",
  ]));
 });

 it.each(routes.map((route) => [label(route), route]))("%s rejects guests with 401", async (_name, route) => {
  admin.session.role = null;
  const response = await admin.send(route.method, route.path).expect(401);
  expect(response.body.error.code).toBe("UNAUTHENTICATED");
  expect(admin.auth.verifySessionCookie).not.toHaveBeenCalled();
 });

 it.each(routes.flatMap((route) => ["customer", "staff"].map((role) => [label(route), role, route])))(
  "%s rejects %s with 403 and audits the denial",
  async (_name, role, route) => {
   admin.session.role = role;
   const response = await admin.send(route.method, route.path).expect(403);
   expect(response.body).toEqual({ success: false, message: expect.any(String), error: { code: "FORBIDDEN" } });
   expect(AuditLog.create).toHaveBeenCalledTimes(1);
   expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
    actorId: admin.user(role)._id,
    action: "admin.access",
    target: { collectionName: "routes", id: `${route.method} ${route.path}` },
    result: "denied",
   });
  },
 );

 it.each(mutations.map((route) => [label(route), route]))("%s requires the CSRF pair", async (_name, route) => {
  const response = await admin.send(route.method, route.path, {}, { csrf: false }).expect(403);
  expect(response.body.error.code).toBe("CSRF_INVALID");
 });

 it("does not audit Staff routes refused to an Admin", async () => {
  await admin.send("GET", "/api/v1/staff/dashboard").expect(403);
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("still answers when the denial cannot be audited", async () => {
  AuditLog.create.mockRejectedValue(new Error("database down"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  admin.session.role = "staff";
  const response = await admin.send("GET", "/api/v1/admin/dashboard").expect(403);
  expect(response.body.error.code).toBe("FORBIDDEN");
  expect(console.error).toHaveBeenCalledWith("[audit] Failed to record audit entry", { action: "admin.access" });
 });

 it("keeps the Admin dashboard response", async () => {
  const response = await admin.send("GET", "/api/v1/admin/dashboard").expect(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body).toMatchObject({ success: true, data: { user: { email: "admin@example.test", role: "admin" } } });
 });
});
