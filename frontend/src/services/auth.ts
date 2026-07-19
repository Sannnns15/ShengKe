import { apiClient } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "../types/api";

// ── Internal types (not exported to API types) ─────────

interface SendCodeParams {
  phone: string;
  type: "register" | "reset_password" | "login";
}

interface RefreshTokenParams {
  refresh_token: string;
}

interface RefreshTokenResponse {
  access_token: string;
}

// ── API functions ──────────────────────────────────────

/**
 * User registration with phone, password, verification code, and nickname.
 */
export async function registerAPI(
  params: RegisterRequest
): Promise<LoginResponse> {
  const res = await apiClient.post("/auth/register", params);
  return res as unknown as LoginResponse;
}

/**
 * Login with phone and password.
 */
export async function loginAPI(
  params: LoginRequest
): Promise<LoginResponse> {
  const res = await apiClient.post("/auth/login", params);
  return res as unknown as LoginResponse;
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshTokenAPI(
  params: RefreshTokenParams
): Promise<RefreshTokenResponse> {
  const res = await apiClient.post("/auth/refresh", params);
  return res as unknown as RefreshTokenResponse;
}

/**
 * Logout — invalidate the current session.
 */
export async function logoutAPI(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/**
 * Send verification code to phone.
 */
export async function sendCodeAPI(params: SendCodeParams): Promise<void> {
  await apiClient.post("/auth/send-code", params);
}
