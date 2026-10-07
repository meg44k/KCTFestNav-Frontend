import { describe, expect, it } from "vitest";
import {
  amplitudeAt,
  envelope,
  perimeterLength,
  pointOnRoundedRect,
  TEETH,
  waveOffset,
} from "./live-wave";

const box = { w: 200, h: 100, r: 10 };

describe("枠の周りの位置", () => {
  it("周りの長さ = 直線 + 角の円弧", () => {
    expect(perimeterLength(box)).toBeCloseTo(2 * (180 + 80) + 2 * Math.PI * 10);
  });

  it("上の辺のまん中は上向き、右の辺のまん中は右向き", () => {
    const top = pointOnRoundedRect(box, 90);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(0);
    expect([top.nx, top.ny].map((v) => Math.round(v))).toEqual([0, -1]);
    const right = pointOnRoundedRect(box, 180 + (Math.PI * 10) / 2 + 40);
    expect(right.x).toBeCloseTo(200);
    expect(right.y).toBeCloseTo(50);
    expect([right.nx, right.ny].map((v) => Math.round(v))).toEqual([1, 0]);
  });

  it("一周したら最初に戻る(負の値や長さを超えても回り込む)", () => {
    const p = perimeterLength(box);
    const a = pointOnRoundedRect(box, 30);
    const b = pointOnRoundedRect(box, 30 + p);
    const c = pointOnRoundedRect(box, 30 - p);
    expect(b.x).toBeCloseTo(a.x);
    expect(c.y).toBeCloseTo(a.y);
  });
});

describe("波形", () => {
  it("振幅は時間で変わり、0 にも負にもならず上限を超えない", () => {
    const samples = Array.from({ length: 400 }, (_, i) =>
      amplitudeAt(i * 0.05),
    );
    expect(Math.min(...samples)).toBeGreaterThan(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.4);
  });

  it("波形の両端はすぼまって枠になじむ", () => {
    expect(waveOffset(0, 0, 1)).toBeCloseTo(0);
    expect(waveOffset(1, 0, 1)).toBeCloseTo(0);
  });

  it("まん中はギザギザ(隣どうしで向きが入れ替わる)", () => {
    const step = 1 / (TEETH * 2);
    const vals = Array.from({ length: 6 }, (_, i) =>
      waveOffset(0.4 + i * step, 0, 1),
    );
    const signs = vals.map(Math.sign).filter((s) => s !== 0);
    expect(new Set(signs).size).toBe(2);
  });

  it("まん中だけが膨らまない(端の近くまで同じ強さ)", () => {
    expect(envelope(0.2)).toBeCloseTo(1);
    expect(envelope(0.5)).toBeCloseTo(1);
    expect(envelope(0.8)).toBeCloseTo(1);
    expect(envelope(0.02)).toBeLessThan(0.5);
  });

  it("歯の高さはばらばら(大きい歯と小さい歯がある)", () => {
    const peaks = Array.from({ length: TEETH }, (_, k) =>
      Math.abs(waveOffset((k + 0.5) / TEETH, 0, 1)),
    ).slice(3, -3);
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(0.5);
  });
});
