"use client";

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
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
      <DrawerContent className="[--drawer-inset:10px] w-50 bg-amber-400/80 after:bg-amber-400/80 border-amber-300 [&_[data-slot=drawer-swipe-handle]]:after:bg-black/40">
        <DrawerHeader>
          <DrawerTitle className="pt-2 text-black">高専祭 2026</DrawerTitle>
          <DrawerDescription className="text-wrap">
            高専祭のテーマをここに書く
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <Marker variant="border" className="border-black" />
          <DrawerLabel content={"クラス展示"} href="/class-booth" />
          <DrawerLabel content={"クラブバザー"} href="/bazaar" />
          <DrawerLabel content={"ステージイベント"} href="stage-event" />
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
  content,
  href,
}: {
  content: string;
  href?: string;
}) {
  return (
    <div className="text-lg pt-2">
      <a href={href}>{content}</a>
    </div>
  );
}
