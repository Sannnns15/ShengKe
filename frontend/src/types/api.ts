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
