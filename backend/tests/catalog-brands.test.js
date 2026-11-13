import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import { Product } from "../src/models/product.model.js";

const app = createApp(parseEnvironment({ NODE_ENV: "test" }));

afterEach(() => vi.restoreAllMocks());

it("returns counts for named public brands and preserves the list of names", async () => {
  const aggregate = vi.spyOn(Product, "aggregate").mockResolvedValue([
    { _id: "Royal Canin", productCount: 4 },
    { _id: "", productCount: 6 },
    { _id: "  ", productCount: 1 },
    { _id: "Cat's On, Pet", productCount: 2 },
  ]);

  const response = await request(app).get("/api/v1/catalog/brands").expect(200);

  expect(aggregate).toHaveBeenCalledWith([
    { $match: { isActive: true, brand: { $type: "string" } } },
    { $group: { _id: "$brand", productCount: { $sum: 1 } } },
  ]);
  expect(response.body.data).toEqual({
    brands: ["Cat's On, Pet", "Royal Canin"],
    brandDetails: [
      { name: "Cat's On, Pet", productCount: 2 },
      { name: "Royal Canin", productCount: 4 },
    ],
  });
});

it.each([
  ["brandName=Cat%27s+On%2C+Pet", ["Cat's On, Pet"]],
  ["brandName=Cat%27s+On%2C+Pet&brandName=Royal+Canin", ["Cat's On, Pet", "Royal Canin"]],
  ["brands=Cat%27s+On,Royal+Canin", ["Cat's On", "Royal Canin"]],
])("filters the product list with %s", async (query, names) => {
  const count = vi.spyOn(Product, "countDocuments").mockResolvedValue(0);
  const products = {
    populate: () => products,
    sort: () => products,
    skip: () => products,
    limit: () => products,
    lean: async () => [],
  };
  const find = vi.spyOn(Product, "find").mockReturnValue(products);

  await request(app).get(`/api/v1/catalog/products?${query}`).expect(200);

  const filter = { isActive: true, brand: { $in: names } };
  expect(find).toHaveBeenCalledWith(filter);
  expect(count).toHaveBeenCalledWith(filter);
});

it("rejects an empty exact brand filter", async () => {
  const response = await request(app).get("/api/v1/catalog/products?brandName=").expect(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
