"use client";

import React, { createContext, useEffect, useState } from "react";
import { authAPI, AppUser, pingServer } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
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

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await authAPI.me();
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user", error);
    }
  }, []);

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
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 bg-red-600 text-white transition-all text-center min-w-[200px]">
          {toastMessage}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-[#F8F8F7] dark:bg-gray-900 w-full fixed inset-0 z-[9999]" dir="rtl">
          <div className="flex flex-col items-center justify-center gap-4">
             <svg className="animate-spin h-12 w-12 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">جاري تحميل النظام...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
