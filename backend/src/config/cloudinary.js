import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

// Đảm bảo luôn tải được file .env từ thư mục backend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  });

  return { cloud_name, api_key, api_secret };
}

// Khởi tạo ngay khi module được nạp
configureCloudinary();

export default cloudinary;
