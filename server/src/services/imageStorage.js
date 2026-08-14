import crypto from "crypto";
import StorageMng from "./StorageMng.js";

export async function persistImageInput(projectId, source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("Image source is required.");
  }
  const value = source.trim();
  if (!value.startsWith("data:image/")) return value;

  const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) throw new Error("Unsupported image data URL.");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `proj-${projectId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  await StorageMng.put(filename, Buffer.from(match[2], "base64"));
  return StorageMng.getUrl(filename);
}
