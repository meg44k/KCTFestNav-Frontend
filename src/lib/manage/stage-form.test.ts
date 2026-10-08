import { describe, expect, it } from "vitest";
import {
  parseBlockForm,
  parsePerformerForm,
  parseSectionForm,
  toLocalInput,
} from "./stage-form";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parseSectionForm", () => {
  it("名前・場所・並び順を読む。並び順が空なら 0", () => {
    expect(
      parseSectionForm(
        form({ name: " Live1 ", location: " 第一体育館 ", sortOrder: "2" }),
      ),
    ).toEqual({
      ok: true,
      payload: { name: "Live1", location: "第一体育館", sort_order: 2 },
    });
    expect(parseSectionForm(form({ name: "Live1", sortOrder: "" }))).toEqual({
      ok: true,
      payload: { name: "Live1", location: "", sort_order: 0 },
    });
  });
  it("名前が空、並び順が整数でなければ送らない", () => {
    expect(parseSectionForm(form({ name: "　" }))).toEqual({
      ok: false,
      error: "セクション名を入力してください",
    });
    expect(parseSectionForm(form({ name: "a", sortOrder: "1.5" }))).toEqual({
      ok: false,
      error: "並び順は整数で入力してください",
    });
  });
});

describe("parseBlockForm", () => {
  it("datetime-local を日本時間として +09:00 を付ける", () => {
    expect(
      parseBlockForm(
        form({ startTime: "2026-10-31T13:00", endTime: "2026-10-31T13:50" }),
      ),
    ).toEqual({
      ok: true,
      payload: {
        start_time: "2026-10-31T13:00:00+09:00",
        end_time: "2026-10-31T13:50:00+09:00",
      },
    });
  });
  it("空や、終了が開始以前なら送らない", () => {
    expect(parseBlockForm(form({ startTime: "2026-10-31T13:00" }))).toEqual({
      ok: false,
      error: "開始と終了の時刻を入力してください",
    });
    expect(
      parseBlockForm(
        form({ startTime: "2026-10-31T13:00", endTime: "2026-10-31T13:00" }),
      ),
    ).toEqual({ ok: false, error: "終了時刻は開始時刻より後にしてください" });
  });
});

describe("parsePerformerForm", () => {
  it("名前・紹介・写真の URL を読む", () => {
    expect(
      parsePerformerForm(
        form({
          name: " バンドA ",
          detail: " よろしく ",
          thumbnailUrl: "https://example.com/a.jpg",
        }),
      ),
    ).toEqual({
      ok: true,
      payload: {
        name: "バンドA",
        detail: "よろしく",
        thumbnail_url: "https://example.com/a.jpg",
      },
    });
  });
  it("名前が空、写真が http(s) でなければ送らない", () => {
    expect(parsePerformerForm(form({ name: "" }))).toEqual({
      ok: false,
      error: "出演者名を入力してください",
    });
    expect(
      parsePerformerForm(
        form({ name: "a", thumbnailUrl: "javascript:alert(1)" }),
      ),
    ).toEqual({
      ok: false,
      error: "写真の URL は http:// か https:// で始めてください",
    });
  });
});

describe("toLocalInput", () => {
  it("API の時刻を日本時間の datetime-local の値にする", () => {
    expect(toLocalInput("2026-10-31T04:00:00Z")).toBe("2026-10-31T13:00");
    expect(toLocalInput("2026-10-31T23:30:00+09:00")).toBe("2026-10-31T23:30");
  });
});
