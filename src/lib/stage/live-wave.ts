/**
 * LIVE の帯の枠を回るギザギザの波形の計算。描画(canvas)とは分けて、ここは数だけを扱う。
 * 枠は角の丸い長方形。上の辺の左端(x = r)から時計回りに、周りの長さ s で位置を表す
 */

export type Box = { w: number; h: number; r: number };
export type PerimeterPoint = { x: number; y: number; nx: number; ny: number };

export function perimeterLength({ w, h, r }: Box): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/** 周りの長さ s の位置と、外向きの向き(nx, ny) */
export function pointOnRoundedRect(box: Box, s: number): PerimeterPoint {
  const { w, h, r } = box;
  const p = perimeterLength(box);
  let d = ((s % p) + p) % p;
  const top = w - 2 * r;
  const side = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  // 角の円弧: 中心 (cx, cy)、start の角度から時計回りに a だけ進む
  const corner = (cx: number, cy: number, start: number, a: number) => {
    const t = start + a / r;
    return {
      x: cx + r * Math.cos(t),
      y: cy + r * Math.sin(t),
      nx: Math.cos(t),
      ny: Math.sin(t),
    };
  };
  if (d < top) return { x: r + d, y: 0, nx: 0, ny: -1 };
  d -= top;
  if (d < arc) return corner(w - r, r, -Math.PI / 2, d);
  d -= arc;
  if (d < side) return { x: w, y: r + d, nx: 1, ny: 0 };
  d -= side;
  if (d < arc) return corner(w - r, h - r, 0, d);
  d -= arc;
  if (d < top) return { x: w - r - d, y: h, nx: 0, ny: 1 };
  d -= top;
  if (d < arc) return corner(r, h - r, Math.PI / 2, d);
  d -= arc;
  if (d < side) return { x: 0, y: h - r - d, nx: -1, ny: 0 };
  d -= side;
  return corner(r, r, Math.PI, d);
}

/**
 * 時間 t(秒)での振幅 0〜1。音量メーターのように、ゆっくりした揺れに速い揺れを重ね、
 * ときどき大きく跳ねる
 */
export function amplitudeAt(t: number): number {
  const slow = 0.5 + 0.22 * Math.sin(1.7 * t) + 0.13 * Math.sin(4.3 * t + 1);
  const spike = 0.35 * Math.max(0, Math.sin(0.9 * t + 0.5)) ** 8;
  return Math.min(1, Math.max(0.12, slow + spike));
}

// 0〜1 の決まった乱数(歯ごとに高さを変える)
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 波形の 1 周期あたりの歯の数(波形全体で) */
const TEETH = 20;

/**
 * 波形の中の位置 u(0〜1)での、枠からの外向きのずれ(amp 倍)。
 * 両端はすぼめて枠になじませ、まん中はギザギザ(三角波)。歯ごとの高さは時間でかわる
 */
export function waveOffset(u: number, t: number, amp: number): number {
  const taper = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 1.5;
  const x = u * TEETH;
  const frac = x - Math.floor(x);
  const tri = 1 - 4 * Math.abs(frac - 0.5);
  const tooth = 0.45 + 0.55 * hash(Math.floor(x) + Math.floor(t * 10) * 31);
  return amp * taper * tri * tooth;
}
