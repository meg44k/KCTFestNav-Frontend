import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BandBar, LiveScheduleCard } from "@/components/ui/liveScheduleCard";
import { apiFetch } from "@/lib/api/client";
import type { LiveResponse } from "@/lib/api/lives";
import { groupLivesByDay, type LiveDay, toBandBar } from "@/lib/live-schedule";

export default async function StageEvent() {
  let days: LiveDay[] = [];
  let loadFailed = false;
  try {
    // 学生会が公演中を切り替えるので、キャッシュしない
    const { lives } = await apiFetch<{ lives: LiveResponse[] }>("/lives", {
      cache: "no-store",
    });
    days = groupLivesByDay(lives);
  } catch (e) {
    // API が落ちていてもページ全体を500にせず、画面は出したうえで案内を表示する
    console.error("ライブ一覧の取得に失敗しました", e);
    loadFailed = true;
  }

  return (
    <div>
      <SideMenu />
      <RefreshEvery seconds={60} />
      <PageTitle>ライブ紹介</PageTitle>
      {loadFailed ? (
        <p className="flex justify-center mt-10 text-gray-400">
          ライブ情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : days.length === 0 ? (
        <p className="flex justify-center mt-10 text-gray-400">
          公開されているライブはまだありません。
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {days.map((day) => (
            <LiveScheduleCard key={day.key} stageName={day.label}>
              {day.lives.map((live) => (
                <BandBar key={live.id} {...toBandBar(live)} />
              ))}
            </LiveScheduleCard>
          ))}
        </div>
      )}
    </div>
  );
}
