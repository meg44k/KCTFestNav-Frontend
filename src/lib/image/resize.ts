// ブラウザだけで動く。写真のまん中を正方形に切り抜いて縮める
import { squareCrop } from "./square";

/** バックエンドが受け付ける大きさ(2MB) */
const MAX_BYTES = 2 * 1024 * 1024;

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 写真のまん中を正方形にして、一辺 1080px まで縮める。
 * WebP で作り、作れないブラウザ(古い Safari など)は JPEG にする。2MB を超えたら画質を下げる
 */
export async function resizeToSquare(file: File): Promise<Blob> {
  // スマホで撮った写真の向き(EXIF)に合わせて読む
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const { sx, sy, size, out } = squareCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("この端末では写真を加工できません");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, out, out);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.5]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("写真が大きすぎます");
}
