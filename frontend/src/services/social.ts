import { apiClient } from "./client";

/**
 * 切换点赞状态（点赞 / 取消点赞）
 */
export async function toggleLike(
  targetType: "moment" | "comment",
  targetId: string
): Promise<{ liked: boolean; like_count: number }> {
  const res = await apiClient.post("/likes/toggle", {
    target_type: targetType,
    target_id: targetId,
  });
  return res as unknown as { liked: boolean; like_count: number };
}

/**
 * 查询点赞状态
 */
export async function getLikeStatus(
  targetType: "moment" | "comment",
  targetId: string
): Promise<{ liked: boolean; like_count: number }> {
  const res = await apiClient.get("/likes/status", {
    params: { target_type: targetType, target_id: targetId },
  });
  return res as unknown as { liked: boolean; like_count: number };
}
