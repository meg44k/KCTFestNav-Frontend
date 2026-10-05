import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import { announcementOrDefault } from "@/lib/live-schedule";
import { MapTypeToggle } from "./MapTypeToggle";

export default async function Main() {
  let content: string | undefined;
  try {
    // 学生会が管理画面から書き換えるので、キャッシュしない
    ({ content } = await apiFetch<{ content: string }>("/announcements", {
      cache: "no-store",
    }));
  } catch (e) {
    // API が落ちていても画面は出し、既定の文を流す
    console.error("お知らせの取得に失敗しました", e);
  }

  return (
    <div>
      <BulletinBoard content={announcementOrDefault(content)} />
      <SideMenu />
      <MapTypeToggle />
      <RefreshEvery seconds={60} />
    </div>
  );
}
