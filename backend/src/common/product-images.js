export const MAX_PRODUCT_IMAGES = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** JPEG, PNG, or WebP, judged by the file's first bytes rather than its declared type. */
export function imageType(buffer) {
 if (!buffer || buffer.length < 12) return null;
 if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
 if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
 if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
 return null;
}

/**
 * Whether a product may store this image URL: an upload on this project's
 * Cloudinary account, a bundled `/images/products/` file, or a URL the product
 * already has, so older seed images survive a reorder.
 */
export function allowedImageUrl(url, current = [], cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()) {
 if (current.includes(url)) return true;
 if (/^\/images\/products\/[\w.-]+$/.test(url)) return true;
 return Boolean(cloudName) && url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`);
}
