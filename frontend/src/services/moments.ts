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
  return apiClient.post<MomentDetail>("/moments", data);
}

/**
 * 获取 Feed 流（分页）
 */
export async function getMomentFeed(
  page: number,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<MomentFeedItem>> {
  const response = await apiClient.get<{
    items: MomentFeedItem[];
    meta: { page: number; page_size: number; total: number };
  }>("/moments", { params: { page, page_size: pageSize } });
  return response;
}

/**
 * 获取单条 Moment 详情
 */
export async function getMomentById(
  id: string
): Promise<MomentDetail> {
  return apiClient.get<MomentDetail>(`/moments/${id}`);
}

/**
 * 编辑 Moment
 */
export async function updateMoment(
  id: string,
  data: Partial<CreateMomentParams>
): Promise<MomentDetail> {
  return apiClient.patch<MomentDetail>(`/moments/${id}`, data);
}

/**
 * 删除 Moment
 */
export async function deleteMoment(id: string): Promise<void> {
  return apiClient.delete(`/moments/${id}`);
}

/**
 * 切换归档状态
 */
export async function toggleArchive(
  id: string
): Promise<MomentDetail> {
  return apiClient.post<MomentDetail>(`/moments/${id}/archive`);
}
