"use client";

import { Map as MapIcon, Menu, MicVocal, Store, Utensils } from "lucide-react";
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

export default function SideMenu() {
  return (
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
          <Marker variant="border" className="border-black" />
          <DrawerLabel href="/main">
            <div className="flex items-center gap-1 ">
              <MapIcon size={20} strokeWidth={1.5} />
              <span className="-translate-y-0.5">マップ</span>
            </div>
          </DrawerLabel>
          <DrawerLabel href="/class-booth">
            <div className="flex items-center gap-1">
              <Store size={20} strokeWidth={1.5} />
              <span className="-translate-y-0.5">クラス展示</span>
            </div>
          </DrawerLabel>
          <DrawerLabel href="/bazaar">
            <div className="flex items-center gap-1">
              <Utensils size={20} strokeWidth={1.5} />
              <span className="-translate-y-0.5">クラブバザー</span>
            </div>
          </DrawerLabel>
          <DrawerLabel href="stage-event">
            <div className="flex items-center gap-1">
              <MicVocal size={20} strokeWidth={1.5} />
              <span className="-translate-y-0.5">ステージイベント</span>
            </div>
          </DrawerLabel>
          <Marker variant="border" className="border-black" />
        </div>
        <DrawerFooter className="text-center">
          <div className=" underline">
            <a href="/credit">クレジット</a>
          </div>
          <div className="text-xs text-wrap">© 2026 KCT Festival Committee</div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
