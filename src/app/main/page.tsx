import { EntranceTiles } from "@/components/home/EntranceTiles";
import { CatchcopyTitle } from "@/components/home/FestivalTitle";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import { StarField } from "@/components/home/StarField";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { u } from "@/lib/home/design-unit";
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
    // 背景の星を中身の後ろに置くため、ここで重なりの基準を作る
    <div className="relative isolate min-h-dvh">
      <StarField />
      {/* intro-* はタイトル画面から来たときだけ、見出しのまわりをふわっと出す目印(globals.css) */}
      {/* お知らせの帯には星を透かさない */}
      <div className="intro-bulletin bg-black">
        <BulletinBoard content={announcementOrDefault(content)} />
      </div>
      <SideMenu />
      <RefreshEvery seconds={60} />
      <div className="flex flex-col items-center gap-4 px-4 pb-14">
        <CatchcopyTitle className="w-full pt-12 pb-5" />
        {/* チケットとタイルはデザインの案(幅 264)の比率で描くので、幅の基準になる入れ物 */}
        <div className="intro-content @container w-full max-w-md">
          {/* 「さがす」を上、「いまのステージ」を下(本人の希望で入れ替えて試す)。間は案の 24 */}
          <div className="flex flex-col" style={{ gap: u(24) }}>
            <EntranceTiles />
            <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
          </div>
        </div>
      </div>
    </div>
  );
}
