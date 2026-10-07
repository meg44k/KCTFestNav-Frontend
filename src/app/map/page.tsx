import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { MapTypeToggle } from "./MapTypeToggle";

export default function MapPage() {
  return (
    <div>
      <SideMenu />
      <PageTitle>マップ</PageTitle>
      <p className="mt-10 flex justify-center text-gray-400">
        マップは準備中です
      </p>
      <MapTypeToggle />
    </div>
  );
}
