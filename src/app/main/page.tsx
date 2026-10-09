import { EntranceTiles } from "@/components/home/EntranceTiles";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import { StarField } from "@/components/home/StarField";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { eventYear } from "@/lib/constants";
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
        {/* ロゴは外して試す(本人の希望)。読み上げ用の見出しだけ残す。上はメニューのボタンと重ならない分あける */}
        <h1 className="sr-only">{eventYear} 北九州高専 高専祭</h1>
        <div aria-hidden className="h-16" />
        {/* チケットとタイルはデザインの案(幅 264)の比率で描くので、幅の基準になる入れ物 */}
        <div className="intro-content @container w-full max-w-md">
          {/* 「いまのステージ」を上、「さがす」を下。間は案の 24 */}
          <div className="flex flex-col" style={{ gap: u(24) }}>
            <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
            <EntranceTiles />
          </div>
        </div>
      </div>
    </div>
  );
}
