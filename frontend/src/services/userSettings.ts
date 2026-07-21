import { apiClient } from './client'

export interface UserSettings {
  notification_enabled: boolean
  privacy_default: number
}

export async function getMySettings(): Promise<UserSettings> {
  const res = await apiClient.get('/users/me/settings')
  return res as unknown as UserSettings
}

export async function updateMySettings(
  data: Partial<UserSettings>
): Promise<UserSettings> {
  const res = await apiClient.patch('/users/me/settings', data)
  return res as unknown as UserSettings
}
