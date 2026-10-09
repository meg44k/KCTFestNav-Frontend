import { EntranceTiles } from "@/components/home/EntranceTiles";
import { CatchcopyTitle } from "@/components/home/FestivalTitle";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { announcementOrDefault } from "@/lib/live-schedule";
import { stageHeadline } from "@/lib/stage-schedule";

export default async function Main() {
  // 学生会が管理画面から書き換えるので、どちらもキャッシュしない。
  // 片方が落ちていても、もう片方とタイルは出す
  const [announcement, stage] = await Promise.allSettled([
    apiFetch<{ content: string }>("/announcements", { cache: "no-store" }),
    apiFetch<{ sections: StageSectionResponse[] }>("/stage", {
      cache: "no-store",
    }),
  ]);
  if (announcement.status === "rejected") {
    console.error("お知らせの取得に失敗しました", announcement.reason);
  }
  if (stage.status === "rejected") {
    console.error("ステージイベントの取得に失敗しました", stage.reason);
  }
  const content =
    announcement.status === "fulfilled"
      ? announcement.value.content
      : undefined;
  const sections = stage.status === "fulfilled" ? stage.value.sections : [];

  return (
    <div>
      {/* intro-* はタイトル画面から来たときだけ、見出しのまわりをふわっと出す目印(globals.css) */}
      <div className="intro-bulletin">
        <BulletinBoard content={announcementOrDefault(content)} />
      </div>
      <SideMenu />
      <RefreshEvery seconds={60} />
      <div className="flex flex-col items-center gap-4 px-4 pb-10">
        <CatchcopyTitle className="w-full pt-10 pb-2" />
        <div className="intro-content flex w-full flex-col items-center gap-4">
          <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
          <EntranceTiles />
        </div>
      </div>
    </div>
  );
}
