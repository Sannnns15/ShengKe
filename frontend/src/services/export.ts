import { apiClient } from "./client";
import { API_BASE_URL } from "../constants/config";

export interface ExportTask {
  task_id: string;
  status: "pending" | "processing" | "done" | "failed";
}

export interface ExportStatus {
  task_id: string;
  status: "pending" | "processing" | "done" | "failed";
  error?: string | null;
}

/**
 * 创建数据导出任务
 */
export async function requestExport(): Promise<ExportTask> {
  const res = await apiClient.post("/users/me/export");
  return res as unknown as ExportTask;
}

/**
 * 查询导出任务状态
 */
export async function getExportStatus(taskId: string): Promise<ExportStatus> {
  const res = await apiClient.get(`/users/me/export/${taskId}`);
  return res as unknown as ExportStatus;
}

/**
 * 构造下载 URL（直接打开浏览器 / 分享链接）
 */
export function getDownloadUrl(taskId: string): string {
  return `${API_BASE_URL}/users/me/export/${taskId}/download`;
}
