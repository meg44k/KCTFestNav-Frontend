"use client";
import { useState } from "react";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
export default function Main() {
  const [mapType, setMapType] = useState("2D");

  const changeMapType = () => {
    if (mapType === "2D") {
      setMapType("3D");
    } else {
      setMapType("2D");
    }
  };
  return (
    <div>
      <BulletinBoard content="2026 高専祭開催中!!" />
      <SideMenu />
      <button
        type="button"
        onClick={changeMapType}
        className="absolute flex justify-center items-center bottom-10 right-4 rounded-full w-10 h-10 border border-white-1"
      >
        <span className="text-sm">{mapType}</span>
      </button>
    </div>
  );
}
