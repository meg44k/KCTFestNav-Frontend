import { describe, expect, it } from "vitest";
import { makeStars } from "./stars";

describe("makeStars(背景の星)", () => {
  it("同じ種なら毎回同じ並び(サーバーとブラウザで食い違わない)", () => {
    expect(makeStars(60, 7)).toEqual(makeStars(60, 7));
    expect(makeStars(60, 7)).not.toEqual(makeStars(60, 8));
  });

  it("数のとおり、画面の中(0〜100%)に、大きさと明るさにばらつきを持たせる", () => {
    const stars = makeStars(200, 1);
    expect(stars).toHaveLength(200);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(100);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThan(100);
      expect(s.r).toBeGreaterThanOrEqual(0.4);
      expect(s.r).toBeLessThanOrEqual(1.6);
      expect(s.opacity).toBeGreaterThanOrEqual(0.25);
      expect(s.opacity).toBeLessThanOrEqual(0.95);
    }
    // 小さい星が多く、大きい星は少ない
    const big = stars.filter((s) => s.r > 1.2).length;
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThan(stars.length / 4);
  });
});
