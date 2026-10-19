"use client";

import { Check, Vote } from "lucide-react";
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
 * compact は一覧の小さいカード用で、文字の代わりに丸いアイコンだけにする(名前に重ならない大きさ)
 */
export function LikeButton({
  boothId,
  compact = false,
  className,
}: {
  boothId: number;
  compact?: boolean;
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
        "flex h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full font-bold text-xs shadow transition-transform active:scale-90",
        compact ? "w-9" : "px-3",
        on ? "bg-[#e54141] text-white" : "bg-white/90 text-black/70",
        className,
      )}
    >
      {on ? (
        <Check size={compact ? 20 : 16} strokeWidth={3} aria-hidden />
      ) : (
        compact && <Vote size={20} aria-hidden />
      )}
      {!compact && LABEL[state]}
    </button>
  );
}
