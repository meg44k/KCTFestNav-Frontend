import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";

const place = (location: string) => (location ? `（${location}）` : "");

/** 入口ページのステージの帯。全体を押すとステージイベントへ。出すものが無ければ何も出さない */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  return (
    <Link
      href="/stage-event"
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/30 p-3 active:bg-white/10"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {playing.map(({ section, block, current, next: after }) => (
          <div key={block.id}>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded bg-[#e54141] px-1.5 py-0.5 font-bold text-white">
                演奏中
              </span>
              <span className="truncate text-gray-300">
                {section.name}
                {section.location && `・${section.location}`}
              </span>
            </div>
            <p className="truncate pt-1 font-bold text-lg">{current.name}</p>
            <p className="truncate text-gray-400 text-xs">
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
      <ChevronRight size={20} className="shrink-0 text-gray-400" />
    </Link>
  );
}
