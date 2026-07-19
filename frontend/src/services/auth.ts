import { apiClient } from "./client";

interface LoginRequest {
  phone: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
}

export async function loginAPI(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>("/auth/login", data);
  return res.data;
}

export async function getCurrentUser() {
  const res = await apiClient.get("/auth/me");
  return res.data;
}
