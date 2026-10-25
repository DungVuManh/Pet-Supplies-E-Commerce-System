import assert from "node:assert/strict";
import { test } from "node:test";
import { accountApi } from "../features/account/api.ts";

const profile = {
  id: "cust-1",
  email: "customer@example.com",
  fullName: "Nguyen Van A",
  phone: "0901234567",
  role: "customer",
};

const address = {
  _id: "addr-1",
  recipientName: "Nguyen Van A",
  phone: "0901234567",
  province: "TP. Hồ Chí Minh",
  district: "Quận 1",
  ward: "Phường Bến Nghé",
  street: "123 Đường Mẫu",
  isDefault: true,
};

const pet = {
  _id: "pet-1",
  name: "Milo",
  species: "dog",
  breed: "Poodle",
  dob: "2023-01-01",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("accountApi.getProfile fetches profile with cache no-store and credentials same-origin", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return json({ success: true, data: { user: profile } });
  });

  const res = await accountApi.getProfile();
  assert.deepEqual(res.user, profile);
  assert.equal(res.stats.orders, 5);
  assert.equal(calls[0].url, "/api/v1/account/profile");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "same-origin");
});

test("accountApi.updateProfile obtains CSRF token and sends PUT mutation", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("csrf")) {
      return json({ success: true, data: { csrfToken: "a".repeat(43) } });
    }
    return json({ success: true, data: { user: { ...profile, fullName: "Nguyen Van B" } } });
  });

  const res = await accountApi.updateProfile({ fullName: "Nguyen Van B", phone: "0901234567" });
  assert.equal(res.fullName, "Nguyen Van B");
  assert.equal(calls[0].url, "/api/v1/auth/csrf");
  assert.equal(calls[1].url, "/api/v1/account/profile");
  assert.equal(calls[1].options.method, "PUT");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "a".repeat(43));
});

test("accountApi.getAddresses and createAddress work as expected", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("csrf")) {
      return json({ success: true, data: { csrfToken: "b".repeat(43) } });
    }
    if (url.endsWith("addresses") && options?.method === "POST") {
      return json({ success: true, data: { address } }, 201);
    }
    return json({ success: true, data: { addresses: [address] } });
  });

  const list = await accountApi.getAddresses();
  assert.equal(list.length, 1);
  assert.equal(list[0].recipientName, "Nguyen Van A");

  const created = await accountApi.createAddress({
    recipientName: "Nguyen Van A",
    phone: "0901234567",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    street: "123 Đường Mẫu",
    isDefault: true,
  });
  assert.equal(created.isDefault, true);
});

test("accountApi.getPets and createPet handle pet profiles", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("csrf")) {
      return json({ success: true, data: { csrfToken: "c".repeat(43) } });
    }
    if (url.endsWith("pets") && options?.method === "POST") {
      return json({ success: true, data: { pet } }, 201);
    }
    return json({ success: true, data: { pets: [pet] } });
  });

  const pets = await accountApi.getPets();
  assert.equal(pets[0].name, "Milo");
  assert.equal(pets[0].species, "dog");

  const newPet = await accountApi.createPet({
    name: "Milo",
    species: "dog",
    breed: "Poodle",
    dob: "2023-01-01",
  });
  assert.equal(newPet.name, "Milo");
});
