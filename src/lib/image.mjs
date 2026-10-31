// Client-side image validation, rotation, downscaling, and compression.
// No external dependencies; uses native Web APIs (Canvas, FileReader, Blob).

export const IMAGE_LIMITS = Object.freeze({
  maxFileSize: 30 * 1024 * 1024, // 30 MiB
  maxDimension: 16000,
  maxMegapixels: 80_000_000,
  targetLongestEdge: 1600,
  targetMimeType: "image/jpeg",
  targetQuality: 0.82,
  maxDecodedBase64Bytes: 15 * 1024 * 1024 // 15 MiB
});

export const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function validateImageFile(file) {
  if (!file || !(file instanceof Blob)) {
    return { valid: false, error: "Please select an image file." };
  }

  // Check MIME type
  const type = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return {
      valid: false,
      error: "Please choose a JPEG, PNG, or WebP photo. (PDF and other formats are not supported)."
    };
  }

  // Check file size
  if (file.size > IMAGE_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: "The image is too large. Please use a photo under 15 MiB."
    };
  }

  return { valid: true };
}

export function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (
        img.naturalWidth > IMAGE_LIMITS.maxDimension ||
        img.naturalHeight > IMAGE_LIMITS.maxDimension ||
        img.naturalWidth * img.naturalHeight > IMAGE_LIMITS.maxMegapixels
      ) {
        reject(new Error("Image dimensions are too large. Please use a photo under 40 megapixels."));
        return;
      }
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode the image. Please try a different photo."));
    };

    img.src = objectUrl;
  });
}

/**
 * Prepares and compresses the image for Gemini OCR:
 * 1. Corrects / applies rotation (0, 90, 180, 270 deg)
 * 2. Downscales longest edge to at most 1600px without upscaling
 * 3. Draws onto white canvas (for PNG transparency)
 * 4. Encodes to JPEG at ~0.85 quality
 * 5. Returns base64 payload and object URL for preview
 */
export async function prepareImage(fileOrBlob, rotationDeg = 0) {
  const validation = validateImageFile(fileOrBlob);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const img = await loadImage(fileOrBlob);
  const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
  const isPerpendicular = normalizedRotation === 90 || normalizedRotation === 270;

  const originalWidth = isPerpendicular ? img.naturalHeight : img.naturalWidth;
  const originalHeight = isPerpendicular ? img.naturalWidth : img.naturalHeight;

  // Scale down to max 1600px longest edge without upscaling
  const maxEdge = Math.max(originalWidth, originalHeight);
  const scale = maxEdge > IMAGE_LIMITS.targetLongestEdge ? IMAGE_LIMITS.targetLongestEdge / maxEdge : 1;
  const finalWidth = Math.round(originalWidth * scale);
  const finalHeight = Math.round(originalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize image processing canvas.");
  }

  // Fill with white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Apply rotation
  ctx.save();
  ctx.translate(finalWidth / 2, finalHeight / 2);
  ctx.rotate((normalizedRotation * Math.PI) / 180);

  // Draw image centered
  const drawW = isPerpendicular ? finalHeight : finalWidth;
  const drawH = isPerpendicular ? finalWidth : finalHeight;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Convert to Blob
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to encode compressed image."));
      },
      IMAGE_LIMITS.targetMimeType,
      IMAGE_LIMITS.targetQuality
    );
  });

  // Convert blob to raw base64 string
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Failed to read image data."));
        return;
      }
      const rawBase64 = dataUrl.split(",")[1];
      resolve(rawBase64);
    };
    reader.onerror = () => reject(new Error("Failed reading processed image."));
    reader.readAsDataURL(blob);
  });

  // Verify decoded size <= 4 MiB
  const decodedBytes = Math.ceil((base64.length * 3) / 4);
  if (decodedBytes > IMAGE_LIMITS.maxDecodedBase64Bytes) {
    throw new Error("Processed image exceeds the 4 MiB payload limit. Try a smaller crop.");
  }

  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    previewUrl,
    base64,
    width: finalWidth,
    height: finalHeight,
    mimeType: IMAGE_LIMITS.targetMimeType,
    rotation: normalizedRotation
  };
}

