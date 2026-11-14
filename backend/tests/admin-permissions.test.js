import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "../src/common/permissions.js";
import { User } from "../src/models/user.model.js";
import workspaceRouter from "../src/routers/workspace.router.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const staffRoutes = workspaceRouter.stack.filter((layer) => layer.route?.path.startsWith("/staff")).flatMap((layer) =>
 Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));
const listed = PERMISSIONS.flatMap((row) => row.staffRoutes ?? []);
const concrete = (route) => route.replace(/:\w+/g, "000000000000000000000000").split(" ");

let admin;
beforeEach(() => { admin = createAdminTestApp(); });
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/permissions", () => {
 it("returns the 10 rows and the account count per role", async () => {
  vi.spyOn(User, "countDocuments").mockImplementation(async ({ role }) => ({ customer: 12, staff: 3, admin: 1 })[role]);
  const { body } = await admin.send("GET", "/api/v1/admin/permissions").expect(200);
  expect(body.data.items).toHaveLength(10);
  expect(body.data.counts).toEqual({ customer: 12, staff: 3, admin: 1 });
  expect(body.data.items[0]).toEqual({ id: "profile", label: "Xem và sửa hồ sơ cá nhân", roles: { customer: true, staff: true, admin: true } });
  expect(JSON.stringify(body)).not.toContain("staffRoutes");
 });
});

describe("the matrix agrees with the routes", () => {
 it("lists every registered /staff route exactly once", () => {
  expect([...listed].sort()).toEqual([...staffRoutes].sort());
  expect(staffRoutes.length).toBeGreaterThan(0);
 });

 it("grants Staff the rows that have Staff routes, and only those beyond the profile", () => {
  const granted = PERMISSIONS.filter((row) => row.roles.staff).map((row) => row.id);
  const withRoutes = PERMISSIONS.filter((row) => row.staffRoutes).map((row) => row.id);
  expect(granted).toEqual(["profile", ...withRoutes]);
 });

 it("gives Customer nothing that needs a Staff route", () => {
  for (const row of PERMISSIONS.filter((item) => item.staffRoutes)) expect(row.roles.customer).toBe(false);
 });

 it.each(listed)("%s is refused to Customer and Admin", async (route) => {
  const [method, path] = concrete(route);
  for (const role of ["customer", "admin"]) {
   admin.session.role = role;
   const { body } = await admin.send(method, `/api/v1${path}`).expect(403);
   expect(body.error.code).toBe("FORBIDDEN");
  }
 });

 it("keeps a person's own orders Customer only, as the matrix says", async () => {
  expect(PERMISSIONS.find((row) => row.id === "own-orders").roles).toEqual({ customer: true, staff: false, admin: false });
  for (const role of ["staff", "admin"]) {
   admin.session.role = role;
   await admin.send("GET", "/api/v1/orders/my-orders").expect(403);
  }
 });

 it("lets every role reach its own profile", async () => {
  expect(PERMISSIONS.find((row) => row.id === "profile").roles).toEqual({ customer: true, staff: true, admin: true });
  for (const role of ["customer", "staff", "admin"]) {
   admin.session.role = role;
   await admin.send("GET", "/api/v1/auth/me").expect(200);
  }
 });
});
