import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "نظام إدارة العمليات والتدريب - Creativa",
  description:
    "نظام لإدارة العمليات و البلاك ليست لمركز إبداع مصر الرقمية بالمنصورة",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${ibmPlexArabic.className} min-h-screen flex flex-col bg-[#F8F8F7] dark:bg-gray-900 transition-colors duration-200 antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
        <NextTopLoader 
          color="#0d9488" 
          initialPosition={0.1} 
          crawlSpeed={200} 
          height={4} 
          crawl={true} 
          showSpinner={true} 
          easing="ease" 
          speed={200} 
          shadow="0 0 15px #0d9488,0 0 5px #0d9488" 
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SWRConfig value={swrConfig}>
            <AuthProvider>
              <Navbar />
              {children}
            </AuthProvider>
          </SWRConfig>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
