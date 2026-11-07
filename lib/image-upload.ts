// Storage accepts these MIME types only. Never use a user-supplied filename as a path.
export function imageUploadExtension(mimeType: string): "jpg" | "png" | "webp" | null {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return null;
  }
}
