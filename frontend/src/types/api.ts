// ══ API Request / Response Types ═════════════════════════

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string;
  avatar_url: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface RegisterResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  code: string;
  nickname: string;
}

// ══ Moment Types ═══════════════════════════════════════════

export interface MomentFeedItem {
  id: string;
  user_id: string;
  title?: string;
  content?: string;
  mood?: string;
  weather?: string;
  location_name?: string;
  privacy_level: number;
  is_archived: boolean;
  ai_tags?: string[];
  comment_count: number;
  like_count: number;
  view_count: number;
  created_at: string;
  author_nickname?: string;
  author_avatar_url?: string | null;
  is_liked?: boolean;
}

export interface MomentDetail extends MomentFeedItem {
  location_lat?: number;
  location_lng?: number;
  visibility_group?: string[];
  ai_summary?: string;
  ai_emotion?: string;
  updated_at: string;
}

export interface CreateMomentParams {
  content?: string;
  title?: string;
  mood?: string;
  weather?: string;
  location_name?: string;
  privacy_level?: number;
  media_ids?: string[];
  tag_names?: string[];
}

// ══ User Types ════════════════════════════════════════════

export interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  avatar_url: string | null;
  bio?: string;
  gender?: number;
  birthday?: string;
  moment_count: number;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

// ══ AI Types ═══════════════════════════════════════════════

export interface MoodReport {
  period: string;
  summary: string;
  emotion_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  daily_moods: Array<{
    date: string;
    dominant_emotion: string;
    mood_score: number;
  }>;
  top_keywords: string[];
}

export interface MomentAnalysis {
  id: string;
  ai_summary: string;
  ai_emotion: string;
  ai_tags: string[];
  created_at: string;
}

// ══ Collection Types ═══════════════════════════════════════

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sort_order: number;
  moment_count?: number;
  created_at: string;
}

export interface MediaUpload {
  url: string;
  object_key: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}
