"use client";

import { usePathname } from "next/navigation";
import { type TouchEvent, useRef, useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { IchioshiIntro } from "@/components/likes/IchioshiIntro";
import {
  RefreshEvery,
  VISITOR_REFRESH_SECONDS,
} from "@/components/RefreshEvery";
import { BoothCard } from "@/components/ui/boothcard";
import type { Booth } from "@/lib/api/booths";
import {
  applyFilters,
  BOOTH_SORTS,
  BOOTH_TYPES,
  type BoothFilters,
  type BoothType,
  cardUpdatedLabel,
  filtersToQuery,
  gradeCounts,
} from "@/lib/booth-browser";
import { canLike } from "@/lib/likes";
import { cn } from "@/lib/utils";

const TITLES: Record<BoothType, string> = {
  class: "クラス展示",
  club: "クラブバザー",
};

// 「空いている○○だけ」の切り替えの文言
const EMPTY_LABELS: Record<BoothType, string> = {
  class: "すぐ入れる展示",
  club: "すぐ買えるバザー",
};

const chip = (active: boolean) =>
  cn(
    "h-10 shrink-0 rounded-full border px-4 text-sm font-bold",
    active
      ? "border-white bg-white text-black"
      : "border-transparent glass text-gray-300",
  );

/**
 * クラス展示・クラブバザーの一覧。種類・学年・並び順・空いているだけ・キーワードで絞れる。
 * 選んだ条件は URL に残し、戻ってきても同じ状態にする
 */
export function BoothBrowser({
  booths,
  loadFailed,
  defaultType,
  initialFilters,
  serverNow,
}: {
  booths: Booth[];
  loadFailed: boolean;
  /** このページで最初に選ぶ種類(URL に書かない値) */
  defaultType: BoothType;
  initialFilters: BoothFilters;
  /** ページを描画したサーバーの時刻(「○分前に更新」の基準) */
  serverNow: number;
}) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);

  const update = (patch: Partial<BoothFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    // URL だけ書き換える(戻ったとき同じ条件にするため)。router.replace だと押すたび・打つたびに
    // サーバーでページを作り直し、Vercel の CPU を使うので、ブラウザの中で済ませる
    window.history.replaceState(
      null,
      "",
      `${pathname}${filtersToQuery(next, defaultType)}`,
    );
  };

  const shown = applyFilters(booths, filters);
  const grades = gradeCounts(booths, filters);
  const gradeTabs: (number | "all")[] = ["all", ...grades.map((g) => g.grade)];

  // クラス展示では左右にスワイプして学年を切り替える
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    // 上の操作欄(横にスクロールするタブなど)で触ったときは学年を変えない
    if ((e.target as Element).closest("[data-no-swipe]")) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || filters.type !== "class") return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // 縦のスクロールと区別するため、はっきり横に動かしたときだけ
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = gradeTabs.indexOf(filters.grade);
    const next = gradeTabs[i + (dx < 0 ? 1 : -1)];
    if (next !== undefined) update({ grade: next });
  };

  return (
    // 一覧が短くても空いた所でスワイプできるよう、画面全体で受ける
    <div
      className="min-h-dvh"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <SideMenu />
      <RefreshEvery seconds={VISITOR_REFRESH_SECONDS} />
      <PageTitle>{TITLES[filters.type]}</PageTitle>

      {loadFailed ? (
        <p className="flex justify-center mt-10 text-gray-400">
          ブース情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : (
        <>
          {/* スクロールしても条件を変えられるよう上に固定する */}
          <div
            data-no-swipe
            // 上のお知らせの帯のすぐ下に止める
            className="sticky top-[var(--bulletin-h)] z-40 mt-4 bg-black/95 px-4 py-3"
          >
            <div className="mx-auto flex max-w-md flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto">
                {BOOTH_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={filters.type === t.value}
                    onClick={() => update({ type: t.value, grade: "all" })}
                    className={chip(filters.type === t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {filters.type === "class" && grades.length > 0 && (
                <div className="flex gap-1 overflow-x-auto" role="tablist">
                  {gradeTabs.map((g) => {
                    const active = filters.grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => update({ grade: g })}
                        className={cn(
                          "h-10 shrink-0 border-b-2 px-3 font-bold",
                          active
                            ? "border-white text-white"
                            : "border-transparent text-gray-500",
                        )}
                      >
                        {g === "all" ? "全学年" : `${g}年`}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                type="search"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="ブース名・クラス・キーワードで探す"
                aria-label="ブースを探す"
                className="h-11 w-full rounded-md glass px-3 text-base text-white placeholder:text-gray-500"
              />
              {/* 並び順 2 つと「すぐ入れる展示/バザー」は必ず 1 行に並べる */}
              <div className="grid grid-cols-[auto_auto_1fr] gap-2">
                {BOOTH_SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={filters.sort === s.value}
                    onClick={() => update({ sort: s.value })}
                    className={cn(
                      chip(filters.sort === s.value),
                      "px-3 whitespace-nowrap",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={filters.onlyEmpty}
                  onClick={() => update({ onlyEmpty: !filters.onlyEmpty })}
                  className={cn(
                    "h-10 rounded-full border px-3 text-sm font-bold whitespace-nowrap",
                    filters.onlyEmpty
                      ? "border-[#00B894] bg-[#00B894] text-black"
                      : "border-transparent glass text-[#00B894]",
                  )}
                >
                  {filters.onlyEmpty ? "✓ " : ""}
                  {EMPTY_LABELS[filters.type]}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-10">
            {/* 「イチオシにする」が何のボタンか、初めて見た人にもわかるように(初めてはポップアップでも) */}
            {filters.type === "class" &&
              shown.some((b) => canLike(b.organizer)) && (
                <>
                  <IchioshiIntro />
                  <p className="w-full max-w-md text-center text-gray-300 text-sm">
                    気に入った展示を 1 つ「イチオシ」に選ぼう
                    <span className="block text-gray-500 text-xs">
                      あとから別の展示に変えられます
                    </span>
                  </p>
                </>
              )}
            {shown.length === 0 ? (
              <p className="mt-6 text-center text-gray-400">
                {booths.length === 0
                  ? "公開されているブースはまだありません。"
                  : "条件に合うブースがありません。条件を変えてみてください。"}
              </p>
            ) : (
              shown.map((booth) => (
                <BoothCard
                  key={booth.id}
                  name={booth.name}
                  description={booth.description}
                  organizer={booth.organizer}
                  location={booth.location}
                  floor={booth.floor}
                  imageUrl={booth.imageUrl}
                  imageAlt={booth.name}
                  congestionStatus={booth.congestionStatus}
                  latitude={booth.latitude}
                  longitude={booth.longitude}
                  updatedLabel={cardUpdatedLabel(booth, serverNow)}
                  mapHref={
                    booth.latitude !== undefined
                      ? `/map?booth=${booth.id}`
                      : undefined
                  }
                  likeBoothId={canLike(booth.organizer) ? booth.id : undefined}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
