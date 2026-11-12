import cloudinary, { configureCloudinary } from "../config/cloudinary.js";
import { AppError } from "./errors/app-error.js";

export const ALLOWED_RETURN_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Uploads validated image memory buffers to Cloudinary and returns their HTTPS URLs.
 */
export async function uploadImageBuffersToCloudinary(
  files,
  { folder = "petjoy/returns", maxFiles = 5 } = {}
) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError("Vui lòng chọn ít nhất 1 ảnh để tải lên.", 400, "NO_FILES");
  }

  if (files.length > maxFiles) {
    throw new AppError(
      `Chỉ được tải lên tối đa ${maxFiles} ảnh cho mỗi yêu cầu.`,
      400,
      "TOO_MANY_FILES"
    );
  }

  for (const file of files) {
    if (!file?.mimetype || !ALLOWED_RETURN_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(
        "Chỉ chấp nhận tệp hình ảnh định dạng JPG, PNG hoặc WEBP.",
        400,
        "INVALID_FILE_TYPE"
      );
    }
  }

  const config = configureCloudinary();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new AppError(
      "Dịch vụ lưu trữ hình ảnh Cloudinary chưa được cấu hình.",
      503,
      "CLOUDINARY_CONFIG_MISSING"
    );
  }

  const uploadPromises = files.map(
    (file) =>
      new Promise((resolve, reject) => {
        try {
          const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => {
              if (error || !result?.secure_url) {
                return reject(
                  new AppError(
                    "Không thể tải ảnh lên dịch vụ lưu trữ. Vui lòng thử lại.",
                    502,
                    "CLOUDINARY_UPLOAD_ERROR"
                  )
                );
              }
              resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        } catch {
          reject(
            new AppError(
              "Không thể khởi tạo tải ảnh lên dịch vụ lưu trữ.",
              502,
              "UPLOAD_INIT_FAILED"
            )
          );
        }
      })
  );

  return Promise.all(uploadPromises);
}

