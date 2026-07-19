import { useAuthStore, type User } from "../stores/authStore";

interface UseAuthReturn {
  user: User | null;
  accessToken: string | null;
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
}

/**
 * Auth hook for page components.
 * Thin wrapper around the Zustand auth store.
 */
export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
