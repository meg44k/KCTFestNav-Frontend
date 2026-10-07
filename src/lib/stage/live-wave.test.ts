import { describe, expect, it } from "vitest";
import {
  amplitudeAt,
  burstStrength,
  centerOnTopOrBottom,
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
    ).slice(1, -1);
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(0.5);
  });
});

describe("ランダムに出るギザギザの強さ", () => {
  it("出始めと終わりは 0、途中で強くなる", () => {
    expect(burstStrength(0, 1)).toBeCloseTo(0);
    expect(burstStrength(1, 1)).toBeCloseTo(0);
    expect(burstStrength(0.25, 1)).toBeGreaterThan(0.8);
  });

  it("急に立ち上がって、ゆっくり静まる", () => {
    // 出てから 1 割の時点は、終わる 1 割前より強い
    expect(burstStrength(0.1, 1)).toBeGreaterThan(burstStrength(0.9, 1));
  });

  it("時間の外は 0", () => {
    expect(burstStrength(-0.1, 1)).toBe(0);
    expect(burstStrength(1.2, 1)).toBe(0);
  });
});

describe("ギザギザを出す場所(上下の辺だけ)", () => {
  const box = { w: 300, h: 100, r: 5 };
  const len = 40;

  it("前半は上の辺、後半は下の辺のまっすぐな所に、はみ出さずに収まる", () => {
    for (let i = 0; i < 100; i++) {
      const u = i / 100;
      const s = centerOnTopOrBottom(box, u, len);
      for (const d of [-len / 2, 0, len / 2]) {
        const at = pointOnRoundedRect(box, s + d);
        expect(at.nx).toBeCloseTo(0);
        expect(at.ny).toBeCloseTo(u < 0.5 ? -1 : 1);
      }
    }
  });

  it("辺より長いときは辺のまん中に出す", () => {
    const s = centerOnTopOrBottom({ w: 30, h: 100, r: 5 }, 0.2, 40);
    expect(pointOnRoundedRect({ w: 30, h: 100, r: 5 }, s).x).toBeCloseTo(15);
  });
});
