import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const userIdStr = "6ae703e009e85fe831d91452"; // id của lê văn quân
  const userObjectId = new mongoose.Types.ObjectId(userIdStr);

  const resString = await mongoose.connection.collection("notifications").find({ userId: userIdStr }).toArray();
  console.log("Query with String userId:", resString.length);

  const resObjectId = await mongoose.connection.collection("notifications").find({ userId: userObjectId }).toArray();
  console.log("Query with ObjectId userId:", resObjectId.length);

  // Check how userId is stored in MongoDB:
  const doc = await mongoose.connection.collection("notifications").findOne({ _id: new mongoose.Types.ObjectId("6af7d76223da1e055cef9878") });
  console.log("Type of userId in document:", typeof doc.userId, doc.userId.constructor.name, doc.userId);

  await mongoose.disconnect();
}

main().catch(console.error);

