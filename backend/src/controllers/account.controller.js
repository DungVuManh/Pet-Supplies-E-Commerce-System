import mongoose from "mongoose";
import { AppError } from "../common/errors/app-error.js";
import { User, publicUser } from "../models/user.model.js";
import { Address } from "../models/address.model.js";
import { PetProfile } from "../models/pet-profile.model.js";
import {
  validateInput,
  updateProfileSchema,
  addressSchema,
  petSchema,
} from "../validators/account.validator.js";

function parseObjectId(id, name = "ID") {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${name} không hợp lệ.`, 400, "INVALID_ID");
  }
  return new mongoose.Types.ObjectId(id);
}

/* ==========================================================================
   Customer Profile Handlers
   ========================================================================== */

export async function getProfile(request, response) {
  const user = await User.findById(request.user._id).lean();
  if (!user) {
    throw new AppError("Không tìm thấy thông tin tài khoản.", 404, "USER_NOT_FOUND");
  }

  let petsCount = 0;
  let addressesCount = 0;
  try {
    const [pCount, aCount] = await Promise.all([
      PetProfile.countDocuments({ userId: request.user._id }),
      Address.countDocuments({ userId: request.user._id }),
    ]);
    petsCount = pCount;
    addressesCount = aCount;
  } catch {
    // Fallback if counts unavailable
  }

  response.json({
    success: true,
    data: {
      user: {
        ...publicUser(user),
        createdAt: user.createdAt,
      },
      stats: {
        orders: 5,
        pets: petsCount,
        addresses: addressesCount,
      },
    },
  });
}

export async function updateProfile(request, response) {
  const input = validateInput(updateProfileSchema, request.body);
  const updateData = {
    fullName: input.fullName,
    phone: input.phone,
  };
  if (input.dob !== undefined) updateData.dob = input.dob;
  if (input.gender !== undefined) updateData.gender = input.gender;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

  const updated = await User.findByIdAndUpdate(
    request.user._id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");
  }

  response.json({
    success: true,
    message: "Thông tin của bạn đã được cập nhật.",
    data: {
      user: {
        ...publicUser(updated),
        createdAt: updated.createdAt,
      },
    },
  });
}

/* ==========================================================================
   Shipping Address Handlers
   ========================================================================== */

export async function listAddresses(request, response) {
  const addresses = await Address.find({ userId: request.user._id })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  response.json({
    success: true,
    data: { addresses },
  });
}

export async function createAddress(request, response) {
  const input = validateInput(addressSchema, request.body);
  const existingCount = await Address.countDocuments({ userId: request.user._id });

  // If this is the user's first address, make it default automatically
  let shouldBeDefault = input.isDefault || existingCount === 0;

  if (shouldBeDefault) {
    await Address.updateMany(
      { userId: request.user._id },
      { $set: { isDefault: false } },
    );
  }

  const address = await Address.create({
    userId: request.user._id,
    recipientName: input.recipientName,
    phone: input.phone,
    province: input.province,
    district: input.district,
    ward: input.ward,
    street: input.street,
    addressType: input.addressType || "home",
    isDefault: shouldBeDefault,
  });

  response.status(201).json({
    success: true,
    message: "Đã thêm địa chỉ giao hàng mới.",
    data: { address },
  });
}

export async function updateAddress(request, response) {
  const addressId = parseObjectId(request.params.id, "Mã địa chỉ");
  const input = validateInput(addressSchema, request.body);

  const existing = await Address.findOne({ _id: addressId, userId: request.user._id });
  if (!existing) {
    throw new AppError("Không tìm thấy địa chỉ giao hàng.", 404, "ADDRESS_NOT_FOUND");
  }

  if (input.isDefault && !existing.isDefault) {
    await Address.updateMany(
      { userId: request.user._id, _id: { $ne: addressId } },
      { $set: { isDefault: false } },
    );
  }

  existing.recipientName = input.recipientName;
  existing.phone = input.phone;
  existing.province = input.province;
  existing.district = input.district;
  existing.ward = input.ward;
  existing.street = input.street;
  existing.addressType = input.addressType || existing.addressType || "home";
  existing.isDefault = input.isDefault;

  await existing.save();

  response.json({
    success: true,
    message: "Đã cập nhật địa chỉ giao hàng.",
    data: { address: existing },
  });
}

export async function deleteAddress(request, response) {
  const addressId = parseObjectId(request.params.id, "Mã địa chỉ");
  const address = await Address.findOneAndDelete({
    _id: addressId,
    userId: request.user._id,
  });

  if (!address) {
    throw new AppError("Không tìm thấy địa chỉ giao hàng.", 404, "ADDRESS_NOT_FOUND");
  }

  // If deleted address was default, promote the newest remaining address to default
  if (address.isDefault) {
    const nextDefault = await Address.findOne({ userId: request.user._id }).sort({
      createdAt: -1,
    });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  response.json({
    success: true,
    message: "Đã xóa địa chỉ giao hàng.",
  });
}

export async function setDefaultAddress(request, response) {
  const addressId = parseObjectId(request.params.id, "Mã địa chỉ");
  const address = await Address.findOne({ _id: addressId, userId: request.user._id });
  if (!address) {
    throw new AppError("Không tìm thấy địa chỉ giao hàng.", 404, "ADDRESS_NOT_FOUND");
  }

  await Address.updateMany(
    { userId: request.user._id },
    { $set: { isDefault: false } },
  );

  address.isDefault = true;
  await address.save();

  response.json({
    success: true,
    message: "Đã đặt làm địa chỉ mặc định.",
    data: { address },
  });
}

/* ==========================================================================
   Pet Profile Handlers
   ========================================================================== */

export async function listPets(request, response) {
  const pets = await PetProfile.find({ userId: request.user._id })
    .sort({ createdAt: -1 })
    .lean();

  response.json({
    success: true,
    data: { pets },
  });
}

export async function createPet(request, response) {
  const input = validateInput(petSchema, request.body);
  const pet = await PetProfile.create({
    userId: request.user._id,
    name: input.name,
    species: input.species,
    breed: input.breed || "",
    dob: input.dob || null,
    age: input.age || null,
    weight: input.weight !== undefined ? input.weight : null,
    notes: input.notes || "",
    avatarUrl: input.avatarUrl || null,
  });

  response.status(201).json({
    success: true,
    message: "Đã thêm hồ sơ thú cưng thành công.",
    data: { pet },
  });
}

export async function updatePet(request, response) {
  const petId = parseObjectId(request.params.id, "Mã thú cưng");
  const input = validateInput(petSchema, request.body);

  const pet = await PetProfile.findOne({ _id: petId, userId: request.user._id });
  if (!pet) {
    throw new AppError("Không tìm thấy hồ sơ thú cưng.", 404, "PET_NOT_FOUND");
  }

  pet.name = input.name;
  pet.species = input.species;
  pet.breed = input.breed || "";
  pet.dob = input.dob || null;
  if (input.age !== undefined) pet.age = input.age;
  if (input.weight !== undefined) pet.weight = input.weight;
  if (input.notes !== undefined) pet.notes = input.notes;
  if (input.avatarUrl !== undefined) pet.avatarUrl = input.avatarUrl;

  await pet.save();

  response.json({
    success: true,
    message: "Đã cập nhật hồ sơ thú cưng.",
    data: { pet },
  });
}

export async function deletePet(request, response) {
  const petId = parseObjectId(request.params.id, "Mã thú cưng");
  const pet = await PetProfile.findOneAndDelete({
    _id: petId,
    userId: request.user._id,
  });

  if (!pet) {
    throw new AppError("Không tìm thấy hồ sơ thú cưng.", 404, "PET_NOT_FOUND");
  }

  response.json({
    success: true,
    message: "Đã xóa hồ sơ thú cưng.",
  });
}
