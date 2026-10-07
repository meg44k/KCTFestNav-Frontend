import type { BoothResponse } from "@/lib/api/booths";

// 未更新は最も古い扱い
const updatedMs = (b: BoothResponse) =>
  b.congestion_updated_at
    ? new Date(b.congestion_updated_at).getTime()
    : Number.NEGATIVE_INFINITY;

/** 混雑度の監視用。更新が止まっているブースほど上に来る */
export function sortForMonitor(booths: BoothResponse[]): BoothResponse[] {
  return [...booths].sort((a, b) => updatedMs(a) - updatedMs(b) || a.id - b.id);
}

/** 混雑度の画面の並び順 */
export type MonitorSort = "booth" | "organizer" | "stale" | "crowded";

export const MONITOR_SORTS: { value: MonitorSort; label: string }[] = [
  { value: "booth", label: "登録順" },
  { value: "organizer", label: "主催者順" },
  { value: "stale", label: "更新が古い順" },
  { value: "crowded", label: "混んでいる順" },
];

// 1-2 が 1-10 より前に来るよう、数字は数として比べる
const byOrganizer = new Intl.Collator("ja", { numeric: true }).compare;

// 「混んでいる順」の並び。混雑 → 少し混雑 → 空き → 準備中(知らない値は最後)
const CROWD_ORDER: Record<number, number> = { 2: 0, 1: 1, 0: 2, 3: 3 };
const crowdOrder = (status: number) => CROWD_ORDER[status] ?? 4;

export function sortBooths(
  booths: BoothResponse[],
  sort: MonitorSort,
): BoothResponse[] {
  switch (sort) {
    case "organizer":
      return [...booths].sort(
        (a, b) => byOrganizer(a.organizer, b.organizer) || a.id - b.id,
      );
    case "stale":
      return sortForMonitor(booths);
    case "crowded":
      // 混んでいる順。同じ混雑度なら更新が古い方(確かめたい方)を先に
      return [...booths].sort(
        (a, b) =>
          crowdOrder(a.congestion_status) - crowdOrder(b.congestion_status) ||
          updatedMs(a) - updatedMs(b) ||
          a.id - b.id,
      );
    default:
      return [...booths].sort((a, b) => a.id - b.id);
  }
}
