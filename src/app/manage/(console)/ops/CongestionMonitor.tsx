"use client";

import { useState, useTransition } from "react";
import { setBoothCongestion } from "@/app/actions/ops";
import { UpdatedAgo } from "@/components/manage/UpdatedAgo";
import type { BoothResponse } from "@/lib/api/booths";
import { CONGESTION_LEVELS, updatedAgo } from "@/lib/manage/congestion";
import { sortForMonitor } from "@/lib/manage/ops";
import { cn } from "@/lib/utils";

/** 全ブースの混雑度。更新が止まっているブースほど上に出す */
export function CongestionMonitor({
  booths,
  serverNow,
}: {
  booths: BoothResponse[];
  serverNow: number;
}) {
  const sorted = sortForMonitor(booths);
  const staleCount = booths.filter(
    (b) => updatedAgo(b.congestion_updated_at, new Date(serverNow)).stale,
  ).length;

  return (
    <section className="flex flex-col gap-3">
      <p className={staleCount ? "font-bold text-[#e54141]" : "text-gray-400"}>
        更新が止まっているブース {staleCount} 件
        {staleCount > 0 && "（担当者に声をかけてください）"}
      </p>
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
    <li className="flex flex-col gap-2 border-b border-white/10 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-bold">
          {booth.name}{" "}
          <span className="font-normal text-gray-400 text-sm">
            {booth.organizer}
          </span>
        </span>
        <span className="text-sm">
          {pending ? (
            <span className="text-gray-400">更新中…</span>
          ) : (
            <UpdatedAgo
              key={booth.congestion_updated_at ?? "never"}
              updatedAt={booth.congestion_updated_at}
              serverNow={serverNow}
              compact
            />
          )}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
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
                selected ? "ring-2 ring-white" : "opacity-40",
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
