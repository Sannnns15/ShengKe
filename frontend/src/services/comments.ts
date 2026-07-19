import { apiClient } from "./client";
import type { PaginatedData } from "../types/api";
import { PAGE_SIZE } from "../constants/config";

// ══ Types ═══════════════════════════════════════════════

export interface CommentItem {
  id: string;
  moment_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
}

/**
 * 获取 Moment 的评论列表（分页）
 */
export async function getComments(
  momentId: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<CommentItem>> {
  const res = await apiClient.get(`/moments/${momentId}/comments`, {
    params: { page, page_size: pageSize },
  });
  return res as unknown as PaginatedData<CommentItem>;
}

/**
 * 创建评论
 */
export async function createComment(
  momentId: string,
  content: string,
  parentId?: string
): Promise<CommentItem> {
  const res = await apiClient.post(`/moments/${momentId}/comments`, {
    content,
    parent_id: parentId ?? null,
  });
  return res as unknown as CommentItem;
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`);
}
