import mongoose from "mongoose";

export const USER_ROLES = ["customer", "staff", "admin"];
export const USER_STATUSES = ["active", "locked"];

const userSchema = new mongoose.Schema(
 {
  firebaseUid: { type: String, required: true, unique: true, immutable: true },
  email: { type: String, required: true },
  fullName: { type: String, required: true, minlength: 2, maxlength: 100 },
  phone: { type: String, required: true },
  role: {
   type: String,
   enum: USER_ROLES,
   default: "customer",
   immutable: true,
  },
  termsAcceptedAt: { type: Date, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },
  avatarUrl: { type: String, default: "/images/customer-avatar.jpg" },
  // Admin-managed and never part of publicUser(). Documents from before this
  // field have no status, so queries treat a missing value as active.
  status: { type: String, enum: USER_STATUSES, default: "active" },
  lockedAt: { type: Date },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lockReason: { type: String, trim: true, maxlength: 200 },
  adminNote: { type: String, trim: true, maxlength: 1000 },
 },
 { timestamps: true, bufferCommands: false },
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);

export const userRepository = {
 findByUid: (firebaseUid) => User.findOne({ firebaseUid }).lean(),
 async createIfMissing(firebaseUid, profile) {
  try {
   return await User.findOneAndUpdate(
    { firebaseUid },
    {
     $setOnInsert: {
      firebaseUid,
      ...profile,
      role: "customer",
      termsAcceptedAt: new Date(),
     },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
   ).lean();
  } catch (error) {
   // Concurrent retries must resolve to the existing profile, never overwrite it.
   if (error.code === 11000) return User.findOne({ firebaseUid }).lean();
   throw error;
  }
 },
};

export function publicUser(user) {
 return {
  id: String(user._id),
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  role: user.role,
  dob: user.dob,
  gender: user.gender,
  avatarUrl: user.avatarUrl || "/images/customer-avatar.jpg",
  createdAt: user.createdAt,
 };
}
