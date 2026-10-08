import { describe, expect, it } from "vitest";
import type {
  PerformerResponse,
  StageBlockResponse,
  StageSectionResponse,
} from "@/lib/api/stage";
import {
  blockTimeRange,
  nextUp,
  nowPlaying,
  performerMark,
  pickDay,
  sectionFinished,
  sectionsOn,
  sectionTimeRange,
  stageDays,
  stageHeadline,
  startingNow,
  stepOrder,
} from "./stage-schedule";

const performer = (id: number, order = id): PerformerResponse => ({
  id,
  block_id: 0,
  name: `出演者${id}`,
  detail: "",
  thumbnail_url: "",
  perform_order: order,
});

const block = (
  id: number,
  start: string,
  end: string,
  extra: Partial<StageBlockResponse> = {},
): StageBlockResponse => ({
  id,
  section_id: 0,
  start_time: start,
  end_time: end,
  current_order: 0,
  now_playing: false,
  performers: [performer(id * 10 + 1), performer(id * 10 + 2)],
  ...extra,
});

const section = (
  id: number,
  blocks: StageBlockResponse[],
  sortOrder = id,
): StageSectionResponse => ({
  id,
  name: `セクション${id}`,
  location: "",
  sort_order: sortOrder,
  blocks,
});

const ms = (iso: string) => new Date(iso).getTime();

describe("stageDays / pickDay", () => {
  const sections = [
    section(1, [
      block(1, "2026-11-01T12:00:00+09:00", "2026-11-01T12:45:00+09:00"),
      // 日本時間の 23:30 は 10/31。UTC では 14:30 だが同じ日
      block(2, "2026-10-31T23:30:00+09:00", "2026-10-31T23:50:00+09:00"),
    ]),
    // UTC の 10/31 15:30 は日本時間の 11/1 0:30
    section(2, [block(3, "2026-10-31T15:30:00Z", "2026-10-31T16:00:00Z")]),
  ];

  it("日本時間の日付を重ねずに並べる", () => {
    expect(stageDays(sections)).toEqual([
      { key: "2026-10-31", label: "10月31日（土）", short: "10/31(土)" },
      { key: "2026-11-01", label: "11月1日（日）", short: "11/1(日)" },
    ]);
  });

  it("指定 > 今日 > 最初の日 の順で選ぶ", () => {
    const days = stageDays(sections);
    const on31 = ms("2026-10-31T10:00:00+09:00");
    const before = ms("2026-10-20T10:00:00+09:00");
    expect(pickDay(days, "2026-11-01", on31)?.key).toBe("2026-11-01");
    expect(pickDay(days, undefined, ms("2026-11-01T09:00:00+09:00"))?.key).toBe(
      "2026-11-01",
    );
    expect(pickDay(days, undefined, before)?.key).toBe("2026-10-31");
    // 番組に無い日を指定されたら今日(無ければ最初)にする
    expect(pickDay(days, "2026-12-25", before)?.key).toBe("2026-10-31");
    expect(pickDay([], undefined, before)).toBeUndefined();
  });
});

