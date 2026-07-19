import { apiClient } from "./client";
import type { MediaUpload } from "../types/api";

/**
 * 上传媒体文件
 */
export async function uploadMedia(uri: string): Promise<MediaUpload> {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "upload.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    ext === "png"
      ? "image/png"
      : ext === "gif"
        ? "image/gif"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  formData.append("file", {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const res = await apiClient.post("/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res as unknown as MediaUpload;
}

/**
 * 批量删除媒体文件
 */
export async function deleteMedia(objectKeys: string[]): Promise<void> {
  await apiClient.delete("/media", { data: { object_keys: objectKeys } });
}
