"use client";

import React from "react";
import type { UserRole } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export default function RouteGuard({ children, allowedRoles, fallback }: RouteGuardProps) {
  const { user, loading } = useRequireAuth(allowedRoles);

  if (loading) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F7] dark:bg-gray-900 w-full h-full">
        <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">جاري التحقق...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
