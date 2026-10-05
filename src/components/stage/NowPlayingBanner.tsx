import type { StageSectionResponse } from "@/lib/api/stage";
import {
  blockTimeRange,
  nextUp,
  nowPlaying,
  startingNow,
} from "@/lib/stage-schedule";

/**
 * 一番上の帯。演奏中のブロックと、時間になったがまだ始まっていないブロックを並べる
 * (会場が 2 つあると両方同時に起こりうる)。どちらも無ければ次に始まるブロックを出す
 */
export function NowPlayingBanner({
  sections,
  nowMs,
}: {
  sections: StageSectionResponse[];
  nowMs: number;
}) {
  const playing = nowPlaying(sections);
  const starting = startingNow(sections, nowMs);
  if (playing.length > 0 || starting.length > 0) {
    return (
      <div className="flex w-full max-w-md flex-col gap-2">
        {playing.map(({ section, block, current, next }) => (
          <div
            key={block.id}
            className="rounded-md border-2 border-[#e54141] bg-black p-3 text-white"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md bg-[#e54141] px-2 py-0.5 font-bold">
                演奏中
              </span>
              <span className="text-gray-300">
                {section.name}
                {section.location && `・${section.location}`}
              </span>
            </div>
            <p className="pt-1 font-bold text-2xl">{current.name}</p>
            <p className="text-gray-300 text-sm">
              {next ? `次: ${next.name}` : "このブロックの最後です"}
            </p>
          </div>
        ))}
        {starting.map(({ section, block }) => (
          <p
            key={block.id}
            className="rounded-md border border-white/30 p-3 text-gray-200"
          >
            まもなく始まります: <b className="text-white">{section.name}</b>
            {section.location && `（${section.location}）`}
          </p>
        ))}
      </div>
    );
  }
  const upcoming = nextUp(sections, nowMs);
  if (!upcoming) return null;
  return (
    <p className="w-full max-w-md rounded-md border border-white/30 p-3 text-gray-200">
      次は{" "}
      <b className="text-white">
        {blockTimeRange(upcoming.block).split("〜")[0]}〜{" "}
        {upcoming.section.name}
      </b>
      {upcoming.section.location && `（${upcoming.section.location}）`}
    </p>
  );
}
