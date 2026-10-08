import { describe, expect, it } from "vitest";
import { homePathFor, menuFor } from "./roles";

describe("homePathFor", () => {
  it("ロールごとにログイン後の画面を返す", () => {
    expect(homePathFor("Admin")).toBe("/manage/booths");
    expect(homePathFor("Gakuseikai")).toBe("/manage/ops/congestion");
    expect(homePathFor("Student")).toBe("/manage/my-booth/congestion");
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

  it("Student は自分のブースの混雑度と説明", () => {
    expect(menuFor("Student")).toEqual([
      { href: "/manage/my-booth/congestion", label: "混雑度" },
      { href: "/manage/my-booth/detail", label: "ブースの説明" },
    ]);
  });

  it("Member にはメニューを出さない", () => {
    expect(menuFor("Member")).toEqual([]);
  });
});
