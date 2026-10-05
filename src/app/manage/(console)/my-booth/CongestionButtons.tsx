"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCongestion } from "@/app/actions/my-booth";
import { CONGESTION_LEVELS } from "@/lib/manage/congestion";
import { cn } from "@/lib/utils";

/**
 * 混雑度のボタン。押した瞬間に強調を移し(useOptimistic)、
 * 保存に失敗したら元の強調に戻してエラーを出す
 */
export function CongestionButtons({
  boothId,
  current,
}: {
  boothId: number;
  current: number;
}) {
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [error, setError] = useState<string>();
  const [, start] = useTransition();

  const choose = (value: number) =>
    start(async () => {
      setError(undefined);
      setOptimistic(value);
      const res = await setCongestion(boothId, value);
      if (res.error) setError(res.error);
    });

  return (
    <div className="flex flex-col gap-3">
      {CONGESTION_LEVELS.map((level) => {
        const selected = optimistic === level.value;
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => choose(level.value)}
            aria-pressed={selected}
            style={{ backgroundColor: level.color }}
            className={cn(
              "h-20 rounded-xl text-2xl font-extrabold text-black transition",
              selected ? "ring-4 ring-white" : "opacity-60",
            )}
          >
            {selected && "✓ "}
            {level.label}
            {selected && <span className="ml-2 text-base">（現在）</span>}
          </button>
        );
      })}
      {error && (
        <p role="alert" className="text-[#e54141]">
          {error}
        </p>
      )}
    </div>
  );
}
