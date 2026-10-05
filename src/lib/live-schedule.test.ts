import { describe, expect, it } from "vitest";
import type { LiveResponse } from "@/lib/api/lives";
import {
  announcementOrDefault,
  groupLivesByDay,
  toBandBar,
} from "./live-schedule";

const live = (id: number, start: string, end: string, status = 0) =>
  ({
    id,
    name: `ライブ${id}`,
    detail: "説明",
    thumbnail_url: "",
    start_time: start,
    end_time: end,
    session_number: 1,
    status,
  }) as LiveResponse;

describe("groupLivesByDay", () => {
  it("日本時間の日付ごとに分け、日付順・開始時刻順に並べる", () => {
    const groups = groupLivesByDay([
      live(1, "2026-11-01T10:00:00+09:00", "2026-11-01T10:30:00+09:00"),
      live(2, "2026-10-31T14:00:00+09:00", "2026-10-31T14:30:00+09:00"),
      live(3, "2026-10-31T13:00:00+09:00", "2026-10-31T13:30:00+09:00"),
    ]);
    expect(groups.map((g) => [g.label, g.lives.map((l) => l.id)])).toEqual([
      ["10月31日（土）", [3, 2]],
      ["11月1日（日）", [1]],
    ]);
  });

  it("UTC で返ってきても日本時間の日付で分ける(深夜 0 時台)", () => {
    const groups = groupLivesByDay([
      live(1, "2026-10-31T15:30:00Z", "2026-10-31T16:00:00Z"),
    ]);
    expect(groups[0].label).toBe("11月1日（日）");
  });

  it("0 件なら空", () => {
    expect(groupLivesByDay([])).toEqual([]);
  });
});

describe("toBandBar", () => {
  it("時刻を日本時間の HH:mm にし、状態を画面の値にする", () => {
    expect(
      toBandBar(live(1, "2026-10-31T04:00:00Z", "2026-10-31T04:30:00Z", 1)),
    ).toEqual({
      bandName: "ライブ1",
      startTime: "13:00",
      endTime: "13:30",
      thumbnail: "",
      description: "説明",
      state: "ongoing",
    });
  });

  it("開演前・終了・想定外の値", () => {
    const s = (status: number) =>
      toBandBar(live(1, "2026-10-31T04:00:00Z", "2026-10-31T04:30:00Z", status))
        .state;
    expect(s(0)).toBe("upcoming");
    expect(s(2)).toBe("finished");
    expect(s(9)).toBe("upcoming");
  });
});

describe("announcementOrDefault", () => {
  it("空や取得失敗のときは既定の文", () => {
    expect(announcementOrDefault("13時からライブ")).toBe("13時からライブ");
    expect(announcementOrDefault("  ")).toBe("2026 高専祭開催中!!");
    expect(announcementOrDefault(undefined)).toBe("2026 高専祭開催中!!");
  });
});
