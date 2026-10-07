import type { Campus } from "./campus";

/**
 * 3D の地面に敷く国土地理院の航空写真(地理院タイル「全国最新写真(シームレス)」)。
 * 利用規約により出典「国土地理院」を画面に出す。開いた人のブラウザが必要な枚数だけ読む
 */
export const tileUrl = (z: number, x: number, y: number) =>
  `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/${z}/${x}/${y}.jpg`;

export const TILE_CREDIT = "出典：国土地理院（地理院タイル）";
export const TILE_CREDIT_URL =
  "https://maps.gsi.go.jp/development/ichiran.html";

const tileXY = (lat: number, lon: number, z: number) => {
  const n = 2 ** z;
  return [
    ((lon + 180) / 360) * n,
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
  ];
};
const tileToLonLat = (x: number, y: number, z: number) => {
  const n = 2 ** z;
  return [
    (x / n) * 360 - 180,
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
  ];
};

/**
 * 建物全体 + margin(m) を覆うタイルの番号と、そのタイルを並べた範囲(地図のメートル座標)。
 * rect は x0 が西、x1 が東、y0 が南、y1 が北
 */
export function groundTiles(campus: Campus, marginM: number, z: number) {
  const { minX, maxX, minY, maxY } = campus.bounds;
  const [west, south] = campus.toLonLat(minX - marginM, minY - marginM);
  const [east, north] = campus.toLonLat(maxX + marginM, maxY + marginM);
  const [fx0, fy0] = tileXY(north, west, z);
  const [fx1, fy1] = tileXY(south, east, z);
  const tx0 = Math.floor(fx0);
  const ty0 = Math.floor(fy0);
  const tx1 = Math.floor(fx1);
  const ty1 = Math.floor(fy1);
  const [nwLon, nwLat] = tileToLonLat(tx0, ty0, z);
  const [seLon, seLat] = tileToLonLat(tx1 + 1, ty1 + 1, z);
  const [x0, y1] = campus.toXY(nwLon, nwLat);
  const [x1, y0] = campus.toXY(seLon, seLat);
  return { z, tx0, ty0, tx1, ty1, rect: { x0, x1, y0, y1 } };
}

/** 2D の背景の色。写真を種類ごとに 1 色で塗る(暗めにしてサイトの黒基調に合わせる) */
export const FLAT_COLORS = {
  green: "#2f4a33",
  paved: "#3b4048",
  soil: "#5a4e3c",
  water: "#27405c",
} as const;

type FlatKind = keyof typeof FLAT_COLORS;
const KINDS = Object.keys(FLAT_COLORS) as FlatKind[];
const RGB = KINDS.map((k) =>
  [1, 3, 5].map((i) => Number.parseInt(FLAT_COLORS[k].slice(i, i + 2), 16)),
);

/**
 * 航空写真の 1 画素が何か。地理院の写真は全体に青みがかっているので、
 * 草木は「緑が赤よりはっきり強い」、グラウンドの土は「赤が青より強く明るい」で見分ける
 */
function kindOf(r: number, g: number, b: number): number {
  if (b > g + 30 && b > r + 50 && b > 110) return KINDS.indexOf("water");
  if (g - r >= 9 && g >= b - 15) return KINDS.indexOf("green");
  if (r > b + 20 && r >= g && r + g + b > 330) return KINDS.indexOf("soil");
  return KINDS.indexOf("paved");
}

/**
 * 航空写真(RGBA の並び、幅 w・高さ h)をデフォルメした地面にする。
 * 画素を種類に分け、まわり 3×3 で一番多い種類にならして細かい点を消し、種類ごとに 1 色で塗る
 */
export function flattenPhoto(px: Uint8ClampedArray, w: number, h: number) {
  const kinds = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    kinds[i] = kindOf(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  }
  // まわり 3×3 で一番多い種類にならす(2 回)
  const counts = new Uint16Array(KINDS.length);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        counts.fill(0);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h)
              counts[kinds[ny * w + nx]]++;
          }
        }
        let best = kinds[y * w + x];
        for (let k = 0; k < counts.length; k++) {
          if (counts[k] > counts[best]) best = k;
        }
        next[y * w + x] = best;
      }
    }
    kinds.set(next);
  }
  for (let i = 0; i < w * h; i++) {
    const c = RGB[kinds[i]];
    px[i * 4] = c[0];
    px[i * 4 + 1] = c[1];
    px[i * 4 + 2] = c[2];
  }
}
