"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PerformerResponse } from "@/lib/api/stage";
import type { PerformerMark } from "@/lib/stage-schedule";
import { cn } from "@/lib/utils";

/** 出演者の 1 行。タップで紹介文と写真を出す */
export function PerformerRow({
  performer,
  mark,
}: {
  performer: PerformerResponse;
  mark: PerformerMark;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left",
          mark === "playing" && "bg-[#e54141]/10 font-bold",
          mark === "done" && "text-gray-400",
        )}
        aria-label={`${performer.name}の紹介を見る`}
      >
        <span className="w-5 shrink-0 text-center" aria-hidden>
          {mark === "done" ? "✓" : mark === "playing" ? "▶" : ""}
        </span>
        <span className="flex-1">{performer.name}</span>
        {mark === "playing" && (
          <span className="shrink-0 rounded-md bg-[#e54141] px-2 py-0.5 text-white text-xs">
            演奏中
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-3">
        <DialogTitle className="text-2xl">{performer.name}</DialogTitle>
        {/* 写真は無いこともある。外部の画像 URL をそのまま出すため最適化はしない */}
        {performer.thumbnail_url && (
          <div className="relative h-40 w-40">
            <Image
              src={performer.thumbnail_url}
              alt={performer.name}
              fill
              sizes="160px"
              unoptimized
              className="rounded-md object-cover"
            />
          </div>
        )}
        <DialogDescription className="whitespace-pre-wrap text-black">
          {performer.detail || "紹介文はまだありません。"}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
