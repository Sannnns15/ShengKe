import axios from "axios";
import { apiClient } from "./client";
import {
  getAccessToken,
  getRefreshToken,
  clearAllAuth,
} from "../utils/storage";
import type {
  MomentFeedItem,
  MomentDetail,
  CreateMomentParams,
  PaginatedData,
  ApiResponse,
  PaginationMeta,
} from "../types/api";
import { API_BASE_URL, PAGE_SIZE } from "../constants/config";

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
 *
 * Uses raw axios call to bypass the response interceptor that unwraps
 * ApiResponse envelope, so we can access both `data` (items) and `meta`.
 */
export async function getMomentFeed(
  page: number,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<MomentFeedItem>> {
  const token = await getAccessToken();
  const raw = await axios.get<
    ApiResponse<MomentFeedItem[]> & { meta: PaginationMeta }
  >(`${API_BASE_URL}/moments?page=${page}&page_size=${pageSize}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
  const body = raw.data;
  return {
    items: body.data,
    meta: body.meta,
  };
}

/**
 * 获取指定用户的所有 Moment（分页）
 */
export async function getUserMoments(
  userId: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedData<MomentFeedItem>> {
  const token = await getAccessToken();
  const raw = await axios.get<
    ApiResponse<MomentFeedItem[]> & { meta: PaginationMeta }
  >(
    `${API_BASE_URL}/users/${userId}/moments?page=${page}&page_size=${pageSize}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    }
  );
  const body = raw.data;
  return {
    items: body.data,
    meta: body.meta,
  };
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
