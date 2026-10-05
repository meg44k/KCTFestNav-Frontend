"use client";

import { useOptimistic, useState, useTransition } from "react";
import { stepBlock } from "@/app/actions/stage";
import type { StageBlockResponse, StageSectionResponse } from "@/lib/api/stage";
import {
  blockTimeRange,
  pickDay,
  sectionsOn,
  stageDays,
} from "@/lib/stage-schedule";
import { cn } from "@/lib/utils";

type Row = {
  section: StageSectionResponse;
  block: StageBlockResponse;
  /** セクションの中で何番目のブロックか(1 つだけなら undefined) */
  label?: string;
};

const ms = (iso: string) => new Date(iso).getTime();
const inTime = (b: StageBlockResponse, nowMs: number) =>
  ms(b.start_time) <= nowMs && nowMs < ms(b.end_time);

/**
 * 学生会の「ライブ」画面。ブロックごとに「次のバンドへ」「前に戻す」で演奏中を進める。
 * 時間内のブロックを開いた状態で上に出し、それ以外は閉じて時刻順に並べる
 */
export function StageOps({
  sections,
  serverNow,
}: {
  sections: StageSectionResponse[];
  /** ページを描画したサーバーの時刻(時間内かどうかの基準) */
  serverNow: number;
}) {
  const days = stageDays(sections);
  const [day, setDay] = useState(
    () => pickDay(days, undefined, serverNow)?.key,
  );
  const selected = pickDay(days, day, serverNow);

  if (!selected) {
    return <p className="text-gray-500">番組表が登録されていません。</p>;
  }

  const rows: Row[] = sectionsOn(sections, selected.key).flatMap((section) =>
    section.blocks.map((block, i) => ({
      section,
      block,
      label: section.blocks.length > 1 ? `ブロック${i + 1}` : undefined,
    })),
  );
  rows.sort(
    (a, b) =>
      Number(inTime(b.block, serverNow)) - Number(inTime(a.block, serverNow)) ||
      ms(a.block.start_time) - ms(b.block.start_time),
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto" role="tablist">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={d.key === selected.key}
            onClick={() => setDay(d.key)}
            className={cn(
              "h-10 shrink-0 cursor-pointer rounded-full border px-4 font-bold text-sm",
              d.key === selected.key
                ? "border-black bg-black text-white"
                : "border-black/20 text-gray-600",
            )}
          >
            {d.short}
          </button>
        ))}
      </div>
      {rows.map((row) => (
        <BlockControl
          key={row.block.id}
          row={row}
          live={inTime(row.block, serverNow)}
        />
      ))}
    </section>
  );
}

function BlockControl({ row, live }: { row: Row; live: boolean }) {
  const { section, block, label } = row;
  const [open, setOpen] = useState(live);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  // 押したらすぐ画面を進め、失敗したら元に戻す
  const [current, setCurrent] = useOptimistic(block.current_order);
  const count = block.performers.length;
  const finished = current > count;

  const step = (dir: "next" | "prev") =>
    start(async () => {
      setError(undefined);
      setCurrent((c) =>
        dir === "next" ? Math.min(c + 1, count + 1) : Math.max(c - 1, 0),
      );
      const res = await stepBlock(block.id, dir);
      if (res.error) setError(res.error);
    });

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        live ? "border-[#00B894]" : "border-black/10",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex cursor-pointer flex-wrap items-baseline gap-x-2 text-left"
      >
        <span className="font-bold">{section.name}</span>
        {section.location && (
          <span className="text-gray-500 text-sm">{section.location}</span>
        )}
        {label && <span className="text-sm">{label}</span>}
        <span className="ml-auto text-gray-500 text-sm">
          {blockTimeRange(block)}
          {live && <b className="ml-2 text-[#00B894]">時間内</b>}
        </span>
      </button>

      {open && (
        <>
          {count === 0 ? (
            <p className="text-gray-500 text-sm">
              出演者が登録されていません。
            </p>
          ) : (
            <ol className="flex flex-col">
              {block.performers.map((p, i) => {
                const pos = i + 1;
                const now = pos === current;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5",
                      now && "bg-[#00B894]/15 font-bold",
                      pos < current && "text-gray-400",
                    )}
                  >
                    <span className="w-5 text-center" aria-hidden>
                      {pos < current ? "✓" : now ? "▶" : ""}
                    </span>
                    <span className="flex-1">{p.name}</span>
                    {now && <span className="text-sm">← 今ここ</span>}
                  </li>
                );
              })}
            </ol>
          )}
          {finished && (
            <p className="font-bold text-gray-600">
              このブロックは終了しました
            </p>
          )}
          {!live && (
            <p className="text-gray-500 text-sm">
              時間外なので、来場者には演奏中と表示されません。
            </p>
          )}
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              disabled={pending || current === 0}
              onClick={() => step("prev")}
              className="h-14 cursor-pointer rounded-md border-2 border-black/20 bg-white font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              前に戻す
            </button>
            <button
              type="button"
              disabled={pending || finished || count === 0}
              onClick={() => step("next")}
              className="h-14 cursor-pointer rounded-md bg-[#00B894] font-bold text-black text-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              {current === 0
                ? "1組目を始める ▶"
                : current === count
                  ? "このブロックを終える ▶"
                  : "次のバンドへ ▶"}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-[#e54141] text-sm">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
