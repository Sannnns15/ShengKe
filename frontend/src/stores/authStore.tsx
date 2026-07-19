import { create } from "zustand";
import {
  setAccessToken,
  getAccessToken,
  removeAccessToken,
  setRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  setStoredUser,
  getStoredUser,
  removeStoredUser,
  clearAllAuth,
} from "../utils/storage";
import {
  loginAPI,
  registerAPI,
  logoutAPI,
  refreshTokenAPI,
} from "../services/auth";

// ── Types ──────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (phone: string, password: string) => Promise<void>;
  register: (
    phone: string,
    password: string,
    code: string,
    nickname: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phone: string, password: string) => {
    const res = await loginAPI({ phone, password });

    // Login response: { access_token, refresh_token, expires_in, token_type }
    // We need a separate /users/me call to get user info after login
    const token = res.access_token;
    const rToken = res.refresh_token;

    await Promise.all([
      setAccessToken(token),
      setRefreshToken(rToken),
    ]);

    set({
      accessToken: token,
      refreshToken: rToken,
      isAuthenticated: true,
    });
  },

  register: async (
    phone: string,
    password: string,
    code: string,
    nickname: string
  ) => {
    const res = await registerAPI({ phone, password, code, nickname });

    // Register response: { user, access_token, refresh_token, expires_in }
    const token = res.access_token;
    const rToken = res.refresh_token;
    const userData: User = {
      id: res.user.id,
      phone: res.user.phone,
      nickname: res.user.nickname,
      avatar_url: res.user.avatar_url,
    };

    await Promise.all([
      setAccessToken(token),
      setRefreshToken(rToken),
      setStoredUser(JSON.stringify(userData)),
    ]);

    set({
      accessToken: token,
      refreshToken: rToken,
      user: userData,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await logoutAPI();
    } catch {
      // Ignore logout API errors — clear locally regardless
    }
    await clearAllAuth();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAccessToken: async () => {
    const currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) return;

    const res = await refreshTokenAPI({ refresh_token: currentRefreshToken });
    const newToken = res.access_token;

    await setAccessToken(newToken);
    set({ accessToken: newToken });
  },

  loadStoredAuth: async () => {
    try {
      const [at, rt, userRaw] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getStoredUser(),
      ]);

      if (at) {
        let user: User | null = null;
        try {
          if (userRaw) user = JSON.parse(userRaw);
        } catch {
          // stored user data is malformed — ignore
        }

        set({
          accessToken: at,
          refreshToken: rt || null,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

// ── Legacy AuthProvider (kept for existing _layout.tsx compatibility) ──

import { useEffect, type ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { loadStoredAuth } = useAuthStore();

  // Hydrate from SecureStore on mount
  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  return <>{children}</>;
}

/**
 * Legacy hook — kept for existing consumers.
 * New code should use useAuthStore directly or imports from hooks/useAuth.ts.
 */
export function useAuth() {
  return useAuthStore();
}