describe("sectionsOn", () => {
  it("その日のブロックだけを開始順に持ち、ブロックの無いセクションは除き、並び順の値 → 最初の開始で並べる", () => {
    const sections = [
      section(1, [
        block(1, "2026-10-31T15:00:00+09:00", "2026-10-31T15:30:00+09:00"),
        block(2, "2026-10-31T14:00:00+09:00", "2026-10-31T14:30:00+09:00"),
        block(3, "2026-11-01T14:00:00+09:00", "2026-11-01T14:30:00+09:00"),
      ]),
      section(
        2,
        [block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:30:00+09:00")],
        1,
      ),
      section(3, [
        block(5, "2026-11-01T13:00:00+09:00", "2026-11-01T13:30:00+09:00"),
      ]),
    ];
    const got = sectionsOn(sections, "2026-10-31");
    expect(got.map((s) => [s.id, s.blocks.map((b) => b.id)])).toEqual([
      [2, [4]],
      [1, [2, 1]],
    ]);
    // 元のデータは書き換えない
    expect(sections[0].blocks).toHaveLength(3);
  });
});

describe("performerMark", () => {
  const b = (current: number, playing: boolean) =>
    block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
      current_order: current,
      now_playing: playing,
      performers: [performer(1), performer(2), performer(3)],
    });
  const marks = (blk: StageBlockResponse) =>
    blk.performers.map((_, i) => performerMark(blk, i));

  it("まだ始まっていなければ印なし", () => {
    expect(marks(b(0, false))).toEqual(["none", "none", "none"]);
  });
  it("前は終わった、今の組は演奏中", () => {
    expect(marks(b(2, true))).toEqual(["done", "playing", "none"]);
  });
  it("時間外なら今の組に演奏中は付けない", () => {
    expect(marks(b(2, false))).toEqual(["done", "none", "none"]);
  });
  it("終了や、出演者が減って数を超えたら全員終わった", () => {
    expect(marks(b(4, false))).toEqual(["done", "done", "done"]);
    expect(marks(b(9, false))).toEqual(["done", "done", "done"]);
  });
  it("出演順の番号が飛んでいても、何組目かで数える", () => {
    const gap = {
      ...b(2, true),
      performers: [performer(1, 1), performer(3, 3)],
    };
    expect(marks(gap)).toEqual(["done", "playing"]);
  });
});

describe("nowPlaying", () => {
  it("演奏中のブロックごとに、今と次の出演者を出す。最後なら次は無い", () => {
    const s1 = section(1, [
      block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 1,
        now_playing: true,
      }),
    ]);
    const s2 = section(2, [
      block(2, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 2,
        now_playing: true,
      }),
      block(3, "2026-10-31T14:00:00+09:00", "2026-10-31T14:50:00+09:00"),
    ]);
    const got = nowPlaying([s1, s2]);
    expect(
      got.map((n) => [n.section.id, n.block.id, n.current.id, n.next?.id]),
    ).toEqual([
      [1, 1, 11, 12],
      [2, 2, 22, undefined],
    ]);
  });

  it("now_playing でも出演者を指していなければ出さない", () => {
    const s = section(1, [
      block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 1,
        now_playing: true,
        performers: [],
      }),
    ]);
    expect(nowPlaying([s])).toEqual([]);
  });
});

describe("nextUp / sectionFinished / 時刻", () => {
  const s1 = section(1, [
    block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
  ]);
  const s2 = section(2, [
    block(2, "2026-10-31T14:00:00+09:00", "2026-10-31T14:40:00+09:00"),
    block(3, "2026-10-31T14:50:00+09:00", "2026-10-31T15:30:00+09:00"),
  ]);

  it("これから始まる中で最も早いブロック", () => {
    const got = nextUp([s1, s2], ms("2026-10-31T13:10:00+09:00"));
    expect([got?.section.id, got?.block.id]).toEqual([2, 2]);
    expect(nextUp([s1, s2], ms("2026-10-31T14:45:00+09:00"))?.block.id).toBe(3);
    expect(nextUp([s1, s2], ms("2026-10-31T15:00:00+09:00"))).toBeUndefined();
  });

  it("全ブロックの終了を過ぎたら終わったセクション", () => {
    expect(sectionFinished(s2, ms("2026-10-31T15:00:00+09:00"))).toBe(false);
    expect(sectionFinished(s2, ms("2026-10-31T15:30:00+09:00"))).toBe(true);
  });

  it("日本時間の時刻で範囲を出す", () => {
    expect(blockTimeRange(s1.blocks[0])).toBe("13:00〜13:50");
    expect(sectionTimeRange(s2)).toBe("14:00〜15:30");
    expect(
      blockTimeRange(block(9, "2026-10-31T04:00:00Z", "2026-10-31T04:30:00Z")),
    ).toBe("13:00〜13:30");
  });
});

