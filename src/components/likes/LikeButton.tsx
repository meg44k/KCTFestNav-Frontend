"use client";

import { Check } from "lucide-react";
import { voteState } from "@/lib/likes";
import { cn } from "@/lib/utils";
import { useLikes } from "./LikesProvider";

const LABEL = {
  none: "投票する",
  mine: "投票済み",
  other: "ここに入れ直す",
} as const;

/**
 * クラス展示への投票(1 人 1 票)。入れている展示ではもう一度押すと取り消し、
 * ほかの展示に入れているときは押すとこちらへ移る。数は出さない。
 * アイコンだけでは何のボタンか伝わらないので、いつも文字で出す。見た目はナビ(コンパス)のボタンにそろえる
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
      aria-label={on ? "投票済み(押すと取り消す)" : LABEL[state]}
      onClick={() => likes.toggle(boothId)}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-black px-3 font-bold text-xs transition-transform active:scale-90",
        on ? "bg-black text-white" : "bg-white text-black",
        className,
      )}
    >
      {on && <Check size={14} strokeWidth={3} aria-hidden />}
      {LABEL[state]}
    </button>
  );
}
