import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { LazyFont } from "@/components/layout/LazyFont";
import { VisitTracker } from "@/components/layout/VisitTracker";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "高専祭2026",
  description: "北九州高専 高専祭 2026のマップウェブサイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <LazyFont />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
