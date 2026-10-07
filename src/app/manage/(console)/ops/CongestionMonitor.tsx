"use client";

import { useEffect, useState, useTransition } from "react";
import { setBoothCongestion } from "@/app/actions/ops";
import { UpdatedAgo } from "@/components/manage/UpdatedAgo";
import type { BoothResponse } from "@/lib/api/booths";
import { CONGESTION_LEVELS, updatedAgo } from "@/lib/manage/congestion";
import { MONITOR_SORTS, type MonitorSort, sortBooths } from "@/lib/manage/ops";
import { cn } from "@/lib/utils";

const SORT_KEY = "kct_manage_monitor_sort";

/** 全ブースの混雑度。並び順は選べる(選んだものはブラウザに覚えておく) */
export function CongestionMonitor({
  booths,
  serverNow,
}: {
  booths: BoothResponse[];
  serverNow: number;
}) {
  // 最初はサーバーと同じ登録順で描き、表示後に覚えている並び順に切り替える(表示のずれを防ぐ)
  const [sort, setSort] = useState<MonitorSort>("booth");
  useEffect(() => {
    // プライベートモードなどで使えないこともあるので、失敗しても登録順のまま
    try {
      const saved = localStorage.getItem(SORT_KEY);
      if (MONITOR_SORTS.some((s) => s.value === saved)) {
        setSort(saved as MonitorSort);
      }
    } catch {}
  }, []);
  const choose = (next: MonitorSort) => {
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {}
  };
  const sorted = sortBooths(booths, sort);
  const staleCount = booths.filter(
    (b) =>
      updatedAgo(
        b.congestion_updated_at,
        new Date(serverNow),
        b.congestion_status,
      ).stale,
  ).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={staleCount ? "font-bold text-[#e54141]" : "text-gray-500"}
        >
          更新が止まっているブース {staleCount} 件
          {staleCount > 0 && "（担当者に声をかけてください）"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          並び順
          <select
            value={sort}
            onChange={(e) => choose(e.target.value as MonitorSort)}
            className="h-10 rounded-md border border-black/20 bg-white px-2"
          >
            {MONITOR_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="flex flex-col">
        {sorted.map((b) => (
          <BoothRow key={b.id} booth={b} serverNow={serverNow} />
        ))}
      </ul>
    </section>
  );
}

function BoothRow({
  booth,
  serverNow,
}: {
  booth: BoothResponse;
  serverNow: number;
}) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const choose = (value: number) =>
    start(async () => {
      const res = await setBoothCongestion(booth.id, value);
      setError(res.error);
    });

  return (
    <li className="flex flex-col gap-2 border-b border-black/10 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-bold">
          {booth.name}{" "}
          <span className="font-normal text-gray-500 text-sm">
            {booth.organizer}
          </span>
        </span>
        <span className="text-sm">
          {pending ? (
            <span className="text-gray-500">更新中…</span>
          ) : (
            <UpdatedAgo
              key={booth.congestion_updated_at ?? "never"}
              updatedAt={booth.congestion_updated_at}
              status={booth.congestion_status}
              serverNow={serverNow}
              compact
            />
          )}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {CONGESTION_LEVELS.map((level) => {
          const selected = booth.congestion_status === level.value;
          return (
            <button
              key={level.value}
              type="button"
              disabled={pending}
              onClick={() => choose(level.value)}
              aria-pressed={selected}
              style={{ backgroundColor: level.color }}
              className={cn(
                "h-10 rounded-md text-sm font-bold text-black",
                selected ? "ring-2 ring-black" : "opacity-40",
              )}
            >
              {level.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-[#e54141] text-sm">
          {error}
        </p>
      )}
    </li>
  );
}
