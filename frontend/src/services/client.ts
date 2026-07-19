import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "../constants/config";
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  clearAllAuth,
} from "../utils/storage";
import type { ApiResponse } from "../types/api";

// ── Global auth logout hook (set by authStore) ──────────
// Allows the HTTP interceptor to trigger a store-wide logout
// when token refresh fails (e.g. refresh token expired).
let _onForceLogout: (() => void) | null = null;

export function setOnForceLogout(cb: () => void) {
  _onForceLogout = cb;
}

let refreshPromise: Promise<string | null> | null = null;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ────────────────────────────────
// Automatically attach access token from SecureStore
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────
// 1) Extract response.data (unwrap ApiResponse envelope)
// 2) Auto-refresh on 401 and retry the original request
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap ApiResponse<unknown> envelope: return the inner `data` field directly.
    // After this interceptor, apiClient.post<T>() effectively returns T (the inner payload).
    return response.data?.data ?? response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If not a 401 or already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Ensure only one refresh runs at a time
    if (!refreshPromise) {
      refreshPromise = doRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      // Refresh failed (token expired or revoked) — force logout
      await clearAllAuth();
      _onForceLogout?.();
      return Promise.reject(error);
    }

    // Attach new token and retry
    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
    }
    return apiClient(originalRequest);
  }
);

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 */
async function doRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post<ApiResponse<{ access_token: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken }
    );
    const newAccessToken = res.data.data.access_token;
    await setAccessToken(newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

/**
 * Extract a human-readable error message from an API error response.
 * Handles both ApiResponse envelope and raw errors.
 */
export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const axiosErr = error as { response?: { data?: { message?: string; code?: number } }; message?: string };
    if (axiosErr.response?.data?.message) {
      return axiosErr.response.data.message;
    }
    if (axiosErr.message) {
      return axiosErr.message;
    }
  }
  return "操作失败，请稍后重试";
}
