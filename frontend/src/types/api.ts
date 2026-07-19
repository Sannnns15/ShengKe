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

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
}

export interface RegisterRequest {
  phone: string;
  password: string;
  code: string;
  name: string;
}
