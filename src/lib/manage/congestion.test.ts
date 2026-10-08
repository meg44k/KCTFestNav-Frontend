import { describe, expect, it } from "vitest";
import {
  CONGESTION_LEVELS,
  levelLabel,
  STALE_MINUTES,
  serverClockNow,
  updatedAgo,
} from "./congestion";

const now = new Date("2026-10-31T12:00:00+09:00");
const ago = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

describe("updatedAgo", () => {
  it("準備中(3)のブースは、未更新や古くても更新を促さない", () => {
    expect(updatedAgo(null, now, 3).stale).toBe(false);
    expect(updatedAgo("2026-10-31T01:00:00Z", now, 3).stale).toBe(false);
    expect(updatedAgo(null, now, 0).stale).toBe(true);
  });

  it("未更新は更新を促す", () => {
    expect(updatedAgo(null, now)).toEqual({
      label: "まだ更新されていません",
      stale: true,
    });
    expect(updatedAgo(undefined, now).stale).toBe(true);
  });

  it("1 分未満は「たった今」", () => {
    expect(updatedAgo(ago(0.5), now)).toEqual({
      label: "たった今",
      stale: false,
    });
  });

  it("未来の時刻(端末の時計ずれ)も「たった今」", () => {
    expect(updatedAgo(ago(-5), now).label).toBe("たった今");
  });

  it("分と時間で表す", () => {
    expect(updatedAgo(ago(12), now).label).toBe("12分前");
    expect(updatedAgo(ago(65), now).label).toBe("1時間5分前");
  });

  it(`${STALE_MINUTES} 分以上で古いとみなす`, () => {
    expect(updatedAgo(ago(STALE_MINUTES - 1), now).stale).toBe(false);
    expect(updatedAgo(ago(STALE_MINUTES), now).stale).toBe(true);
  });

  it("読めない値は未更新と同じ扱い", () => {
    expect(updatedAgo("not a date", now)).toEqual({
      label: "まだ更新されていません",
      stale: true,
    });
  });
});

describe("CONGESTION_LEVELS", () => {
  it("来場者画面と同じ 4 段階。ボタンは開場の流れの順(準備中 → 空き → 少し混雑 → 混雑)", () => {
    expect(CONGESTION_LEVELS.map((l) => l.value)).toEqual([3, 0, 1, 2]);
    expect(CONGESTION_LEVELS[0]).toMatchObject({
      label: "準備中",
      color: "#9CA3AF",
    });
  });
});

describe("levelLabel", () => {
  it("管理画面のボタンも、バザーの空きは「すぐ買える」", () => {
    expect(levelLabel(0, "1-1")).toBe("すぐ入れる");
    expect(levelLabel(0, "軽音部")).toBe("すぐ買える");
    expect(levelLabel(3, "軽音部")).toBe("準備中");
  });
});

describe("serverClockNow", () => {
  it("端末の時計ではなく、サーバーの時刻から経過時間だけ進める", () => {
    const serverNow = Date.parse("2026-10-31T12:00:00+09:00");
    // 画面を開いてから 5 分たった
    expect(
      serverClockNow(serverNow, 1_000, 1_000 + 5 * 60_000).toISOString(),
    ).toBe(new Date(serverNow + 5 * 60_000).toISOString());
  });
});
