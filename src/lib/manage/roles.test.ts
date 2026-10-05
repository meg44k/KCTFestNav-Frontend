import { describe, expect, it } from "vitest";
import { homePathFor, menuFor } from "./roles";

describe("homePathFor", () => {
  it("ロールごとにログイン後の画面を返す", () => {
    expect(homePathFor("Admin")).toBe("/manage/booths");
    expect(homePathFor("Gakuseikai")).toBe("/manage/ops");
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
      "/manage/ops",
    ]);
  });

  it("Gakuseikai は当日運営だけ", () => {
    expect(menuFor("Gakuseikai").map((m) => m.href)).toEqual(["/manage/ops"]);
  });

  it("Student と Member にはメニューを出さない", () => {
    expect(menuFor("Student")).toEqual([]);
    expect(menuFor("Member")).toEqual([]);
  });
});
