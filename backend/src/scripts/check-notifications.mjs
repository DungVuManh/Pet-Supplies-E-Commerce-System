import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not found");
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const count = await mongoose.connection.collection("notifications").countDocuments();
  console.log("Total notifications count:", count);

  const samples = await mongoose.connection
    .collection("notifications")
    .find()
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log("Samples:", JSON.stringify(samples, null, 2));

  const users = await mongoose.connection
    .collection("users")
    .find()
    .project({ _id: 1, email: 1, fullName: 1, role: 1 })
    .toArray();
  console.log("Users:", JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);

