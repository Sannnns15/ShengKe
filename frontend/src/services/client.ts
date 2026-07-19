import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ────────────────────────────────
// Token 通过 authStore 恢复时写入，此处做兜底日志

apiClient.interceptors.request.use(
  (config) => {
    // Token 由 authStore 在恢复/login 时写入 headers
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 过期——可在此触发 refresh token 逻辑
      // 或者直接跳转登录
      console.warn("[apiClient] 401 Unauthorized");
    }
    return Promise.reject(error);
  }
);
