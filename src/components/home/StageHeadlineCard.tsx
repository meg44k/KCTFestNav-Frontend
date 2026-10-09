import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";
import { ShootingStars } from "./ShootingStars";

const place = (location: string) => (location ? `（${location}）` : "");

/**
 * 入口ページのステージのカード。全体を押すとステージイベントへ。出すものが無ければ何も出さない。
 * 演奏中は左に黄色の「LIVE!」の帯を付ける(デザインの案)
 */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  const live = playing.length > 0;
  return (
    <Link
      href="/stage-event"
      className="relative flex w-full max-w-md overflow-hidden rounded-xl bg-[#1c1c1c] active:brightness-125"
    >
      {live && (
        <div className="flex w-6 shrink-0 items-center justify-center bg-[#ffb100]">
          <span className="-rotate-90 whitespace-nowrap font-black text-black text-xs tracking-wider">
            LIVE!
          </span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 py-4 pr-2 pl-4">
        {playing.map(({ section, block, current, next: after }) => (
          <div key={block.id} className="min-w-0">
            <p className="truncate text-gray-300 text-sm">
              {section.location || section.name}
            </p>
            <p className="truncate pt-1 font-bold text-3xl text-white">
              {current.name}
            </p>
            <p className="truncate text-gray-400 text-base">
              {after ? `次: ${after.name}` : "このブロックの最後です"}
            </p>
          </div>
        ))}
        {starting.map(({ section, block }) => (
          <p key={block.id} className="text-gray-200 text-sm">
            まもなく始まります: <b className="text-white">{section.name}</b>
            {place(section.location)}
          </p>
        ))}
        {next && (
          <p className="text-gray-200 text-sm">
            次は{" "}
            <b className="text-white">
              {blockTimeRange(next.block).split("〜")[0]}〜 {next.section.name}
            </b>
            {place(next.section.location)}
          </p>
        )}
      </div>
      {live && (
        <ShootingStars className="pointer-events-none absolute top-1 right-12 h-12 w-16 text-[#ffb100]" />
      )}
      {/* 右の「>」は点線で区切る */}
      <div className="flex w-12 shrink-0 items-center justify-center border-white/40 border-l border-dashed">
        <ChevronRight size={24} className="text-white" />
      </div>
    </Link>
  );
}
