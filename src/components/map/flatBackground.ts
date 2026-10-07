import type { Campus } from "@/lib/map/campus";
import { flattenPhoto, groundTiles, tileUrl } from "@/lib/map/tiles";

const ZOOM = 18;
// 1 枚(256px)を半分の大きさで並べる。細かすぎない方がデフォルメらしく、処理も軽い
const TILE_PX = 128;
const MARGIN_M = 250;
// 端をこの割合だけ透明にして、地図の黒い背景になじませる
const FADE = 0.15;

export type FlatBackground = {
  url: string;
  /** 地図の座標(メートル)での範囲。x0 が西、y1 が北 */
  rect: { x0: number; x1: number; y0: number; y1: number };
};

let cache: Promise<FlatBackground | null> | null = null;

/**
 * 2D の背景を 1 枚の画像にする。地理院の航空写真を、草木は緑・道路は灰色…と種類ごとに
 * 1 色で塗ったデフォルメにする。何度呼んでも読むのは最初の 1 回
 */
export function loadFlatBackground(campus: Campus) {
  if (!cache) {
    cache = build(campus).then((bg) => {
      // 読めなかったときは、次に開いたときにもう一度試す
      if (!bg) cache = null;
      return bg;
    });
  }
  return cache;
}

async function build(campus: Campus): Promise<FlatBackground | null> {
  const g = groundTiles(campus, MARGIN_M, ZOOM);
  const canvas = document.createElement("canvas");
  canvas.width = (g.tx1 - g.tx0 + 1) * TILE_PX;
  canvas.height = (g.ty1 - g.ty0 + 1) * TILE_PX;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const jobs: Promise<boolean>[] = [];
  for (let tx = g.tx0; tx <= g.tx1; tx++) {
    for (let ty = g.ty0; ty <= g.ty1; ty++) {
      jobs.push(
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(
              img,
              (tx - g.tx0) * TILE_PX,
              (ty - g.ty0) * TILE_PX,
              TILE_PX,
              TILE_PX,
            );
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = tileUrl(ZOOM, tx, ty);
        }),
      );
    }
  }
  if (!(await Promise.all(jobs)).some(Boolean)) return null;
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h);
  flattenPhoto(data.data, w, h);
  ctx.putImageData(data, 0, 0);
  // 上下左右の端を透明へ溶かす
  ctx.globalCompositeOperation = "destination-out";
  const fade = (x0: number, y0: number, x1: number, y1: number) => {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, "#000000");
    grad.addColorStop(1, "#00000000");
    return grad;
  };
  const fw = w * FADE;
  const fh = h * FADE;
  ctx.fillStyle = fade(0, 0, fw, 0);
  ctx.fillRect(0, 0, fw, h);
  ctx.fillStyle = fade(w, 0, w - fw, 0);
  ctx.fillRect(w - fw, 0, fw, h);
  ctx.fillStyle = fade(0, 0, 0, fh);
  ctx.fillRect(0, 0, w, fh);
  ctx.fillStyle = fade(0, h, 0, h - fh);
  ctx.fillRect(0, h - fh, w, fh);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  return blob ? { url: URL.createObjectURL(blob), rect: g.rect } : null;
}
