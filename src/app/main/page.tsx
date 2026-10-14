import { EntranceTiles } from "@/components/home/EntranceTiles";
import { CatchcopyTitle } from "@/components/home/FestivalTitle";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import { StarField } from "@/components/home/StarField";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { BG } from "@/lib/home/palette";
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
    <div
      className="relative isolate flex min-h-dvh flex-col"
      style={{ background: BG }}
    >
      <StarField />
      {/* intro-* はタイトル画面から来たときだけ、見出しのまわりをふわっと出す目印(globals.css) */}
      {/* お知らせの帯には星を透かさない */}
      <div className="intro-bulletin" style={{ background: BG }}>
        <BulletinBoard content={announcementOrDefault(content)} />
      </div>
      <SideMenu />
      <RefreshEvery seconds={60} />
      {/*
        上: お知らせのすぐ下に「いまのステージ」、まん中: ロゴ、下: 「さがす」(画面の下にそろえる)。
        部品はデザインの案(幅 264)の比率で描くので、ここが幅の基準になる入れ物
      */}
      <div className="intro-content @container mx-auto flex w-full max-w-md flex-1 flex-col px-4">
        <div className="pt-5">
          <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
        </div>
        {/* 上と下の間の空きのまん中にロゴ */}
        <div className="flex flex-1 items-center justify-center py-6">
          <CatchcopyTitle className="w-full" />
        </div>
        <div className="pb-6">
          <EntranceTiles />
        </div>
      </div>
      {/* 中身が短い画面でも、いちばん下に置く */}
      <footer className="mt-auto px-4 pb-6 text-center text-white/50 text-xs">
        {/* 文字に背景の星が重ならないよう、文字の後ろだけ黒くする */}
        <span className="px-2 py-1" style={{ background: BG }}>
          © 2026 KCT Festival Committee
        </span>
      </footer>
    </div>
  );
}
