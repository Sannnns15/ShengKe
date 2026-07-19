import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { setToken, getToken, removeToken } from "../utils/storage";
import { apiClient } from "../services/client";

// ── Types ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

// ── Context ────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时从 SecureStore 恢复 token
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          // 将 token 写入 axios 默认头
          apiClient.defaults.headers.common["Authorization"] =
            `Bearer ${storedToken}`;
          setTokenState(storedToken);
          // TODO: 用 token 获取用户信息
        }
      } catch (err) {
        console.error("Failed to restore auth:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    // TODO: 替换为真实 API 调用
    const { token: newToken, user: newUser } = await mockLogin(phone, password);

    await setToken(newToken);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    delete apiClient.defaults.headers.common["Authorization"];
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

// ── Mock login ─────────────────────────────────────────

async function mockLogin(
  _phone: string,
  _password: string
): Promise<{ token: string; user: User }> {
  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 800));
  return {
    token: "mock-jwt-token-" + Date.now(),
    user: {
      id: "u_001",
      name: "Gatsby",
      avatar: undefined,
      bio: "记录生活的每一刻",
    },
  };
}
