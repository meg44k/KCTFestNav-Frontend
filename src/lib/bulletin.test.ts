import { describe, expect, it } from "vitest";
import { showsBulletin } from "./bulletin";

describe("showsBulletin(お知らせの帯を出すページ)", () => {
  it("来場者のページには出す", () => {
    for (const p of [
      "/main",
      "/class-booth",
      "/bazaar",
      "/stage-event",
      "/map",
      "/credit",
    ])
      expect(showsBulletin(p), p).toBe(true);
  });

  it("タイトル画面と管理画面には出さない", () => {
    for (const p of ["/", "/manage", "/manage/login", "/manage/ops/likes"])
      expect(showsBulletin(p), p).toBe(false);
  });
});
