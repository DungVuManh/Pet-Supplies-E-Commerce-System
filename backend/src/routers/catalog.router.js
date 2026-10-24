// ============================================================
// Catalog Router - Định nghĩa các đường dẫn API cho trang catalog
//
// Base URL: /api/v1/catalog
//
// Danh sách endpoints:
//   GET /api/v1/catalog/products    - Lấy danh sách sản phẩm
//   GET /api/v1/catalog/categories  - Lấy danh sách danh mục
//   GET /api/v1/catalog/brands      - Lấy danh sách thương hiệu
// ============================================================

import { Router } from "express";
import {
  getAllProducts,
  getBrands,
  getCategories,
} from "../controllers/catalog.controller.js";

// Tạo router mới
const router = Router();

// GET /api/v1/catalog/products
// Ví dụ: /api/v1/catalog/products?search=kong&category=dog&sort=price-asc&page=1
router.get("/products", getAllProducts);

// GET /api/v1/catalog/categories
// Trả về danh sách danh mục để hiển thị trong sidebar
router.get("/categories", getCategories);

// GET /api/v1/catalog/brands
// Trả về danh sách thương hiệu để hiển thị trong sidebar
router.get("/brands", getBrands);

export default router;
