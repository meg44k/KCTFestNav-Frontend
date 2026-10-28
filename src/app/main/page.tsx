import Link from "next/link";
import { EntranceTiles } from "@/components/home/EntranceTiles";
import { CatchcopyTitle } from "@/components/home/FestivalTitle";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import { StarField } from "@/components/home/StarField";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import {
  RefreshEvery,
  VISITOR_REFRESH_SECONDS,
} from "@/components/RefreshEvery";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { BG } from "@/lib/home/palette";
import { stageHeadline } from "@/lib/stage-schedule";

export default async function Main() {
  // 学生会が管理画面から書き換えるので、キャッシュしない。落ちていてもタイルは出す。
  // お知らせの帯は全ページ共通の枠(GlobalBulletin)が出す
  const [stage] = await Promise.allSettled([
    apiFetch<{ sections: StageSectionResponse[] }>("/stage", {
      cache: "no-store",
    }),
  ]);
  if (stage.status === "rejected") {
    console.error("ステージイベントの取得に失敗しました", stage.reason);
  }
  const sections = stage.status === "fulfilled" ? stage.value.sections : [];

  return (
    // 背景の星を中身の後ろに置くため、ここで重なりの基準を作る
    <div
      // 入口ページは 1 画面に全部収める(画面の高さに合わせてロゴが伸び縮みする)。
      // ただしとても低い画面(横向きなど)では縮めすぎないよう、下限を決めてスクロールさせる
      // 上のお知らせの帯の分を除いた高さ
      className="relative isolate flex h-[calc(100dvh-var(--bulletin-h))] min-h-[560px] flex-col"
      style={{ background: BG }}
    >
      <StarField />
      {/* intro-* はタイトル画面から来たときだけ、見出しのまわりをふわっと出す目印(globals.css) */}
      {/* 帯がこのページの外(上)に移ったので、メニューは帯のすぐ下に置く(前と同じ位置) */}
      <SideMenu menuClassName="top-2.5" />
      <RefreshEvery seconds={VISITOR_REFRESH_SECONDS} />
      {/*
        上: お知らせのすぐ下に「いまのステージ」、まん中: ロゴ、下: 「さがす」(画面の下にそろえる)。
        部品はデザインの案(幅 264)の比率で描くので、ここが幅の基準になる入れ物
      */}
      <div className="intro-content @container mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-7">
        <div className="pt-5">
          <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
        </div>
        {/* 上と下の間の空きのまん中にロゴ。空きの高さに合わせてロゴの大きさを決める(大きさの基準になる入れ物) */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-4 [container-type:size]">
          <CatchcopyTitle className="w-full" />
        </div>
        <div className="pb-4">
          <EntranceTiles />
        </div>
      </div>
      {/* 中身が短い画面でも、いちばん下に置く */}
      {/* 開発中だけ: タイトル画面のアニメーションをもう一度見る */}
      {process.env.NODE_ENV !== "production" && (
        <Link
          href="/?replay=1"
          className="fixed right-4 bottom-4 z-50 rounded-full border border-white/30 px-3 py-1 text-white/70 text-xs"
          style={{ background: BG }}
        >
          アニメを見る
        </Link>
      )}
      <footer className="px-4 pb-4 text-center text-white/50 text-xs">
        {/* 文字に背景の星が重ならないよう、文字の後ろだけ黒くする */}
        <span className="px-2 py-1" style={{ background: BG }}>
          © 2026 KCT Festival Committee
        </span>
      </footer>
    </div>
  );
}
