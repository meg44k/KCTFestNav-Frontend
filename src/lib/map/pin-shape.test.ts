import { describe, expect, it } from "vitest";
import { pinShape } from "./pin-shape";

describe("pinShape(しずく形のピン)", () => {
  const s = pinShape(10, 25, 4);

  it("先が場所の点(0,0)にあり、頭の丸はその真上", () => {
    expect(s.d.startsWith("M0,0")).toBe(true);
    expect(s.head).toEqual({ x: 0, y: -25 });
  });

  it("先から引いた線は頭の丸にぴったり接する(角ばらない)", () => {
    const [x, y] = s.tangent;
    // 丸の上にある
    expect(Math.hypot(x, y + 25)).toBeCloseTo(10);
    // 先 → 接点 と 中心 → 接点 が直角
    expect(x * x + (y + 25) * y).toBeCloseTo(0);
  });

  it("頭の真ん中に穴をあける(外側と穴の 2 つの輪郭)", () => {
    expect(s.d.match(/M/g)).toHaveLength(2);
  });
});
