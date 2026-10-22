// タイトル画面のロゴが流れ星とともに現れるアニメーションの、形と時間の決まりごと。
// 座標はアニメーション用の絵(1024×600。public/reveal/ の 2 枚)の上の位置、時間はミリ秒

export const LOGO_W = 1024;
export const LOGO_H = 600;

/** キラキラの位置 [x, y, 半径, 星の形の画像の番号(無ければ -1), 弾けたあと消すか] */
export const SPARKS: [number, number, number, number, number?][] = [
  [217, 100, 30, -1],
  [70, 283, 32, 0],
  [400, 228, 16, -1, 1],
  [478, 250, 13, -1],
  [118, 402, 20, -1, 1],
  [338, 382, 22, -1],
  [772, 388, 24, -1],
  [903, 345, 22, -1, 1],
  [190, 545, 15, 1],
];

/** 星の形の画像(stars.png)の中の、星ごとの切り抜き [x, y, 幅, 高さ] */
export const STAR_BOXES: [number, number, number, number][] = [
  [18, 243, 129, 84],
  [173, 470, 86, 92],
];

/** ロゴの斜線の右上の端と左下の端 */
export const SLASH_START = { x: 660, y: 45 };
export const SLASH_END = { x: 162, y: 545 };
const LEN = Math.hypot(
  SLASH_END.x - SLASH_START.x,
  SLASH_END.y - SLASH_START.y,
);
/** 斜線の向き(右上 → 左下、長さ 1) */
export const DIR = {
  x: (SLASH_END.x - SLASH_START.x) / LEN,
  y: (SLASH_END.y - SLASH_START.y) / LEN,
};

// 大きな流れ星が斜線を下り(ORB_DOWN)、手前を回って右上へ戻る(ORB_NEAR)
export const ORB_START = 900;
const ORB_DOWN = 650;
const ORB_NEAR = 1150;
const CAM_F = 1000;
// カメラに近づく深さ。手前で最大 CAM_F / (CAM_F - NEAR_Z) = 10 倍に見える(大きすぎると画面が真っ白になる)
const NEAR_Z = 900;
/** 戻ってきた流れ星が斜線をなぞり始める時刻と、なぞる長さ(時間) */
export const HEAD_START = ORB_START + ORB_DOWN + ORB_NEAR;
const HEAD_DUR = 700;
// 斜線の両端より少し外から走り、少し外まで抜ける
const PRE = 160;
const POST = 300;
export const PATH_LEN = LEN + PRE + POST;
/** 完成の瞬間に光る時刻 */
export const FLASH_MS = 4450;
/** 光が消えて、アニメーションが終わる時刻 */
export const REVEAL_END_MS = FLASH_MS + 700;

const MID = {
  x: (SLASH_START.x + SLASH_END.x) / 2,
  y: (SLASH_START.y + SLASH_END.y) / 2,
};
const ORB_A = Math.hypot(SLASH_START.x - MID.x, SLASH_START.y - MID.y) + PRE;
// 手前の半分のふくらみ
const ORB_B = ORB_A * 0.25;
// 最初に飛び込んでくる所(斜線の右上の端よりずっと外)
const U0 = 2.8;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type OrbitPoint = { x: number; y: number; k: number; th: number };

// 傾いた軌道。奥の半分は斜線そのもの、手前の半分はカメラの近くを通る(k は手前ほど大きく見える倍率)
function orbit(th: number): OrbitPoint {
  const u = Math.cos(th);
  const z = th > Math.PI ? -Math.sin(th) * NEAR_Z : 0;
  const k = CAM_F / (CAM_F - z);
  // 手前を通るまでは斜線の中心へ寄せ、通り過ぎたら少しずつ寄せるのをやめて大きく弧を描いて戻る。
  // 寄せ方を一度に切り替えず続けて変えるので、位置が飛ばない
  const back = clamp01((th - Math.PI * 1.5) / (Math.PI * 0.5));
  const c = k ** (-0.82 * (1 - back * back * (3 - 2 * back)));
  // 手前の半分は斜線から右下へ少しふくらませる(折り返しの瞬間から横へ動き出し、止まって見えない)
  const w = th > Math.PI ? -Math.sin(th) * ORB_B : 0;
  const px = MID.x + (-DIR.x * ORB_A * u + DIR.y * w) * c;
  const py = MID.y + (-DIR.y * ORB_A * u - DIR.x * w) * c;
  return { x: MID.x + (px - MID.x) * k, y: MID.y + (py - MID.y) * k, k, th };
}

/** 時刻 t の大きな流れ星の位置。飛んでいない時は null */
export function orbitAt(t: number): OrbitPoint | null {
  const e = t - ORB_START;
  if (e < 0 || e >= ORB_DOWN + ORB_NEAR) return null;
  if (e < ORB_DOWN) {
    const q = e / ORB_DOWN;
    // 飛び込んで減速するが、左下の端でも止まりきらずに手前へ回り始める
    const left = 1 - q;
    const u = -1 + ((U0 + 1) * left * (1 + 2 * left)) / 3;
    return {
      x: MID.x - DIR.x * ORB_A * u,
      y: MID.y - DIR.y * ORB_A * u,
      k: 1,
      th: Math.PI * q,
    };
  }
  // 回り始めは横にほとんど動かないので、出だしを速くして止まって見えないようにする
  const q = (e - ORB_DOWN) / ORB_NEAR;
  return orbit(Math.PI + Math.PI * (q + 0.8 * q * (1 - q)));
}

/** 時刻 t の、斜線をなぞる流れ星の頭(p は進み具合 0〜1.25)。なぞっていない時は null */
export function headAt(t: number): { x: number; y: number; p: number } | null {
  const p = (t - HEAD_START) / HEAD_DUR;
  if (p < 0 || p > 1.25) return null;
  const s = p * PATH_LEN - PRE;
  return { x: SLASH_START.x + DIR.x * s, y: SLASH_START.y + DIR.y * s, p };
}

/** 文字の 1 点(x, y)が現れる時刻。流れ星の頭が通った所から、斜線から遠いほど少し遅れて出る */
export function pixelRevealTime(x: number, y: number): number {
  const lx = x - SLASH_START.x;
  const ly = y - SLASH_START.y;
  const along = lx * DIR.x + ly * DIR.y;
  const perp = Math.abs(lx * DIR.y - ly * DIR.x);
  return HEAD_START + ((along + PRE) / PATH_LEN) * HEAD_DUR + perp * 2.1;
}

export type RevealLayout = { sc: number; ox: number; oy: number };

/** 幅 w・高さ h の画面のまん中に、ロゴの絵を置く縮尺と左上の位置 */
export function revealLayout(w: number, h: number): RevealLayout {
  const sc = Math.min((w * 0.86) / LOGO_W, (h * 0.72) / LOGO_H);
  return { sc, ox: (w - LOGO_W * sc) / 2, oy: (h - LOGO_H * sc) / 2 };
}

// 入口ページのロゴ画像(992×528)は、アニメーションの絵の (15, 37) から始まる同じ縮尺の絵
const IMAGE_OFFSET = { x: 15, y: 37 };
export const LOGO_IMAGE = { width: 992, height: 528 };

/** 最後にアニメーションと入れ替えるロゴ画像の位置と大きさ */
export function logoImageRect({ sc, ox, oy }: RevealLayout) {
  return {
    left: ox + IMAGE_OFFSET.x * sc,
    top: oy + IMAGE_OFFSET.y * sc,
    width: LOGO_IMAGE.width * sc,
    height: LOGO_IMAGE.height * sc,
  };
}
