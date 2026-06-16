"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/lib/api";

type NavLink = {
  href: string;
  label: string;
};

const ROLE_META: Record<UserRole, { label: string; color: string }> = {
  admin:    { label: "مدير",   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  employee: { label: "موظف",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  viewer:   { label: "مشاهد", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  accountant: { label: "محاسب", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
};

const BASE_LINKS_ALL: NavLink[] = [
  { href: "/",            label: "الرئيسية" },
  { href: "/attendance",  label: "رصد الحضور" },
  { href: "/multi-day-attendance", label: "الحضور متعدد الأيام" },
  { href: "/attendance-sheet", label: "فصل شيت الحضور" },
  { href: "/filter",      label: "فلترة القوائم" },
  { href: "/organize",    label: "تنظيم شيت الحضور" },
  { href: "/hours",       label: "متابعة الساعات" },
  { href: "/instructors", label: "المدربون" },
  { href: "/certificates",label: "الشهادات" },
  { href: "/blacklist",   label: "البلاك ليست" },
];

// Viewer only sees these two
const VIEWER_LINKS: NavLink[] = [
  { href: "/",        label: "الرئيسية" },
  { href: "/blacklist", label: "البلاك ليست" },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/audit", label: "سجل الإجراءات" },
];

function UserSkeleton() {
  return (
    <div className="hidden xl:flex items-center gap-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="w-12 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<"attendance" | "sheets" | "instructors" | "admin" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const { user, loading, signOut } = useAuth();

  // Must call all hooks before any early return (React rules of hooks)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    if (isMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node))
        setIsUserDropdownOpen(false);
    };
    if (isUserDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isUserDropdownOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenDesktopDropdown(null);
      }
    };
    if (openDesktopDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDesktopDropdown]);

  // Don't render navbar at all on the login page (after all hooks)
  if (pathname === "/login") return null;

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const isAccountant = user?.role === "accountant";

  const navLinks = isAccountant
    ? [{ href: "/", label: "الرئيسية" }, { href: "/financial-tracking", label: "المالية" }, { href: "/instructors", label: "المدربون" }]
    : isViewer
    ? VIEWER_LINKS
    : isAdmin
    ? [...BASE_LINKS_ALL, { href: "/financial-tracking", label: "المتابعة المالية" }, ...ADMIN_LINKS]
    : BASE_LINKS_ALL;

  const desktopNavItems = isAccountant
    ? [
        { 
          type: "link" as const, 
          href: "/", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              الرئيسية
            </span>
          ) as unknown as string
        },
        {
          type: "link" as const,
          href: "/instructors",
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              المدربون
            </span>
          ) as unknown as string,
        },
        {
          type: "link" as const,
          href: "/financial-tracking",
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              المتابعة المالية
            </span>
          ) as unknown as string,
        },
      ]
    : isViewer
    ? [
        { 
          type: "link" as const, 
          href: "/", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              الرئيسية
            </span>
          ) as unknown as string
        },
        { 
          type: "link" as const, 
          href: "/blacklist", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              البلاك ليست
            </span>
          ) as unknown as string 
        },
      ]
    : [
        { 
          type: "link" as const, 
          href: "/", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              الرئيسية
            </span>
          ) as unknown as string
        },
        {
          type: "group" as const,
          key: "attendance" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              الحضور
            </span>
          ) as unknown as string,
          links: [
            { href: "/attendance", label: "رصد الحضور" },
            { href: "/multi-day-attendance", label: "متعدد الأيام" },
          ],
        },
        {
          type: "group" as const,
          key: "sheets" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              تنظيم الشيتات
            </span>
          ) as unknown as string,
          links: [
            { href: "/organize", label: "تنظيم شيت الحضور" },
            { href: "/attendance-sheet", label: "فصل شيت الحضور" },
          ],
        },
        { 
          type: "link" as const, 
          href: "/filter", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              الفلترة
            </span>
          ) as unknown as string 
        },
        { 
          type: "link" as const, 
          href: "/hours", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              متابعة الساعات
            </span>
          ) as unknown as string 
        },
        ...(isAdmin
          ? [
              {
                type: "group" as const,
                key: "instructors" as const,
                label: (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    المدربون
                  </span>
                ) as unknown as string,
                links: [
                  { href: "/instructors", label: "قائمة المدربين" },
                  { href: "/financial-tracking", label: "المتابعة المالية" },
                ],
              },
            ]
          : [
              {
                type: "link" as const,
                href: "/instructors",
                label: (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    المدربون
                  </span>
                ) as unknown as string,
              },
            ]),
        { 
          type: "link" as const, 
          href: "/certificates", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              الشهادات
            </span>
          ) as unknown as string 
        },
        { 
          type: "link" as const, 
          href: "/blacklist", 
          label: (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              البلاك ليست
            </span>
          ) as unknown as string 
        },
        ...(isAdmin
          ? [
              {
                type: "group" as const,
                key: "admin" as const,
                label: (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    الإدارة
                  </span>
                ) as unknown as string,
                links: ADMIN_LINKS,
              },
            ]
          : []),
      ];

  const linkBase = "text-sm font-bold transition-all border-b-2 flex items-center h-full";
  const active   = "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400";
  const inactive = "text-gray-600 dark:text-gray-300 border-transparent hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-300 dark:hover:border-gray-600";

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8" ref={menuRef}>
        <div className="flex justify-between items-center h-14 md:h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3" onClick={() => setIsMenuOpen(false)}>
              <Image src="/logo.png" alt="Creativa Logo" width={40} height={40} className="object-contain md:w-12 md:h-12" />
              <div className="hidden sm:flex flex-col">
                <span className="text-xl md:text-2xl font-extrabold text-blue-900 dark:text-blue-400 leading-tight">كرياتيفا</span>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wider">نظام فلترة التدريبات</span>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-4 h-full">

            {/* Desktop nav links — full height for border-bottom alignment */}
            <div className="hidden xl:flex items-stretch h-14 md:h-16 gap-0.5" ref={desktopNavRef}>
              {desktopNavItems.map((item) => {
                if (item.type === "link") {
                  const isActive = pathname === item.href || (item.href === "/hours" && pathname.startsWith("/hours")) || (item.href === "/instructors" && pathname.startsWith("/instructors"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${linkBase} px-2.5 ${isActive ? active : inactive}`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                const isGroupActive = item.links.some((link) => pathname === link.href);
                const isOpen = openDesktopDropdown === item.key;
                const isAdminGroup = item.key === "admin";

                return (
                  <div key={item.key} className="relative">
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                      onClick={() => setOpenDesktopDropdown((prev) => prev === item.key ? null : item.key)}
                      className={`${linkBase} px-2.5 ${isGroupActive ? active : inactive}`}
                    >
                      {isAdminGroup && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 ml-1.5 shrink-0" />
                      )}
                      {item.label}
                      <svg
                        className={`mr-1 h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        {item.links.map((link) => {
                          const isActive = pathname === link.href;
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setOpenDesktopDropdown(null)}
                              className={`block px-4 py-3 text-sm font-semibold transition-colors ${
                                isActive
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/70"
                              }`}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden xl:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

            {/* User info (desktop) */}
            {mounted && (
              loading ? (
                <UserSkeleton />
              ) : user ? (
                <div className="relative hidden xl:block" ref={userDropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen((o) => !o)}
                    aria-haspopup="true"
                    aria-expanded={isUserDropdownOpen}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {user.displayName?.charAt(0) || "؟"}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 max-w-[110px] truncate">
                      {user.displayName}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${ROLE_META[user.role].color}`}>
                      {ROLE_META[user.role].label}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isUserDropdownOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {isUserDropdownOpen && (
                    <div className="absolute z-[100] left-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setIsUserDropdownOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              ) : null
            )}

            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                aria-label="Toggle Dark Mode"
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                  </svg>
                )}
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              className="xl:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`xl:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? "max-h-screen opacity-100 border-t border-gray-100 dark:border-gray-800" : "max-h-0 opacity-0"
        }`}>
          <div className="py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href === "/hours" && pathname.startsWith("/hours")) || (link.href === "/instructors" && pathname.startsWith("/instructors"));
              const isAdminLink = ADMIN_LINKS.some((l) => l.href === link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {isAdminLink && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
                  {link.label}
                </Link>
              );
            })}

            {/* User info (mobile) */}
            {user && (
              <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800 px-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {user.displayName?.charAt(0) || "؟"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user.displayName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-auto shrink-0 ${ROLE_META[user.role].color}`}>
                    {ROLE_META[user.role].label}
                  </span>
                </div>
                <button
                  onClick={() => { setIsMenuOpen(false); signOut(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