describe("stepOrder", () => {
  it("次へは出演者数 + 1 で止まり、戻すは 0 で止まる", () => {
    expect(stepOrder(0, 3, "next")).toBe(1);
    expect(stepOrder(4, 3, "next")).toBe(4);
    expect(stepOrder(0, 3, "prev")).toBe(0);
    expect(stepOrder(2, 3, "prev")).toBe(1);
  });
  it("出演者が減って数を超えていたら、戻すと最後の出演者になる(バックエンドと同じ)", () => {
    expect(stepOrder(4, 1, "prev")).toBe(1);
    expect(stepOrder(9, 0, "prev")).toBe(0);
  });
});

describe("startingNow", () => {
  it("時間になったのにまだ 1 組目を始めていないブロック", () => {
    const now = ms("2026-10-31T13:02:00+09:00");
    const s = section(1, [
      block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
      block(2, "2026-10-31T12:00:00+09:00", "2026-10-31T13:01:00+09:00"),
      block(3, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 1,
      }),
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        performers: [],
      }),
    ]);
    expect(startingNow([s], now).map((x) => x.block.id)).toEqual([1]);
  });
});

describe("sectionFinished(延長)", () => {
  it("終了時刻を過ぎても、演奏中のブロックがあればたたまない", () => {
    const s = section(1, [
      block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 2,
        now_playing: true,
      }),
    ]);
    expect(sectionFinished(s, ms("2026-10-31T14:00:00+09:00"))).toBe(false);
  });
});

describe("stageHeadline(入口ページの帯)", () => {
  const today = section(1, [
    block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
    block(2, "2026-10-31T14:00:00+09:00", "2026-10-31T14:40:00+09:00"),
  ]);
  const tomorrow = section(2, [
    block(3, "2026-11-01T12:00:00+09:00", "2026-11-01T12:45:00+09:00"),
  ]);

  it("演奏中は日付に関係なく出す(当日前に学生会が進めた場合も)", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 1,
        now_playing: true,
      }),
    ]);
    const got = stageHeadline([s], ms("2026-10-07T10:00:00+09:00"));
    expect(got.playing.map((p) => p.current.id)).toEqual([41]);
    expect(got.next).toBeUndefined();
  });

  it("演奏中と、まもなく始まるブロックは両方出す", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 2,
        now_playing: true,
      }),
      block(5, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
    ]);
    const got = stageHeadline([s], ms("2026-10-31T13:10:00+09:00"));
    expect(got.playing.map((p) => p.block.id)).toEqual([4]);
    expect(got.starting.map((x) => x.block.id)).toEqual([5]);
    expect(got.next).toBeUndefined();
  });

  it("どちらも無ければ、今日これから始まるブロックを次として出す", () => {
    const got = stageHeadline(
      [today, tomorrow],
      ms("2026-10-31T13:55:00+09:00"),
    );
    expect(got.playing).toEqual([]);
    expect(got.starting).toEqual([]);
    expect(got.next?.block.id).toBe(2);
  });

  it("今日の予定が終わったら、翌日のブロックは出さない", () => {
    const got = stageHeadline(
      [today, tomorrow],
      ms("2026-10-31T16:00:00+09:00"),
    );
    expect(got).toEqual({ playing: [], starting: [] });
  });

  it("お祭りの日でなければ何も出さない", () => {
    expect(
      stageHeadline([today, tomorrow], ms("2026-10-07T10:00:00+09:00")),
    ).toEqual({ playing: [], starting: [] });
  });

  it("全員終わったブロックは演奏中にしない", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 3,
        now_playing: false,
      }),
    ]);
    expect(stageHeadline([s], ms("2026-10-31T13:40:00+09:00")).playing).toEqual(
      [],
    );
  });
});
