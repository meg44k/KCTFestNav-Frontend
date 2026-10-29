import { describe, expect, it } from "vitest";
import { showsPageStars } from "./page-stars";

describe("showsPageStars(画面に固定した背景の星を出すページ)", () => {
  it("来場者の一覧や説明のページには出す", () => {
    for (const p of ["/class-booth", "/bazaar", "/stage-event", "/credit"])
      expect(showsPageStars(p), p).toBe(true);
  });

  it("地図には出さない(地図が画面いっぱいなので)", () => {
    expect(showsPageStars("/map")).toBe(false);
  });

  it("タイトルと入口は自分の星を持っているので出さない", () => {
    expect(showsPageStars("/")).toBe(false);
    expect(showsPageStars("/main")).toBe(false);
  });

  it("管理画面には出さない", () => {
    for (const p of ["/manage", "/manage/login", "/manage/ops/lives"])
      expect(showsPageStars(p), p).toBe(false);
  });
});
