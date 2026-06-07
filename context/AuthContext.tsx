"use client";

import React, { createContext, useEffect, useState } from "react";
import { authAPI, AppUser, pingServer } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  // Listen for global toasts (e.g. from hooks like useRequireAuth)
  useEffect(() => {
    pingServer();
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToastMessage(customEvent.detail);
      setTimeout(() => setToastMessage(null), 5000);
    };
    window.addEventListener("global-toast", handleToast);
    return () => window.removeEventListener("global-toast", handleToast);
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    if (res.data.success && res.data.user) {
      setUser(res.data.user);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error("Sign out error", e);
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const res = await authAPI.me();
        if (mounted && res.data.success) {
          const profile = res.data.user;
          if (!profile.isActive) {
            setToastMessage("تم تعطيل حسابك");
            setTimeout(() => setToastMessage(null), 5000);
            await authAPI.logout();
            setUser(null);
          } else {
            setUser(profile);
          }
        }
      } catch {
        // 401 Unauthorized means no active session, valid state
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 bg-red-600 text-white transition-all text-center min-w-[200px]">
          {toastMessage}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
