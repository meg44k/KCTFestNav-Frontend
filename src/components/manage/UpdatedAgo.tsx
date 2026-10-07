"use client";

import { useEffect, useState } from "react";
import { serverClockNow, updatedAgo } from "@/lib/manage/congestion";

/**
 * 最終更新からの経過時間。30 秒ごとに表示を更新する。
 * 時刻はサーバーの時計を基準にする(端末の時計のずれで誤った警告を出さないため。
 * サーバーとブラウザで最初の表示も一致する)。
 * 更新時刻が変わったら作り直してもらう(呼び出し側で key に時刻を渡す)
 */
export function UpdatedAgo({
  updatedAt,
  serverNow,
  status,
  compact = false,
}: {
  updatedAt?: string | null;
  /** 今の混雑度。準備中(3)なら更新を促さない */
  status?: number;
  /** ページを描画したときのサーバーの時刻(ミリ秒) */
  serverNow: number;
  /** 一覧の行など狭い場所用。「N分前」だけを出す */
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    const mountedAt = performance.now();
    const timer = setInterval(
      () => setNow(serverClockNow(serverNow, mountedAt, performance.now())),
      30_000,
    );
    return () => clearInterval(timer);
  }, [serverNow]);

  const { label, stale } = updatedAgo(updatedAt, now, status);
  if (compact) {
    return (
      <span className={stale ? "font-bold text-[#e54141]" : "text-gray-500"}>
        {label}
      </span>
    );
  }
  return (
    <p className={stale ? "font-bold text-[#e54141]" : "text-gray-500"}>
      最終更新: {label}
      {stale && " — 混雑度を更新してください"}
    </p>
  );
}
