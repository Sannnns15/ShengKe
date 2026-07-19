import { apiClient } from "./client";
import type { UserProfile } from "../types/api";

/**
 * 获取当前用户信息
 */
export async function getMyProfile(): Promise<UserProfile> {
  const res = await apiClient.get("/users/me");
  return res as unknown as UserProfile;
}

/**
 * 更新个人信息
 */
export async function updateMyProfile(
  data: Partial<Pick<UserProfile, "nickname" | "bio" | "gender" | "birthday" | "avatar_url">>
): Promise<UserProfile> {
  const res = await apiClient.patch("/users/me", data);
  return res as unknown as UserProfile;
}

/**
 * 查看他人主页
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await apiClient.get(`/users/${userId}`);
  return res as unknown as UserProfile;
}

/**
 * 注销账号
 */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/users/me");
}
