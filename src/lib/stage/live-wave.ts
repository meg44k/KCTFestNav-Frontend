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

/** 波形全体の歯の数 */
export const TEETH = 10;

// 両端のすぼまる幅(波形の長さに対する割合)
const EDGE = 0.08;

/**
 * 波形の強さの包み。両端だけ短くすぼめて枠になじませ、それ以外は同じ強さ
 * (まん中だけが膨らんで見えないように)
 */
export function envelope(u: number): number {
  const x = Math.min(1, Math.max(0, Math.min(u, 1 - u) / EDGE));
  return x * x * (3 - 2 * x);
}

/**
 * 波形の中の位置 u(0〜1)での、枠からのずれ(amp 倍、外向きが正)。
 * ギザギザ(三角波)で、歯ごとの高さはばらばら。高さは時間とともに入れ替わる
 */
export function waveOffset(u: number, t: number, amp: number): number {
  const x = u * TEETH;
  const frac = x - Math.floor(x);
  const tri = 1 - 4 * Math.abs(frac - 0.5);
  const tooth = 0.15 + 0.85 * hash(Math.floor(x) + Math.floor(t * 20) * 31);
  return amp * envelope(u) * tri * tooth;
}

// 立ち上がりにかける割合(残りで静まる)
const ATTACK = 0.2;

/**
 * ランダムな場所に出たギザギザの強さ 0〜1。出てからの時間 age(秒)、出ている長さ duration(秒)。
 * 急に立ち上がって、ゆっくり静まる
 */
export function burstStrength(age: number, duration: number): number {
  const x = age / duration;
  if (!(x >= 0 && x <= 1)) return 0;
  if (x < ATTACK) return Math.sin((Math.PI / 2) * (x / ATTACK));
  return ((1 - x) / (1 - ATTACK)) ** 1.5;
}

/**
 * ギザギザのまん中の位置(周りの上の距離)。u(0〜1)の前半は上の辺、後半は下の辺の
 * まっすぐな所に、長さ len がはみ出さないように置く
 */
export function centerOnTopOrBottom(
  { w, h, r }: Box,
  u: number,
  len: number,
): number {
  const edge = w - 2 * r;
  const room = Math.max(edge - len, 0);
  const top = u < 0.5;
  const along =
    edge > len ? len / 2 + room * ((top ? u : u - 0.5) * 2) : edge / 2;
  if (top) return along;
  // 下の辺は右から左へ進む
  return edge + Math.PI * r + (h - 2 * r) + along;
}
