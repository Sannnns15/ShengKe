// ══ Data Models ═══════════════════════════════════════

export interface User {
  id: string;
  phone: string;
  name: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  momentsCount: number;
  createdAt: string;
}

export interface Moment {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  mood?: string;
  location?: string;
  privacy: "self" | "friends" | "mutual_follow" | "public";
  media: MediaItem[];
  tags: string[];
  aiSummary?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbUrl?: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

export interface Comment {
  id: string;
  momentId: string;
  authorId: string;
  author?: User;
  parentId?: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "system";
  message: string;
  read: boolean;
  createdAt: string;
}
