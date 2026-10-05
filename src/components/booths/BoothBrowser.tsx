"use client";

import { usePathname, useRouter } from "next/navigation";
import { type TouchEvent, useRef, useState } from "react";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BoothCard } from "@/components/ui/boothcard";
import type { Booth } from "@/lib/api/booths";
import {
  applyFilters,
  BOOTH_SORTS,
  BOOTH_TYPES,
  type BoothFilters,
  type BoothType,
  filtersToQuery,
  gradeCounts,
  updatedLabel,
} from "@/lib/booth-browser";
import { cn } from "@/lib/utils";

const TITLES: Record<BoothType, string> = {
  class: "クラス展示",
  club: "クラブバザー",
};

const chip = (active: boolean) =>
  cn(
    "h-10 shrink-0 rounded-full border px-4 text-sm font-bold",
    active
      ? "border-white bg-white text-black"
      : "border-white/30 text-gray-300",
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
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);

  const update = (patch: Partial<BoothFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    router.replace(`${pathname}${filtersToQuery(next, defaultType)}`, {
      scroll: false,
    });
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
      <RefreshEvery seconds={60} />
      <h1 className="flex justify-center font-extrabold text-4xl">
        {TITLES[filters.type]}
      </h1>

      {loadFailed ? (
        <p className="flex justify-center mt-10 text-gray-400">
          ブース情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : (
        <>
          {/* スクロールしても条件を変えられるよう上に固定する */}
          <div
            data-no-swipe
            className="sticky top-0 z-40 mt-4 bg-black/95 px-4 py-3"
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
                    const count =
                      g === "all"
                        ? grades.reduce((n, x) => n + x.count, 0)
                        : grades.find((x) => x.grade === g)?.count;
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
                        <span className="ml-1 text-xs">({count})</span>
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
                className="h-11 w-full rounded-md border border-white/30 bg-black px-3 text-base text-white placeholder:text-gray-500"
              />
              {/* 並び順 2 つと「空いている展示」は必ず 1 行に並べる */}
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
                      : "border-[#00B894]/60 text-[#00B894]",
                  )}
                >
                  {filters.onlyEmpty ? "✓ " : ""}空いている展示
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-10">
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
                  imageUrl={booth.imageUrl}
                  imageAlt={booth.name}
                  congestionStatus={booth.congestionStatus}
                  latitude={booth.latitude}
                  longitude={booth.longitude}
                  updatedLabel={updatedLabel(
                    booth.congestionUpdatedAt,
                    serverNow,
                  )}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
