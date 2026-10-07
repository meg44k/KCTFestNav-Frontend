"use client";

import { Menu } from "lucide-react";
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

export default function SideMenu() {
  return (
    <>
      {/* 左上の戻るボタン(右上のメニューと対になる) */}
      <BackButton />
      <Drawer swipeDirection="right" showSwipeHandle={true}>
        <DrawerTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              className="absolute rounded-full top-13 right-4 bg-black/80 w-10 h-10 z-50"
            />
          }
        >
          <Menu />
        </DrawerTrigger>
        <DrawerContent className="[--drawer-inset:10px] max-w-55 bg-amber-400/80 after:bg-amber-400/80 border-amber-300 [&_[data-slot=drawer-swipe-handle]]:after:bg-black/40">
          <DrawerHeader>
            <DrawerTitle className="pt-2 text-black">高専祭 2026</DrawerTitle>
            <DrawerDescription className="text-wrap">
              高専祭のテーマをここに書く
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
