import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import type { LiveResponse } from "@/lib/api/lives";
import {
  parseLiveForm,
  sortBooths,
  sortForMonitor,
  sortLives,
  toLocalInput,
} from "./ops";

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

describe("sortLives", () => {
  it("開始時刻順", () => {
    const live = (id: number, start: string) =>
      ({ id, start_time: start }) as LiveResponse;
    expect(
      sortLives([
        live(1, "2026-10-31T14:00:00+09:00"),
        live(2, "2026-10-31T13:00:00+09:00"),
      ]).map((l) => l.id),
    ).toEqual([2, 1]);
  });
});

const fd = (v: Record<string, string>) => {
  const f = new FormData();
  for (const [k, x] of Object.entries(v)) f.set(k, x);
  return f;
};
const base = {
  name: " 軽音部 ",
  detail: "説明",
  thumbnailUrl: "",
  startTime: "2026-10-31T13:00",
  endTime: "2026-10-31T13:30",
  sessionNumber: "1",
};

describe("parseLiveForm", () => {
  it("日本時間として ISO にし、新規の状態は開演前", () => {
    expect(parseLiveForm(fd(base))).toEqual({
      ok: true,
      payload: {
        name: "軽音部",
        detail: "説明",
        thumbnail_url: "",
        start_time: "2026-10-31T13:00:00+09:00",
        end_time: "2026-10-31T13:30:00+09:00",
        session_number: 1,
        status: 0,
      },
    });
  });

  it("編集では今の状態を保つ", () => {
    const res = parseLiveForm(fd(base), { status: 1 } as LiveResponse);
    expect(res.ok && res.payload.status).toBe(1);
  });

  it("名前は必須", () => {
    expect(parseLiveForm(fd({ ...base, name: " " }))).toEqual({
      ok: false,
      error: "ライブ名を入力してください",
    });
  });

  it("時刻は必須", () => {
    expect(parseLiveForm(fd({ ...base, startTime: "" }))).toEqual({
      ok: false,
      error: "開始と終了の時刻を入力してください",
    });
  });

  it("終了は開始より後", () => {
    expect(parseLiveForm(fd({ ...base, endTime: "2026-10-31T12:00" }))).toEqual(
      {
        ok: false,
        error: "終了時刻は開始時刻より後にしてください",
      },
    );
  });

  it("回数は 1 以上の整数", () => {
    expect(parseLiveForm(fd({ ...base, sessionNumber: "0" }))).toEqual({
      ok: false,
      error: "回数は 1 以上の整数で入力してください",
    });
  });

  it("サムネイル URL は http(s) のみ", () => {
    expect(
      parseLiveForm(fd({ ...base, thumbnailUrl: "javascript:x" })),
    ).toEqual({
      ok: false,
      error: "サムネイル URL は http:// か https:// で始めてください",
    });
  });
});

describe("toLocalInput", () => {
  it("どのタイムゾーン表記でも日本時間の datetime-local にする", () => {
    expect(toLocalInput("2026-10-31T04:00:00Z")).toBe("2026-10-31T13:00");
    expect(toLocalInput("2026-10-31T13:00:00+09:00")).toBe("2026-10-31T13:00");
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
