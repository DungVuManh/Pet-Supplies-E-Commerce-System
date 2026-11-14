import mongoose from "mongoose";
import request from "supertest";
import { vi } from "vitest";
import { createApp } from "../../src/app.js";
import { parseEnvironment } from "../../src/config/env.js";
import * as firebase from "../../src/config/firebase.js";
import { userRepository } from "../../src/models/user.model.js";

export const ORIGIN = "http://localhost:3000";
export const CSRF = "c".repeat(43);

const sessionUsers = {
 admin: { _id: new mongoose.Types.ObjectId("a00000000000000000000001"), firebaseUid: "admin-uid", fullName: "Quản trị viên", email: "admin@example.test" },
 staff: { _id: new mongoose.Types.ObjectId("a00000000000000000000002"), firebaseUid: "staff-uid", fullName: "Nhân viên", email: "staff@example.test" },
 customer: { _id: new mongoose.Types.ObjectId("a00000000000000000000003"), firebaseUid: "customer-uid", fullName: "Khách hàng", email: "customer@example.test" },
};

/**
 * Builds the real app with Firebase and the session's profile lookup mocked.
 * Call it from `beforeEach` and restore mocks in `afterEach`.
 *
 * `session.role` selects the signed-in user ("admin", "staff", "customer"),
 * or `null` for a guest; change it at any time between requests.
 */
export function createAdminTestApp({ role = "admin" } = {}) {
 const app = createApp(parseEnvironment({ NODE_ENV: "test" }));
 const session = { role };
 const auth = {
  verifySessionCookie: vi.fn(async () => ({ uid: sessionUsers[session.role].firebaseUid })),
  revokeRefreshTokens: vi.fn(async () => undefined),
  getUser: vi.fn(async (uid) => ({ uid, metadata: { lastSignInTime: null } })),
 };
 vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
 vi.spyOn(userRepository, "findByUid").mockImplementation(async (uid) => {
  const [userRole, user] = Object.entries(sessionUsers).find(([, item]) => item.firebaseUid === uid) || [];
  return user ? { ...user, role: userRole, phone: "0912345678" } : null;
 });

 /**
  * Sends a request as the current session. Mutations carry the Origin and the
  * CSRF cookie/header pair unless `csrf: false`.
  */
 function send(method, path, body, { csrf = true } = {}) {
  const cookies = [];
  if (session.role) cookies.push("petly-session=test-session");
  let call = request(app)[method.toLowerCase()](path);
  if (method.toUpperCase() !== "GET") {
   call = call.set("Origin", ORIGIN);
   if (csrf) {
    cookies.push(`petly-csrf=${CSRF}`);
    call = call.set("X-CSRF-Token", CSRF);
   }
  }
  if (cookies.length) call = call.set("Cookie", cookies.join("; "));
  // Mutations are JSON-only, so a bodiless mutation still sends `{}`.
  if (method.toUpperCase() !== "GET") return call.send(body ?? {});
  return body === undefined ? call : call.send(body);
 }

 return { app, auth, session, user: (name = session.role) => sessionUsers[name], send };
}
