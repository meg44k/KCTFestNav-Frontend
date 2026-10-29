"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/layout/BackButton";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Marker } from "@/components/ui/marker";
import { NAV_ENTRANCES, NAV_HOME, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * 左上の戻るボタンと右上のメニュー。
 * ふだんは画面に固定し(お知らせの帯のすぐ下)、スクロールしても上に残す。
 * floating={false} はページ自体が画面に固定されているとき(地図)で、今までどおりページの中に置く
 */
export default function SideMenu({
  floating = true,
}: {
  floating?: boolean;
} = {}) {
  const place = floating
    ? "fixed top-[calc(var(--bulletin-h)+0.5rem)]"
    : "absolute top-13";
  return (
    <>
      {floating && <NavBand />}
      {/* 左上の戻るボタン(右上のメニューと対になる) */}
      <BackButton className={cn(place, "left-4")} />
      <Drawer swipeDirection="right" showSwipeHandle={true}>
        <DrawerTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              className={cn(
                // 部品の既定の地(bg-background)を、ガラスの下の暗い色で上書きする
                "rounded-full right-4 border-transparent glass bg-[rgb(14_14_16/0.55)] w-10 h-10 z-50",
                place,
              )}
            />
          }
        >
          <Menu />
        </DrawerTrigger>
        <DrawerContent className="[--drawer-inset:10px] max-w-55 bg-amber-400/80 after:bg-amber-400/80 border-amber-300 [&_[data-slot=drawer-swipe-handle]]:after:bg-black/40">
          <DrawerHeader>
            <DrawerTitle className="pt-2 text-black">高専祭 2026</DrawerTitle>
            {/* 高専祭のテーマ(キャッチコピーのロゴ)。黄色の上なので黒 */}
            <DrawerDescription className="pt-1">
              <Image
                src="/catchcopy-black.png"
                alt="ST@R G4ZER"
                width={992}
                height={528}
                className="h-auto w-full"
              />
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            {/* トップは線の上、各ページへの入口は線と線の間 */}
            <NavItemLabel item={NAV_HOME} />
            <div className="pt-2">
              <Marker variant="border" className="border-black" />
            </div>
            {NAV_ENTRANCES.map((item) => (
              <NavItemLabel key={item.href} item={item} />
            ))}
            <Marker variant="border" className="border-black" />
          </div>
          <DrawerFooter className="text-center">
            <div className=" underline">
              <a href="/credit">クレジット</a>
            </div>
            <div className="text-xs text-wrap">
              © 2026 KCT Festival Committee
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function NavItemLabel({
  item: { label, href, icon: Icon },
}: {
  item: NavItem;
}) {
  return (
    <DrawerLabel href={href}>
      <div className="flex items-center gap-1">
        <Icon size={20} strokeWidth={1.5} />
        <span className="-translate-y-0.5">{label}</span>
      </div>
    </DrawerLabel>
  );
}

export function DrawerLabel({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="text-lg pt-2 ">
      <a href={href}>{children}</a>
    </div>
  );
}

/**
 * スクロールしたとき、固定したボタンの行の後ろに敷く暗い帯。
 * 一番上にいるときは透明にして、見出しや星を隠さない
 */
function NavBand() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[var(--bulletin-h)] z-40 h-[var(--nav-h)] transition-colors duration-200",
        scrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent",
      )}
    />
  );
}
