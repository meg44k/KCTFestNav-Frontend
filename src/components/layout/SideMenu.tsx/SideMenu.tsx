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
            className="absolute rounded-full top-6 right-4"
          />
        }
      >
        <Menu />
      </DrawerTrigger>
      <DrawerContent className="[--drawer-inset:10px] w-50">
        <DrawerHeader>
          <DrawerTitle className="pt-2">高専祭 2026</DrawerTitle>
          <DrawerDescription className="text-wrap">
            高専祭のテーマをここに書く
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <Marker variant="border" />
          <DrawerLabel content={"クラス展示"} href="/class-booth" />
          <DrawerLabel content={"クラブバザー"} href="/bazaar" />
          <DrawerLabel content={"ステージイベント"} href="stage-event" />
          <Marker variant="border" />
        </div>
        <DrawerFooter className="text-center">
          <div className="text-gray-400 underline">
            <a href="/credit">クレジット</a>
          </div>
          <div className="text-gray-400 text-xs text-wrap">
            © 2026 KCT Festival Committee
          </div>
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
