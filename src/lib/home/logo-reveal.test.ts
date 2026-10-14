import { describe, expect, it } from "vitest";
import {
  headAt,
  LOGO_H,
  LOGO_W,
  logoImageRect,
  REVEAL_END_MS,
  revealLayout,
  SLASH_END,
  SLASH_START,
} from "./logo-reveal";

describe("revealLayout(ロゴを画面のまん中に置く)", () => {
  it("横長の画面では高さで決まり、まん中に置く", () => {
    const { sc, ox, oy } = revealLayout(2000, 600);
    expect(sc).toBeCloseTo((600 * 0.72) / LOGO_H);
    expect(ox).toBeCloseTo((2000 - LOGO_W * sc) / 2);
    expect(oy).toBeCloseTo((600 - LOGO_H * sc) / 2);
  });

  it("縦長のスマホでは幅で決まり、横からはみ出さない", () => {
    const { sc, ox } = revealLayout(390, 844);
    expect(sc).toBeCloseTo((390 * 0.86) / LOGO_W);
    expect(ox).toBeGreaterThan(0);
    expect(ox + LOGO_W * sc).toBeLessThan(390);
  });
});

describe("logoImageRect(最後に重ねるロゴ画像の位置)", () => {
  it("アニメーションの絵と同じ縮尺で、ロゴ画像(992×528)の左上をずらして重ねる", () => {
    const layout = { sc: 0.5, ox: 10, oy: 20 };
    expect(logoImageRect(layout)).toEqual({
      left: 10 + 15 * 0.5,
      top: 20 + 37 * 0.5,
      width: 992 * 0.5,
      height: 528 * 0.5,
    });
  });
});

describe("headAt(斜線をなぞる流れ星の頭)", () => {
  it("走り出す前と、走り終えたあとは無い", () => {
    expect(headAt(0)).toBeNull();
    expect(headAt(REVEAL_END_MS)).toBeNull();
  });

  it("斜線の右上から左下へ向かって進む", () => {
    const points: { x: number; y: number }[] = [];
    for (let t = 2700; t < 3500; t += 100) {
      const h = headAt(t);
      if (h) points.push(h);
    }
    expect(points.length).toBeGreaterThan(3);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeLessThan(points[i - 1].x);
      expect(points[i].y).toBeGreaterThan(points[i - 1].y);
    }
    // 途中で斜線の両端の間を通る
    const mid = points[Math.floor(points.length / 2)];
    expect(mid.x).toBeLessThan(SLASH_START.x);
    expect(mid.x).toBeGreaterThan(SLASH_END.x);
  });
});
