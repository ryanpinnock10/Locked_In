import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Locked In",
  description: "Focus on what matters. No distractions.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Locked In",
  },
};

import { ClerkProvider } from "@clerk/nextjs";

// ... imports

import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
