import { apiClient } from "./client";

/**
 * 切换点赞状态（点赞 / 取消点赞）
 */
const TARGET_TYPE_MAP: Record<string, number> = {
  moment: 1,
  comment: 2,
} as const;

/**
 * 切换点赞状态（点赞 / 取消点赞）
 * targetType 传入 "moment" / "comment"，自动映射为后端所需的 int
 */
export async function toggleLike(
  targetType: "moment" | "comment",
  targetId: string
): Promise<{ liked: boolean; like_count: number }> {
  const res = await apiClient.post("/likes/toggle", {
    target_type: TARGET_TYPE_MAP[targetType],
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
    params: { target_type: TARGET_TYPE_MAP[targetType], target_id: targetId },
  });
  return res as unknown as { liked: boolean; like_count: number };
}
