"use client";

import { useState, useTransition } from "react";
import { removeAllLikes, removeLikes } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { type LikeRow, rangeOf, toJstTime } from "@/lib/manage/likes";
import { cn } from "@/lib/utils";

type Pending =
  | { kind: "range"; row: LikeRow; from: string; to: string; count: number }
  | { kind: "all" };

/** クラス展示のいいねの順位。行を開くと 10 分ごとの推移と、時間帯の取り消し */
export function LikesMonitor({
  rows,
  isAdmin,
}: {
  rows: LikeRow[];
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  // 選んだ棒(1 本目と 2 本目)
  const [picked, setPicked] = useState<number[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const toggleRow = (id: number) => {
    setOpenId(openId === id ? null : id);
    setPicked([]);
  };
  const pick = (i: number) =>
    setPicked((cur) => (cur.length >= 2 ? [i] : [...cur, i]));

  const run = () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    startTransition(async () => {
      const res =
        p.kind === "all"
          ? await removeAllLikes()
          : await removeLikes(p.row.boothId, p.from, p.to);
      setMessage(res.error ?? `${res.removed ?? 0} 件のいいねを取り消しました`);
      setPicked([]);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-black/50 text-sm">
        来場者には数は見えません。⚠
        は、10分間のいいねがそのブースのふだんの5倍以上(30件以上)に増えた時間帯があるブースです。
      </p>
      {message && (
        <output className="block rounded-md bg-black/5 px-3 py-2 text-sm">
          {message}
        </output>
      )}

      {rows.length === 0 ? (
        <p className="text-black/50">クラス展示がまだありません。</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 rounded-md border border-black/10">
          {rows.map((row) => {
            const open = openId === row.boothId;
            const max = Math.max(1, ...row.buckets.map((b) => b.count));
            const starts = row.buckets.map((b) => b.start);
            const sel =
              picked.length > 0
                ? rangeOf(starts, picked[0], picked[picked.length - 1])
                : null;
            const lo = Math.min(...picked);
            const hi = Math.max(...picked);
            const selCount = row.buckets
              .slice(lo, hi + 1)
              .reduce((n, b) => n + b.count, 0);
            return (
              <li key={row.boothId}>
                <button
                  type="button"
                  onClick={() => toggleRow(row.boothId)}
                  aria-expanded={open}
                  className="grid w-full cursor-pointer grid-cols-[2.5rem_1fr_auto_1.5rem] items-center gap-2 px-3 py-3 text-left"
                >
                  <span className="text-black/50">{row.rank}位</span>
                  <span className="truncate">
                    {row.name}
                    <span className="ml-2 text-black/50 text-xs">
                      {row.organizer}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{row.total}</span>
                  <span>
                    {row.burst && (
                      <>
                        ⚠<span className="sr-only">急に増えた時間帯あり</span>
                      </>
                    )}
                  </span>
                </button>

                {open && (
                  <div className="flex flex-col gap-3 px-3 pb-4">
                    {row.buckets.length === 0 ? (
                      <p className="text-black/50 text-sm">
                        まだいいねがありません。
                      </p>
                    ) : (
                      <>
                        <p className="text-black/50 text-xs">
                          10分ごとの数。棒を2本押すと、その間の時間帯を選べます。
                        </p>
                        <div className="overflow-x-auto">
                          <div className="flex h-32 min-w-max items-end gap-0.5">
                            {row.buckets.map((b, i) => {
                              const chosen =
                                picked.length > 0 && i >= lo && i <= hi;
                              return (
                                <button
                                  type="button"
                                  key={b.start}
                                  onClick={() => pick(i)}
                                  title={`${toJstTime(b.start)} ${b.count}件`}
                                  aria-label={`${toJstTime(b.start)}から10分 ${b.count}件${b.burst ? " 急に増えた" : ""}`}
                                  aria-pressed={chosen}
                                  className="flex h-full w-3 cursor-pointer items-end"
                                >
                                  <span
                                    className={cn(
                                      "w-full rounded-t-sm",
                                      b.burst ? "bg-[#e54141]" : "bg-amber-400",
                                      chosen && "outline-2 outline-black",
                                    )}
                                    style={{
                                      height: `${Math.max(2, (b.count / max) * 100)}%`,
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between text-black/50 text-xs">
                          <span>{toJstTime(starts[0])}</span>
                          <span>{toJstTime(starts[starts.length - 1])}</span>
                        </div>
                        {sel && (
                          <Button
                            disabled={busy}
                            onClick={() =>
                              setPending({
                                kind: "range",
                                row,
                                from: sel.from,
                                to: sel.to,
                                count: selCount,
                              })
                            }
                            className="h-11 cursor-pointer bg-[#e54141] font-bold text-white hover:bg-[#e54141]/90"
                          >
                            {toJstTime(sel.from)}〜{toJstTime(sel.to)} のいいね(
                            {selCount}件)を取り消す
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setPending({ kind: "all" })}
          className="h-11 cursor-pointer self-start border-[#e54141] bg-transparent text-[#e54141] hover:bg-[#e54141]/10"
        >
          いいねを全部消す
        </Button>
      )}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>
            {pending?.kind === "all"
              ? "いいねを全部消しますか？"
              : "この時間帯のいいねを取り消しますか？"}
          </DialogTitle>
          <DialogDescription render={<div />} className="flex flex-col gap-2">
            {pending?.kind === "range" && (
              <p>
                {pending.row.name}の {toJstTime(pending.from)}〜
                {toJstTime(pending.to)} のいいね {pending.count}
                件を取り消します。
              </p>
            )}
            {pending?.kind === "all" && (
              <p>
                全ブースのいいねを消します。文化祭の前の試しの票を消すときに使ってください。
              </p>
            )}
            <p className="font-bold text-[#e54141]">元には戻せません。</p>
          </DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="h-12 cursor-pointer border-black/20 bg-white text-black hover:bg-black/5"
                />
              }
            >
              やめる
            </DialogClose>
            <Button
              onClick={run}
              className="h-12 cursor-pointer bg-[#e54141] font-bold text-white hover:bg-[#e54141]/90"
            >
              取り消す
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
