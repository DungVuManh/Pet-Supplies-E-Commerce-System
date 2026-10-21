import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
 {
  firebaseUid: { type: String, required: true, unique: true, immutable: true },
  email: { type: String, required: true },
  fullName: { type: String, required: true, minlength: 2, maxlength: 100 },
  phone: { type: String, required: true },
  role: {
   type: String,
   enum: ["customer"],
   default: "customer",
   immutable: true,
  },
  termsAcceptedAt: { type: Date, required: true },
 },
 { timestamps: true, bufferCommands: false },
);

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
 };
}
