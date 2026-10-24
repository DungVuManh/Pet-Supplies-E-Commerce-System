
//   GET /api/catalog/products    - Lấy danh sách sản phẩm
//   GET /api/catalog/categories  - Lấy danh sách danh mục
//   GET /api/catalog/brands      - Lấy danh sách thương hiệu

import { Router } from "express";
import {
  getAllProducts,
  getBrands,
  getCategories,
} from "../controllers/catalog.controller.js";

const router = Router();

// GET /api/catalog/products
router.get("/products", getAllProducts);

// GET /api/catalog/categories
router.get("/categories", getCategories);

// GET /api/catalog/brands
router.get("/brands", getBrands);

export default router;
