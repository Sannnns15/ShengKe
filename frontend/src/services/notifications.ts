import { apiClient } from "./client";
import { PAGE_SIZE } from "../constants/config";

// ══ Types ═══════════════════════════════════════════════

export type NotificationType = "like" | "comment" | "follow" | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  /** Optional: the target moment/comment ID for deep-link */
  target_id?: string;
  /** Optional: who triggered this notification */
  actor_name?: string;
  actor_avatar?: string | null;
  created_at: string;
}

interface PaginatedNotifications {
  items: NotificationItem[];
  total: number;
  has_more: boolean;
}

interface UnreadCountResponse {
  count: number;
}

// ══ API Functions ═══════════════════════════════════════

/**
 * 获取通知列表（分页）
 */
export async function getNotifications(
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedNotifications> {
  try {
    const res = await apiClient.get("/notifications", {
      params: { page, page_size: pageSize },
    });
    return res as unknown as PaginatedNotifications;
  } catch {
    // Fallback: mock data when backend is not deployed
    return getMockNotifications(page, pageSize);
  }
}

/**
 * 获取未读通知数
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const res = await apiClient.get("/notifications/unread-count");
    const data = res as unknown as UnreadCountResponse;
    return data.count;
  } catch {
    return 0;
  }
}

/**
 * 标记单条通知为已读
 */
export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}

// ══ Mock Data (fallback when API is unavailable) ════════

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "like",
    title: "收到点赞",
    body: "小明 赞了你的生刻「今天天气真好」",
    is_read: false,
    target_id: "moment-mock-1",
    actor_name: "小明",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    type: "comment",
    title: "收到评论",
    body: "小红 评论了你：感觉好温暖呀～",
    is_read: false,
    target_id: "moment-mock-1",
    actor_name: "小红",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    type: "follow",
    title: "新粉丝",
    body: "张三 关注了你",
    is_read: false,
    actor_name: "张三",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n4",
    type: "system",
    title: "系统通知",
    body: "欢迎加入 ShengKe！开始记录你的第一刻生刻吧 🎉",
    is_read: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n5",
    type: "like",
    title: "收到点赞",
    body: "李四 和 王五 赞了你的生刻「深夜思绪」",
    is_read: true,
    target_id: "moment-mock-2",
    actor_name: "李四",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n6",
    type: "comment",
    title: "收到评论",
    body: "赵六 评论了你：说得太对了！",
    is_read: true,
    target_id: "moment-mock-2",
    actor_name: "赵六",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockCallCount = 0;

function getMockNotifications(
  page: number,
  _pageSize: number
): PaginatedNotifications {
  // Rotate mock data slightly to simulate pagination
  mockCallCount++;
  const offset = (mockCallCount % 3) * 2;
  const items = [...MOCK_NOTIFICATIONS]
    .slice(offset, offset + 3)
    .map((n) => ({
      ...n,
      id: `${n.id}-p${page}`,
      created_at: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    }));

  return {
    items,
    total: MOCK_NOTIFICATIONS.length,
    has_more: page < 3,
  };
}
