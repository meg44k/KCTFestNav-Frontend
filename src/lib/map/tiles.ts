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
