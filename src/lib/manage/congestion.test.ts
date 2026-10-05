import { describe, expect, it } from "vitest";
import { CONGESTION_LEVELS, STALE_MINUTES, updatedAgo } from "./congestion";

const now = new Date("2026-10-31T12:00:00+09:00");
const ago = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

describe("updatedAgo", () => {
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
  it("来場者画面と同じ 3 段階", () => {
    expect(CONGESTION_LEVELS.map((l) => l.value)).toEqual([0, 1, 2]);
  });
});
