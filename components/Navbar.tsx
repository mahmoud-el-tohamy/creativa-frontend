"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "رصد الحضور" },
    { href: "/filter", label: "فلترة القوائم" },
    { href: "/blacklist", label: "البلاك ليست" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Creativa Logo" 
                width={48} 
                height={48} 
                className="object-contain"
              />
              <div className="flex flex-col hidden sm:flex">
                <span className="text-2xl font-extrabold text-blue-900 leading-tight">كرياتيفا</span>
                <span className="text-xs text-gray-500 font-medium tracking-wider">نظام فلترة التدريبات</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
