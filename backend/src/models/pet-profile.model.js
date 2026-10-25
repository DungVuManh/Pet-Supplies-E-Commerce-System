import mongoose from "mongoose";

const petProfileSchema = new mongoose.Schema(
 {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  species: { type: String, required: true, trim: true },
  breed: { type: String, trim: true },
  dob: Date,
  age: { type: String, trim: true },
  weight: { type: Number },
  notes: { type: String, trim: true },
  avatarUrl: { type: String },
 },
 { collection: "petProfiles", timestamps: true, bufferCommands: false },
);

petProfileSchema.index({ userId: 1 });

export const PetProfile = mongoose.models.PetProfile || mongoose.model("PetProfile", petProfileSchema);
