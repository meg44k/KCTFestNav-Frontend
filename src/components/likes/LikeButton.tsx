"use client";

import { Check } from "lucide-react";
import { voteState } from "@/lib/likes";
import { cn } from "@/lib/utils";
import { useLikes } from "./LikesProvider";

const LABEL = {
  none: "イチオシ！",
  mine: "イチオシ済",
  // ほかの展示に入れていても同じ見た目。押すとこちらへ移る
  other: "イチオシ！",
} as const;

// 読み上げでは、押すと何が起きるかまで伝える
const ARIA_LABEL = {
  none: "イチオシにする",
  mine: "イチオシ済み(押すと取り消す)",
  other: "ここをイチオシにし直す",
} as const;

// 「すぐ入れる」のカードと同じ緑
const GREEN = "#00B894";

/**
 * クラス展示への投票(1 人 1 票)。入れている展示ではもう一度押すと取り消し、
 * ほかの展示に入れているときは押すとこちらへ移る。数は出さない。
 * アイコンだけでは何のボタンか伝わらないので、いつも文字で出す。見た目はナビ(コンパス)のボタンにそろえ、
 * 投票済みだけ緑で塗る
 */
export function LikeButton({
  boothId,
  className,
}: {
  boothId: number;
  className?: string;
}) {
  const likes = useLikes();
  if (!likes) return null;
  const state = voteState(likes.voted, boothId);
  const on = state === "mine";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={ARIA_LABEL[state]}
      onClick={() => likes.toggle(boothId)}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-3 font-bold text-xs transition-transform active:scale-90",
        on ? "text-white" : "border-black bg-white text-black",
        className,
      )}
      style={on ? { background: GREEN, borderColor: GREEN } : undefined}
    >
      {on && <Check size={14} strokeWidth={3} aria-hidden />}
      {LABEL[state]}
    </button>
  );
}
