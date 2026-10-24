import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { User, userRepository } from "../src/models/user.model.js";
import { Address } from "../src/models/address.model.js";
import { PetProfile } from "../src/models/pet-profile.model.js";

const now = 1_800_000_000_000;
const claims = {
  uid: "firebase-customer-123",
  email: "customer@example.com",
  auth_time: now / 1000,
  firebase: { sign_in_provider: "password" },
};

const customerUser = {
  _id: new mongoose.Types.ObjectId("650000000000000000000001"),
  firebaseUid: claims.uid,
  email: claims.email,
  fullName: "Nguyen Van A",
  phone: "0901234567",
  role: "customer",
  createdAt: new Date(),
};

const config = parseEnvironment({ NODE_ENV: "test" });
let admin, app;

afterEach(() => {
  vi.restoreAllMocks();
});

async function authenticatedAgent(target = app) {
  const agent = request.agent(target);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const csrfToken = csrf.body.data.csrfToken;

  // Simulate authenticated session cookie
  const sessionName = "petly-session";
  agent.set("Cookie", `${sessionName}=valid-session-cookie; petly-csrf=${csrfToken}`);

  const call = (method, path, body = undefined) => {
    const req = agent[method](`/api/v1/account${path}`)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", csrfToken);
    if (method !== "get") {
      req.set("Content-Type", "application/json").send(body ?? {});
    }
    return req;
  };

  return { agent, csrfToken, call };
}

describe("Customer Account & Pet Endpoints", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Date, "now").mockReturnValue(now);

    admin = {
      verifySessionCookie: vi.fn().mockResolvedValue(claims),
    };
    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(admin);
    vi.spyOn(userRepository, "findByUid").mockResolvedValue(customerUser);

    app = createApp(config);
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      const response = await request(app).get("/api/v1/account/profile");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Profile Management", () => {
    it("returns the authenticated customer profile", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(customerUser),
      });
      vi.spyOn(PetProfile, "countDocuments").mockResolvedValue(2);
      vi.spyOn(Address, "countDocuments").mockResolvedValue(2);

      const { call } = await authenticatedAgent();
      const response = await call("get", "/profile");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe("Nguyen Van A");
      expect(response.body.data.user.email).toBe("customer@example.com");
    });

    it("updates the customer profile with valid full name and phone", async () => {
      const updatedUser = {
        ...customerUser,
        fullName: "Nguyen Van B",
        phone: "0987654321",
      };

      vi.spyOn(User, "findByIdAndUpdate").mockReturnValue({
        lean: vi.fn().mockResolvedValue(updatedUser),
      });

      const { call } = await authenticatedAgent();
      const response = await call("put", "/profile", {
        fullName: "Nguyen Van B",
        phone: "0987654321",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe("Nguyen Van B");
      expect(response.body.data.user.phone).toBe("0987654321");
    });

    it("rejects profile updates with invalid phone numbers", async () => {
      const { call } = await authenticatedAgent();
      const response = await call("put", "/profile", {
        fullName: "Nguyen Van B",
        phone: "12345",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Shipping Addresses", () => {
    const mockAddress = {
      _id: new mongoose.Types.ObjectId("650000000000000000000010"),
      userId: customerUser._id,
      recipientName: "Nguyen Van A",
      phone: "0901234567",
      province: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward: "Phường Bến Nghé",
      street: "123 Nguyễn Du",
      isDefault: true,
      createdAt: new Date(),
    };

    it("lists customer shipping addresses sorted by default status", async () => {
      vi.spyOn(Address, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockAddress]),
        }),
      });

      const { call } = await authenticatedAgent();
      const response = await call("get", "/addresses");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.addresses).toHaveLength(1);
      expect(response.body.data.addresses[0].recipientName).toBe("Nguyen Van A");
    });

    it("creates a new address and automatically sets default for first address", async () => {
      vi.spyOn(Address, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Address, "updateMany").mockResolvedValue({ modifiedCount: 0 });
      vi.spyOn(Address, "create").mockResolvedValue(mockAddress);

      const { call } = await authenticatedAgent();
      const response = await call("post", "/addresses", {
        recipientName: "Nguyen Van A",
        phone: "0901234567",
        province: "TP. Hồ Chí Minh",
        district: "Quận 1",
        ward: "Phường Bến Nghé",
        street: "123 Nguyễn Du",
        isDefault: false,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.address.isDefault).toBe(true);
    });

    it("deletes a customer address", async () => {
      vi.spyOn(Address, "findOneAndDelete").mockResolvedValue(mockAddress);
      vi.spyOn(Address, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });

      const { call } = await authenticatedAgent();
      const response = await call("delete", `/addresses/${mockAddress._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("Pet Profiles", () => {
    const mockPet = {
      _id: new mongoose.Types.ObjectId("650000000000000000000020"),
      userId: customerUser._id,
      name: "Milo",
      species: "dog",
      breed: "Poodle",
      dob: new Date("2023-01-01"),
      createdAt: new Date(),
    };

    it("lists customer pet profiles", async () => {
      vi.spyOn(PetProfile, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockPet]),
        }),
      });

      const { call } = await authenticatedAgent();
      const response = await call("get", "/pets");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pets[0].name).toBe("Milo");
      expect(response.body.data.pets[0].species).toBe("dog");
    });

    it("creates a new pet profile", async () => {
      vi.spyOn(PetProfile, "create").mockResolvedValue(mockPet);

      const { call } = await authenticatedAgent();
      const response = await call("post", "/pets", {
        name: "Milo",
        species: "Chó",
        breed: "Poodle",
        dob: "2023-01-01",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pet.name).toBe("Milo");
    });

    it("deletes a pet profile", async () => {
      vi.spyOn(PetProfile, "findOneAndDelete").mockResolvedValue(mockPet);

      const { call } = await authenticatedAgent();
      const response = await call("delete", `/pets/${mockPet._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
