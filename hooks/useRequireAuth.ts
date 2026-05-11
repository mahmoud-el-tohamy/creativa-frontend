"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { UserRole } from "@/lib/auth";

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        window.dispatchEvent(new CustomEvent("global-toast", { detail: "ليس لديك صلاحية الوصول" }));
        router.replace("/");
      }
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading };
}
