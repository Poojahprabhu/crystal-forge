import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { authApi } from "./authApi";
import type { LoginPayload, RegisterPayload, User } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const access = tokenStorage.getAccess();
    if (!access) {
      setStatus("unauthenticated");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        tokenStorage.clear();
        setUser(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await authApi.login(payload);
    tokenStorage.set(tokens.access, tokens.refresh);
    const me = await authApi.me();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user: newUser, tokens } = await authApi.register(payload);
    tokenStorage.set(tokens.access, tokens.refresh);
    setUser(newUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
