"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, clearTokens } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (body: { fullName: string; email: string }) => Promise<User>;
  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await api<User>("/auth/me");
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        clearTokens();
        await refreshUser();
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setUser(data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
    } catch { /* Local UI is cleared even when the service is unavailable. */ }
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  const updateProfile = useCallback(
    async (body: { fullName: string; email: string }) => {
      const me = await api<User>("/auth/me", {
        method: "PATCH",
        body,
      });
      setUser(me);
      return me;
    },
    []
  );

  const changePassword = useCallback(
    async (body: { currentPassword: string; newPassword: string }) => {
      await api<{ success: boolean }>("/auth/me/password", {
        method: "PATCH",
        body,
      });
      clearTokens();
      setUser(null);
      router.push("/login?message=password-changed");
    },
    [router]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [user, loading, login, logout, refreshUser, updateProfile, changePassword]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
