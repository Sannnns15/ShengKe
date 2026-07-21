import { apiClient } from "./client";
import type { MediaUpload } from "../types/api";

// ── Legacy flow ──────────────────────────────────────────

/**
 * 上传媒体文件（旧流程 — multipart/form-data 上传到服务器中转）
 * @deprecated 推荐使用 uploadMediaDirect 直接上传到 OSS
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

// ── OSS direct upload flow (新流程) ────────────────────

/**
 * 获取上传预签名 URL
 * POST /media/upload-signature -> { url: string, object_key: string }
 */
export async function getUploadSignature(
  fileName: string,
  contentType: string,
): Promise<{ url: string; object_key: string }> {
  const res = await apiClient.post("/media/upload-signature", {
    file_name: fileName,
    content_type: contentType,
  });
  return res as unknown as { url: string; object_key: string };
}

/**
 * 使用预签名 URL 上传文件（直传到 OSS）
 */
async function uploadToPresignedUrl(
  presignedUrl: string,
  uri: string,
  contentType: string,
): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();
  await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
}

/**
 * 确认上传完成
 */
async function confirmUpload(objectKey: string): Promise<void> {
  await apiClient.post("/media/confirm", { object_key: objectKey });
}

/**
 * 上传媒体文件（OSS 直传流程）
 * 1. 获取预签名 URL
 * 2. 直传到 OSS
 * 3. 确认上传
 */
export async function uploadMediaDirect(uri: string): Promise<MediaUpload> {
  const filename = uri.split("/").pop() || "upload.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    ext === "png"
      ? "image/png"
      : ext === "gif"
        ? "image/gif"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  // Step 1: get presigned URL
  const { url, object_key } = await getUploadSignature(filename, contentType);

  // Step 2: upload directly to OSS
  await uploadToPresignedUrl(url, uri, contentType);

  // Step 3: confirm
  await confirmUpload(object_key);

  return { url: url.split("?")[0], object_key }; // clean URL without signature params
}
