import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { DayTabs } from "@/components/stage/DayTabs";
import { NowPlayingBanner } from "@/components/stage/NowPlayingBanner";
import { StageSectionCard } from "@/components/stage/StageSectionCard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import {
  pickDay,
  sectionFinished,
  sectionsOn,
  stageDays,
} from "@/lib/stage-schedule";

export default async function StageEvent({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day } = await searchParams;
  let sections: StageSectionResponse[] = [];
  let loadFailed = false;
  try {
    // 学生会が演奏中を進めるので、キャッシュしない
    ({ sections } = await apiFetch<{ sections: StageSectionResponse[] }>(
      "/stage",
      { cache: "no-store" },
    ));
  } catch (e) {
    // API が落ちていてもページ全体を500にせず、画面は出したうえで案内を表示する
    console.error("ステージイベントの取得に失敗しました", e);
    loadFailed = true;
  }

  const nowMs = Date.now();
  const days = stageDays(sections);
  const selected = pickDay(
    days,
    typeof day === "string" ? day : undefined,
    nowMs,
  );
  const ofDay = selected ? sectionsOn(sections, selected.key) : [];

  return (
    <div>
      <SideMenu />
      <RefreshEvery seconds={60} />
      <PageTitle>ステージイベント</PageTitle>
      {loadFailed ? (
        <p className="mt-10 flex justify-center text-gray-400">
          ステージイベントの情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : !selected ? (
        <p className="mt-10 flex justify-center text-gray-400">
          ステージイベントの予定はまだありません。
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 pb-10">
          <div className="w-full max-w-md">
            <DayTabs days={days} selected={selected.key} />
          </div>
          <NowPlayingBanner sections={ofDay} nowMs={nowMs} />
          {ofDay.map((s) => (
            <StageSectionCard
              key={s.id}
              section={s}
              finished={sectionFinished(s, nowMs)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
