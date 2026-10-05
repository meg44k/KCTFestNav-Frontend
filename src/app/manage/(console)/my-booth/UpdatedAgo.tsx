"use client";

import { useEffect, useState } from "react";
import { updatedAgo } from "@/lib/manage/congestion";

/**
 * 最終更新からの経過時間。30 秒ごとに表示を更新する。
 * 更新時刻が変わったら作り直してもらう(呼び出し側で key に時刻を渡す)
 */
export function UpdatedAgo({ updatedAt }: { updatedAt?: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { label, stale } = updatedAgo(updatedAt, now);
  return (
    <p className={stale ? "font-bold text-[#e54141]" : "text-gray-400"}>
      最終更新: {label}
      {stale && " — 混雑度を更新してください"}
    </p>
  );
}
