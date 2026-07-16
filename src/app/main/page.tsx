"use client";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
export default function Main() {
  return (
    <div>
      <BulletinBoard content="2026 高専祭開催中!!" />
      <SideMenu />
    </div>
  );
}
