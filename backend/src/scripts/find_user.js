import mongoose from "mongoose";
import { User } from "../models/user.model.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/pet_supplies");
  const users = await User.find({}).limit(5).lean();
  console.log("Users in DB:", users.map(u => ({ id: u._id, email: u.email, role: u.role })));
  await mongoose.disconnect();
}

run().catch(console.error);

