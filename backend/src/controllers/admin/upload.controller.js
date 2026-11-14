import multer from "multer";
import cloudinary, { configureCloudinary } from "../../config/cloudinary.js";
import { AppError } from "../../common/errors/app-error.js";
import { imageType, MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES } from "../../common/product-images.js";

const FOLDER = "petjoy/products";

const parser = multer({
 storage: multer.memoryStorage(),
 limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_PRODUCT_IMAGES, fields: 0 },
}).array("images", MAX_PRODUCT_IMAGES);

const limitMessages = {
 LIMIT_FILE_SIZE: "Mỗi ảnh tối đa 5 MB.",
 LIMIT_FILE_COUNT: `Mỗi lần tải tối đa ${MAX_PRODUCT_IMAGES} ảnh.`,
 LIMIT_UNEXPECTED_FILE: `Chỉ gửi ảnh trong trường "images", tối đa ${MAX_PRODUCT_IMAGES} ảnh.`,
 LIMIT_FIELD_COUNT: "Yêu cầu tải ảnh chỉ được chứa tệp ảnh.",
};

/** Reads the files into memory; `multer` limit errors become a 400 with a clear message. */
export function readProductImages(request, response, next) {
 parser(request, response, (error) => {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
   return next(new AppError(limitMessages[error.code] ?? "Tệp tải lên không hợp lệ.", 400, "INVALID_UPLOAD"));
  }
  return next(error);
 });
}

function uploadOne(file) {
 return new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({ folder: FOLDER, resource_type: "image" }, (error, result) => {
   if (error || !result?.secure_url) {
    // The provider's message can echo request details; log only that it failed.
    console.error("[admin] Cloudinary upload failed", { code: error?.http_code ?? "unknown" });
    return reject(new AppError("Chưa thể tải ảnh lên. Vui lòng thử lại.", 502, "UPLOAD_FAILED"));
   }
   resolve(result.secure_url);
  });
  stream.end(file.buffer);
 });
}

/**
 * Uploads 1–8 product photos and returns their URLs. The product stores them
 * only when its form is saved, so nothing on a product changes here.
 */
export async function uploadProductImages(request, response) {
 const files = request.files ?? [];
 if (files.length === 0) throw new AppError("Chọn ít nhất một ảnh để tải lên.", 400, "INVALID_UPLOAD");
 const wrong = files.find((file) => !imageType(file.buffer));
 if (wrong) throw new AppError(`“${wrong.originalname}” không phải ảnh JPG, PNG hoặc WebP.`, 400, "INVALID_UPLOAD");

 const keys = configureCloudinary();
 if (!keys.cloud_name || !keys.api_key || !keys.api_secret) {
  throw new AppError("Máy chủ chưa cấu hình dịch vụ lưu ảnh.", 503, "UPLOAD_UNAVAILABLE");
 }
 const urls = await Promise.all(files.map(uploadOne));
 response.status(201).json({ success: true, data: { urls } });
}
