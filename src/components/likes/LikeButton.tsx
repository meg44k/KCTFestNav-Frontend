"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLikes } from "./LikesProvider";

/** クラス展示のいいね。押すと ♥(赤)、もう一度押すと取り消す。数は出さない */
export function LikeButton({
  boothId,
  className,
}: {
  boothId: number;
  className?: string;
}) {
  const likes = useLikes();
  if (!likes) return null;
  const on = likes.isLiked(boothId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "いいねを取り消す" : "いいね"}
      onClick={() => likes.toggle(boothId)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow active:scale-90 transition-transform",
        className,
      )}
    >
      <Heart
        size={20}
        className={on ? "fill-[#e54141] text-[#e54141]" : "text-black/50"}
      />
    </button>
  );
}
