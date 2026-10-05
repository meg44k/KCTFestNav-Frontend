import { describe, expect, it } from "vitest";
import { homePathFor, menuFor } from "./roles";

describe("homePathFor", () => {
  it("ロールごとにログイン後の画面を返す", () => {
    expect(homePathFor("Admin")).toBe("/manage/booths");
    expect(homePathFor("Gakuseikai")).toBe("/manage/ops/congestion");
    expect(homePathFor("Student")).toBe("/manage/my-booth");
  });

  it("Member は管理画面を使えないので null", () => {
    expect(homePathFor("Member")).toBeNull();
  });
});

describe("menuFor", () => {
  it("Admin は全画面", () => {
    expect(menuFor("Admin").map((m) => m.href)).toEqual([
      "/manage/booths",
      "/manage/accounts",
      "/manage/ops/congestion",
      "/manage/ops/lives",
      "/manage/ops/announcement",
    ]);
  });

  it("Gakuseikai は当日運営の 3 つ", () => {
    expect(menuFor("Gakuseikai").map((m) => m.label)).toEqual([
      "混雑度",
      "ライブ",
      "お知らせ",
    ]);
  });

  it("Student と Member にはメニューを出さない", () => {
    expect(menuFor("Student")).toEqual([]);
    expect(menuFor("Member")).toEqual([]);
  });
});
