import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import { sortBooths, sortForMonitor } from "./ops";

const booth = (id: number, updated: string | null) =>
  ({ id, congestion_updated_at: updated }) as BoothResponse;

describe("sortForMonitor", () => {
  it("未更新が先頭、次に古い順", () => {
    const sorted = sortForMonitor([
      booth(1, "2026-10-31T03:30:00Z"),
      booth(2, null),
      booth(3, "2026-10-31T03:00:00Z"),
      booth(4, null),
    ]);
    expect(sorted.map((b) => b.id)).toEqual([2, 4, 3, 1]);
  });

  it("元の配列は変えない", () => {
    const list = [booth(1, "2026-10-31T03:30:00Z"), booth(2, null)];
    sortForMonitor(list);
    expect(list.map((b) => b.id)).toEqual([1, 2]);
  });
});

describe("sortBooths", () => {
  const b = (
    id: number,
    organizer: string,
    status: number,
    updated: string | null,
  ) =>
    ({
      id,
      organizer,
      congestion_status: status,
      congestion_updated_at: updated,
    }) as BoothResponse;
  const list = [
    b(3, "1-10", 0, "2026-10-31T03:00:00Z"),
    b(1, "2-1", 2, "2026-10-31T03:30:00Z"),
    b(2, "1-2", 1, null),
    b(4, "天文部", 2, "2026-10-31T02:00:00Z"),
  ];
  const ids = (s: Parameters<typeof sortBooths>[1]) =>
    sortBooths(list, s).map((x) => x.id);

  it("登録順は ID 順", () => {
    expect(ids("booth")).toEqual([1, 2, 3, 4]);
  });

  it("主催者順は数字を数として比べる(1-2 が 1-10 より前)", () => {
    expect(ids("organizer")).toEqual([2, 3, 1, 4]);
  });

  it("更新が古い順は未更新が先頭", () => {
    expect(ids("stale")).toEqual([2, 4, 3, 1]);
  });

  it("混んでいる順、同じなら更新が古い方が先", () => {
    expect(ids("crowded")).toEqual([4, 1, 2, 3]);
  });

  it("元の配列は変えない", () => {
    sortBooths(list, "booth");
    expect(list.map((x) => x.id)).toEqual([3, 1, 2, 4]);
  });
});
