import { Router } from "express";
import multer from "multer";
import { readCookies, requireAuth } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  listPets,
  createPet,
  updatePet,
  deletePet,
} from "../controllers/account.controller.js";

const router = Router();

// Multer memory storage cho avatar trước khi stream sang Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB mỗi ảnh
  fileFilter(_req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file hình ảnh (jpg, jpeg, png, webp)."));
    }
  },
});

router.use(readCookies);
router.use(requireAuth);

// Upload Avatar (Người dùng hoặc Boss) lên Cloudinary
router.post("/upload-avatar", upload.single("avatar"), uploadAvatar);

// Customer Profile
router.get("/profile", getProfile);
router.put("/profile", protectMutation, updateProfile);

// Shipping Addresses
router.get("/addresses", listAddresses);
router.post("/addresses", protectMutation, createAddress);
router.put("/addresses/:id", protectMutation, updateAddress);
router.delete("/addresses/:id", protectMutation, deleteAddress);
router.patch("/addresses/:id/default", protectMutation, setDefaultAddress);

// Pet Profiles
router.get("/pets", listPets);
router.post("/pets", protectMutation, createPet);
router.put("/pets/:id", protectMutation, updatePet);
router.delete("/pets/:id", protectMutation, deletePet);

export default router;
