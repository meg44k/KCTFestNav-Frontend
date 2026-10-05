"use client";

import { useState, useTransition } from "react";
import { setLiveStatus } from "@/app/actions/ops";
import type { LiveResponse } from "@/lib/api/lives";
import { LIVE_STATUSES, sortLives } from "@/lib/manage/ops";
import { cn } from "@/lib/utils";
import { DeleteLiveButton } from "./DeleteLiveButton";
import { LiveFormDialog } from "./LiveFormDialog";

// 日本時間の「13:00」
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });

export function LiveList({
  lives,
  isAdmin,
}: {
  lives: LiveResponse[];
  isAdmin: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      {isAdmin && (
        <div className="flex justify-end">
          <LiveFormDialog />
        </div>
      )}
      {lives.length === 0 ? (
        <p className="text-gray-500">ライブが登録されていません。</p>
      ) : (
        <ul className="flex flex-col">
          {sortLives(lives).map((l) => (
            <LiveRow key={l.id} live={l} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
      <p className="font-bold text-[#e54141] text-sm">
        公演中にすると、ほかに公演中のライブは終了になります。
      </p>
    </section>
  );
}

function LiveRow({ live, isAdmin }: { live: LiveResponse; isAdmin: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const choose = (value: number) =>
    start(async () => {
      const res = await setLiveStatus(live.id, value);
      setError(res.error);
    });

  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b border-black/10 py-3",
        live.status === 1 && "rounded-lg border border-[#e54141] px-3",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-bold">
          {live.name}{" "}
          <span className="font-normal text-gray-500 text-sm">
            第{live.session_number}回
          </span>
        </span>
        <span className="text-gray-500 text-sm">
          {day(live.start_time)} {hm(live.start_time)}〜{hm(live.end_time)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LIVE_STATUSES.map((s) => {
          const selected = live.status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              disabled={pending}
              onClick={() => choose(s.value)}
              aria-pressed={selected}
              className={cn(
                "h-10 rounded-md border text-sm font-bold",
                selected
                  ? s.value === 1
                    ? "border-[#e54141] bg-[#e54141] text-white"
                    : "border-black bg-black text-white"
                  : "border-black/20 text-gray-600",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {pending && <p className="text-gray-500 text-sm">切り替え中…</p>}
      {error && (
        <p role="alert" className="text-[#e54141] text-sm">
          {error}
        </p>
      )}
      {isAdmin && (
        <div className="flex gap-2">
          <LiveFormDialog current={live} />
          <DeleteLiveButton id={live.id} name={live.name} />
        </div>
      )}
    </li>
  );
}
