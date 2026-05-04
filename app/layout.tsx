import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "نظام تتبع الحضور - Creativa",
  description: "نظام لفلترة المسجلين والحضور وإدارة البلاك ليست لمركز إبداع مصر الرقمية بالمنصورة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${ibmPlexArabic.className} min-h-full flex flex-col bg-[#F8F8F7] antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
