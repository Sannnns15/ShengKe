import { apiClient } from "./client";
import type {
  MomentFeedItem,
  MomentDetail,
  CreateMomentParams,
  PaginatedData,
} from "../types/api";
import { PAGE_SIZE } from "../constants/config";

/**
 * 创建 Moment（生刻）
 */
export async function createMoment(
  data: CreateMomentParams
): Promise<MomentDetail> {
  const res = await apiClient.post("/moments", data);
  return res as unknown as MomentDetail;
}

/**
 * 获取 Feed 流（分页）
 */
export async function getMomentFeed(
  page: number,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<MomentFeedItem>> {
  const res = await apiClient.get("/moments", {
    params: { page, page_size: pageSize },
  });
  return res as unknown as PaginatedData<MomentFeedItem>;
}

/**
 * 获取单条 Moment 详情
 */
export async function getMomentById(
  id: string
): Promise<MomentDetail> {
  const res = await apiClient.get(`/moments/${id}`);
  return res as unknown as MomentDetail;
}

/**
 * 编辑 Moment
 */
export async function updateMoment(
  id: string,
  data: Partial<CreateMomentParams>
): Promise<MomentDetail> {
  const res = await apiClient.patch(`/moments/${id}`, data);
  return res as unknown as MomentDetail;
}

/**
 * 删除 Moment
 */
export async function deleteMoment(id: string): Promise<void> {
  await apiClient.delete(`/moments/${id}`);
}

/**
 * 切换归档状态
 */
export async function toggleArchive(
  id: string
): Promise<MomentDetail> {
  const res = await apiClient.post(`/moments/${id}/archive`);
  return res as unknown as MomentDetail;
}
