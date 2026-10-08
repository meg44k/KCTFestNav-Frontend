import type { StageSectionResponse } from "@/lib/api/stage";
import {
  blockTimeRange,
  performerMark,
  sectionTimeRange,
} from "@/lib/stage-schedule";
import { PerformerRow } from "./PerformerRow";

function Heading({ section }: { section: StageSectionResponse }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h2 className="font-bold text-xl">{section.name}</h2>
      {section.location && (
        <span className="text-gray-500 text-sm">{section.location}</span>
      )}
      <span className="ml-auto text-gray-500 text-sm">
        {sectionTimeRange(section)}
      </span>
    </div>
  );
}

function Blocks({ section }: { section: StageSectionResponse }) {
  // ブロックが 1 つだけ(Live1 など)なら「ブロック1」の見出しは出さない
  const single = section.blocks.length === 1;
  return (
    <div className="flex flex-col gap-3">
      {section.blocks.map((block, i) => (
        <div key={block.id} className="flex flex-col">
          {!single && (
            <div className="flex items-baseline gap-2 border-black/10 border-b pb-1 text-sm">
              <span className="font-bold">ブロック{i + 1}</span>
              <span className="text-gray-500">{blockTimeRange(block)}</span>
            </div>
          )}
          {block.performers.length === 0 ? (
            <p className="px-2 py-2 text-gray-400 text-sm">
              出演者はまだ決まっていません。
            </p>
          ) : (
            block.performers.map((p, j) => (
              <PerformerRow
                key={p.id}
                performer={p}
                mark={performerMark(block, j)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

/** セクション 1 つ分。終わったセクションは小さくたたみ、タップで開く */
export function StageSectionCard({
  section,
  finished,
}: {
  section: StageSectionResponse;
  finished: boolean;
}) {
  if (finished) {
    return (
      <details className="w-full max-w-md rounded-md bg-white/80 p-3 text-black">
        <summary className="cursor-pointer list-none">
          <div className="flex items-baseline gap-2">
            <span className="font-bold">{section.name}</span>
            <span className="text-gray-500 text-sm">終了しました</span>
            <span className="ml-auto text-gray-500 text-sm">
              {sectionTimeRange(section)}
            </span>
          </div>
        </summary>
        <div className="pt-2">
          <Blocks section={section} />
        </div>
      </details>
    );
  }
  return (
    <section className="flex w-full max-w-md flex-col gap-2 rounded-md bg-white p-3 text-black">
      <Heading section={section} />
      <Blocks section={section} />
    </section>
  );
}
