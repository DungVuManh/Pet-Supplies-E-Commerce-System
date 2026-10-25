import { Router } from "express";
import { readCookies, requireAuth } from "../common/middlewares/auth.middleware.js";
import { protectMutation } from "../controllers/auth.controller.js";
import {
  getProfile,
  updateProfile,
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
router.use(readCookies);
router.use(requireAuth);

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
