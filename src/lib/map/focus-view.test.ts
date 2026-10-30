import { describe, expect, it } from "vitest";
import { viewShowing } from "./focus-view";

// 画面に見えている範囲(viewBox の単位)。真ん中が (50, 100)、高さ 200
const screen = { cx: 50, cy: 100, h: 200 };

describe("viewShowing(選んだピンが見えるように寄せる)", () => {
  it("ピンを左右の真ん中、上から 35% の所に置く", () => {
    const v = viewShowing({ x: 10, y: 20 }, screen, 3);
    expect(v.k).toBe(3);
    expect(v.tx + v.k * 10).toBeCloseTo(50);
    // 見えている上端は 0。その 35% 下 = 70
    expect(v.ty + v.k * 20).toBeCloseTo(70);
  });

  it("もっと拡大していたら、その拡大のまま寄せる", () => {
    const v = viewShowing({ x: 10, y: 20 }, screen, 3, 5);
    expect(v.k).toBe(5);
    expect(v.tx + v.k * 10).toBeCloseTo(50);
  });
});
