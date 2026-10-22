import { describe, expect, it } from "vitest";
import { type LikesResponse, rangeOf, rankRows, toJstTime } from "./likes";

const res: LikesResponse = {
  booths: [
    {
      booth_id: 3,
      name: "お化け屋敷",
      organizer: "3-2",
      total: 12,
      burst: true,
      buckets: [],
    },
    {
      booth_id: 5,
      name: "迷路",
      organizer: "1-1",
      total: 12,
      burst: false,
      buckets: [],
    },
    {
      booth_id: 7,
      name: "カフェ",
      organizer: "2-3",
      total: 4,
      burst: false,
      buckets: [],
    },
    {
      booth_id: 9,
      name: "展示",
      organizer: "4-1",
      total: 0,
      burst: false,
      buckets: [],
    },
  ],
};

describe("rankRows", () => {
  it("同じ数は同じ順位、次はその分とばす", () => {
    expect(rankRows(res).map((r) => [r.rank, r.boothId])).toEqual([
      [1, 3],
      [1, 5],
      [3, 7],
      [4, 9],
    ]);
  });
});

describe("toJstTime", () => {
  it("UTC の時刻を日本時間の HH:MM にする", () => {
    expect(toJstTime("2026-10-31T01:20:00Z")).toBe("10:20");
    expect(toJstTime("2026-10-31T15:00:00Z")).toBe("00:00");
  });
});

describe("rangeOf", () => {
  const starts = [
    "2026-10-31T01:00:00Z",
    "2026-10-31T01:10:00Z",
    "2026-10-31T01:20:00Z",
  ];
  it("選んだ 2 本の棒の範囲(終わりは最後の棒の 10 分後、未満)", () => {
    expect(rangeOf(starts, 0, 1)).toEqual({
      from: "2026-10-31T01:00:00Z",
      to: "2026-10-31T01:20:00Z",
    });
  });
  it("逆に選んでも同じ、1 本だけなら 10 分", () => {
    expect(rangeOf(starts, 2, 0)).toEqual({
      from: "2026-10-31T01:00:00Z",
      to: "2026-10-31T01:30:00Z",
    });
    expect(rangeOf(starts, 1, 1)).toEqual({
      from: "2026-10-31T01:10:00Z",
      to: "2026-10-31T01:20:00Z",
    });
  });
});
