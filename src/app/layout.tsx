import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { currentAnnouncement } from "@/app/actions/announcement";
import { StarField } from "@/components/home/StarField";
import { GlobalBulletin } from "@/components/layout/GlobalBulletin";
import { LazyFont } from "@/components/layout/LazyFont";
import { PageStars } from "@/components/layout/PageStars";
import { VisitCounter } from "@/components/layout/VisitCounter";
import { VisitTracker } from "@/components/layout/VisitTracker";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "高専祭2026",
  description: "北九州高専 高専祭 2026のマップウェブサイトです。",
};

export default async function RootLayout({
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
        <VisitCounter />
        <PageStars>
          <StarField fixed />
        </PageStars>
        <GlobalBulletin initial={await currentAnnouncement()} />
        {/* 帯の下から始まる枠。各ページの戻る・メニューのボタン(absolute)は、この枠を基準に置く */}
        <div className="relative flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
