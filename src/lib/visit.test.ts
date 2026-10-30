import { describe, expect, it } from "vitest";
import {
  countsVisit,
  isVisitorId,
  jstDay,
  newVisitorId,
  shouldReport,
} from "./visit";

describe("jstDay(日本時間の日付)", () => {
  it("UTC の夜でも日本時間の日付にする", () => {
    // 10/30 15:30 UTC = 10/31 00:30 JST
    expect(jstDay(new Date("2026-10-30T15:30:00Z"))).toBe("2026-10-31");
    expect(jstDay(new Date("2026-10-30T14:30:00Z"))).toBe("2026-10-30");
  });
});

describe("shouldReport(今日知らせるか)", () => {
  it("まだ一度も知らせていなければ知らせる", () => {
    expect(shouldReport(null, "2026-10-31")).toBe(true);
  });
  it("今日もう知らせていれば知らせない", () => {
    expect(shouldReport("2026-10-31", "2026-10-31")).toBe(false);
  });
  it("前の日に知らせただけなら、今日また知らせる", () => {
    expect(shouldReport("2026-10-30", "2026-10-31")).toBe(true);
  });
});

describe("isVisitorId(番号の形)", () => {
  it("UUID だけ通す", () => {
    expect(isVisitorId("0b7f2c1e-3a4d-4c5e-8f60-7182a3b4c5d6")).toBe(true);
    expect(isVisitorId("abc")).toBe(false);
    expect(isVisitorId("0B7F2C1E-3A4D-4C5E-8F60-7182A3B4C5D6")).toBe(false);
  });
});

describe("countsVisit(数えるページか)", () => {
  it("来場者のページは数える", () => {
    for (const p of ["/", "/main", "/map", "/class-booth", "/credit"])
      expect(countsVisit(p), p).toBe(true);
  });
  it("管理画面とメンテナンス画面は数えない", () => {
    for (const p of ["/manage", "/manage/login", "/maintenance"])
      expect(countsVisit(p), p).toBe(false);
  });
});

describe("newVisitorId(ブラウザの番号を作る)", () => {
  it("randomUUID があればそれを使う", () => {
    const id = newVisitorId({
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
      getRandomValues: (a) => a,
    });
    expect(id).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("randomUUID が無いブラウザ(古い iPhone・https でないページ)でも、同じ形の番号を作る", () => {
    const id = newVisitorId({
      getRandomValues: (a) => a.fill(0xab),
    });
    expect(isVisitorId(id)).toBe(true);
    // UUID v4 の印(13 文字目が 4、17 文字目が 8〜b)
    expect(id[14]).toBe("4");
    expect("89ab").toContain(id[19]);
  });

  it("randomUUID が無いときも、毎回違う番号になる", () => {
    const a = newVisitorId({
      getRandomValues: (x) => crypto.getRandomValues(x),
    });
    const b = newVisitorId({
      getRandomValues: (x) => crypto.getRandomValues(x),
    });
    expect(a).not.toBe(b);
  });
});
